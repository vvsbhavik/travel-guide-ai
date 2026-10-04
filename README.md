# Travel Guide — Fixed Version

## What this app does
- Shows Indian destinations
- Searches the built-in destinations
- Generates an AI travel description with Gemini
- Converts the description to MP3 with Murf Falcon 2
- Supports English, Hindi, Tamil and Telugu
- Supports Summary/Detailed guides and male/female voice choices

## 1. Backend setup (Windows)

Open a terminal in `Backend`:

```powershell
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Create `.env` from `.env.example` and set:
- `GEMINI_API_KEY`
- `MURF_API_KEY`

PowerShell:

```powershell
$env:GEMINI_API_KEY="YOUR_GEMINI_KEY"
$env:MURF_API_KEY="YOUR_MURF_KEY"
python app.py
```

The API should run at `http://127.0.0.1:5000`.

Test:
`http://127.0.0.1:5000/health`

## 2. Frontend setup

Keep the backend terminal running.

Open a second terminal in `Frontend`:

```powershell
py -m http.server 5500
```

Open:
`http://127.0.0.1:5500`

Do not double-click `index.html`; serve it through HTTP.

## 3. API keys

Do NOT put Gemini or Murf keys inside HTML/JavaScript.
The fixed backend reads them from environment variables.

## 4. Deployment

Deploy the Flask backend first and set the same environment variables on the hosting platform.

Then set the frontend API URL by adding this before `index.js` in `index.html`:

```html
<script>
  window.TRAVEL_GUIDE_API_URL = "https://YOUR-BACKEND-DOMAIN";
</script>
<script src="index.js"></script>
```

If frontend and backend are hosted on different domains, keep CORS enabled or restrict it to your frontend domain.

## Important

Murf's current streaming API uses Falcon 2 (`falcon-2`). The old Gen2 streaming model is deprecated.
