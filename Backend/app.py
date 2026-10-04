import os
import base64
from dotenv import load_dotenv
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai

load_dotenv()

app = Flask(__name__)
CORS(app)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MURF_API_KEY = os.getenv("MURF_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

if not GEMINI_API_KEY:
    raise RuntimeError("Missing GEMINI_API_KEY environment variable.")
if not MURF_API_KEY:
    raise RuntimeError("Missing MURF_API_KEY environment variable.")

client = genai.Client(api_key=GEMINI_API_KEY)

PROMPTS = {
    "Summary": """
You are a professional tourist guide.
Provide a high-level overview of "{place}" in {language}.

Focus on:
- Historical significance
- Why the place is famous
- Key architectural or cultural highlights
- One or two useful visitor insights

Keep the explanation concise, engaging, and easy to follow.
Limit the response to around 200 words.
Respond ONLY in {language}.
""",
    "Detailed": """
You are a professional tourist guide.
Provide a detailed and immersive explanation of "{place}" in {language}.

Cover:
- Historical background and timeline
- Architectural design and unique features
- Cultural importance and notable events
- Interesting facts and practical visitor insights

Explain clearly in a storytelling style.
Limit the response to around 400 words.
Respond ONLY in {language}.
"""
}

SUPPORTED = {
    "English": {"locale": "en-US", "voices": {"Male": "Matthew", "Female": "Josie"}},
    "Hindi": {"locale": "hi-IN", "voices": {"Male": "Aman", "Female": "Namrita"}},
    "Tamil": {"locale": "ta-IN", "voices": {"Male": "Karthikeyan", "Female": "Anisha"}},
    "Telugu": {"locale": "te-IN", "voices": {"Male": "Hardik", "Female": "Anisha"}},
}


def generate_description(place, answer_type, language):
    prompt = PROMPTS[answer_type].format(place=place, language=language)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    text = (response.text or "").strip()
    if not text:
        raise RuntimeError("Gemini returned an empty description.")
    return text


def generate_speech(text, voice_id, locale):
    url = "https://global.api.murf.ai/v1/speech/stream"
    headers = {
        "api-key": MURF_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "voiceId": voice_id,
        "text": text,
        "locale": locale,
        "model": "falcon-2",
        "format": "MP3",
        "sampleRate": 24000,
        "channelType": "MONO",
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        stream=True,
        timeout=(15, 120),
    )

    if not response.ok:
        detail = response.text[:500]
        raise RuntimeError(f"Murf API error ({response.status_code}): {detail}")

    audio = bytearray()
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            audio.extend(chunk)

    if not audio:
        raise RuntimeError("Murf returned empty audio.")

    return bytes(audio)


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/generate-audio-guide")
def generate_audio_guide():
    data = request.get_json(silent=True) or {}

    place = str(data.get("place", "")).strip()
    answer_type = data.get("answerType", "Summary")
    language = data.get("language", "English")
    voice_id = str(data.get("voiceId", "")).strip()
    locale = str(data.get("locale", "")).strip()

    if not place:
        return jsonify({"error": "Destination is required."}), 400
    if len(place) > 120:
        return jsonify({"error": "Destination name is too long."}), 400
    if answer_type not in PROMPTS:
        return jsonify({"error": "Invalid guide type."}), 400
    if language not in SUPPORTED:
        return jsonify({"error": "Unsupported language."}), 400

    expected = SUPPORTED[language]
    if not voice_id:
        voice_id = expected["voices"]["Male"]
    if not locale:
        locale = expected["locale"]

    valid_voices = set(expected["voices"].values())
    if voice_id not in valid_voices or locale != expected["locale"]:
        return jsonify({"error": "Invalid voice or locale for the selected language."}), 400

    try:
        description = generate_description(place, answer_type, language)
        audio_bytes = generate_speech(description, voice_id, locale)

        return jsonify({
            "description": description,
            "audioBase64": base64.b64encode(audio_bytes).decode("utf-8"),
        })
    except requests.RequestException as exc:
        app.logger.exception("External API request failed")
        return jsonify({"error": f"Audio service request failed: {exc}"}), 502
    except Exception as exc:
        app.logger.exception("Audio guide generation failed")
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
