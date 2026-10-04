// -----------------------------
// Travel Guide frontend
// -----------------------------

const VOICES = {
  English: { Male: "Matthew", Female: "Josie" },
  Hindi: { Male: "Aman", Female: "Namrita" },
  Tamil: { Male: "Karthikeyan", Female: "Anisha" },
  Telugu: { Male: "Hardik", Female: "Anisha" }
};

const LOCALES = {
  English: "en-US",
  Hindi: "hi-IN",
  Tamil: "ta-IN",
  Telugu: "te-IN"
};

// Change this when the backend is deployed separately.
const API_BASE_URL = window.TRAVEL_GUIDE_API_URL || "http://127.0.0.1:5000";
const GENERATE_AUDIO_GUIDE_API_URL = `${API_BASE_URL}/generate-audio-guide`;

const state = {
  place: "",
  image: "",
  length: "Summary",
  voice: "Male"
};

const cardsContainer = document.querySelector(".cards");
const experiencePanel = document.getElementById("experience");
const previewTitle = document.getElementById("previewTitle");
const audioSection = document.getElementById("audioSection");
const audioPlayer = document.getElementById("audioPlayer");
const transcriptText = document.getElementById("scriptText");
const generateButton = document.getElementById("generateBtn");
const languageSelect = document.getElementById("selectLanguage");
const closeButton = document.getElementById("closeExperience");
const searchPreviewCard = document.getElementById("searchPreviewCard");
const searchPreviewImage = document.getElementById("searchPreviewImage");
const searchPreviewTitle = document.getElementById("searchPreviewTitle");
const transcriptToggle = document.getElementById("transcriptToggle");
const transcriptContent = document.getElementById("transcriptContent");
const transcriptArrow = document.getElementById("transcriptArrow");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchBtn");

const destinationCards = [...document.querySelectorAll(".place-card:not(.search-preview-card)")];

function selectDestination(place, image, clickedCard = null) {
  state.place = place;
  state.image = image;

  previewTitle.textContent = place;
  cardsContainer.classList.add("faded");

  destinationCards.forEach(card => card.classList.remove("active"));
  searchPreviewCard.classList.add("hidden");

  if (clickedCard) {
    clickedCard.classList.add("active");
  } else {
    searchPreviewImage.src = image || "";
    searchPreviewTitle.textContent = place;
    searchPreviewCard.classList.remove("hidden");
    searchPreviewCard.classList.add("active");
  }

  audioSection.classList.add("hidden");
  audioPlayer.pause();
  audioPlayer.removeAttribute("src");
  transcriptText.textContent = "";
  generateButton.textContent = "Generate Audio Guide";
  generateButton.disabled = false;

  experiencePanel.classList.remove("hidden");
  requestAnimationFrame(() => experiencePanel.classList.add("visible"));
}

function deselectDestination() {
  experiencePanel.classList.remove("visible");

  setTimeout(() => {
    experiencePanel.classList.add("hidden");
    cardsContainer.classList.remove("faded");
    searchPreviewCard.classList.add("hidden");
    destinationCards.forEach(card => card.classList.remove("active"));
  }, 300);
}

function searchDestination() {
  const query = searchInput.value.trim().toLowerCase();

  if (!query) {
    destinationCards.forEach(card => {
      card.classList.remove("hidden");
    });
    return;
  }

  const match = destinationCards.find(card => {
    const name = (card.dataset.place || "").toLowerCase();
    return name === query || name.includes(query);
  });

  if (!match) {
    alert("Destination not found in the built-in destinations. Try Taj Mahal, Red Fort, Gateway of India, Hawa Mahal, Golden Temple, or Mysore Palace.");
    return;
  }

  selectDestination(match.dataset.place, match.dataset.image, match);
}

closeButton.addEventListener("click", deselectDestination);

destinationCards.forEach(card => {
  card.addEventListener("click", () => {
    selectDestination(card.dataset.place, card.dataset.image, card);
  });
});

searchButton.addEventListener("click", searchDestination);
searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") searchDestination();
});

const lengthButtons = document.querySelectorAll('[data-group="length"] button');
lengthButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    lengthButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.length = btn.dataset.value;
  });
});

const voiceButtons = document.querySelectorAll('[data-group="voice"] button');
voiceButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    voiceButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    state.voice = btn.dataset.value;
  });
});

generateButton.addEventListener("click", async () => {
  if (!state.place) return;

  generateButton.disabled = true;
  generateButton.textContent = "⏳ Generating Audio...";

  try {
    const selectedLanguage = languageSelect.value;
    const selectedVoice = state.voice;

    const response = await fetch(GENERATE_AUDIO_GUIDE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place: state.place,
        answerType: state.length,
        language: selectedLanguage,
        voiceId: VOICES[selectedLanguage][selectedVoice],
        locale: LOCALES[selectedLanguage]
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `Server error (${response.status})`);
    }

    transcriptText.textContent = data.description || "No transcript returned.";
    audioSection.classList.remove("hidden");

    if (data.audioBase64) {
      audioPlayer.src = `data:audio/mpeg;base64,${data.audioBase64}`;
      audioPlayer.load();
      audioPlayer.classList.remove("hidden");
      generateButton.textContent = "Regenerate Audio Guide";
      generateButton.disabled = false;
    } else {
      audioPlayer.classList.add("hidden");
      generateButton.textContent = "Audio Not Available";
    }
  } catch (error) {
    console.error("Audio guide error:", error);
    alert(`Generation failed: ${error.message}`);
    generateButton.textContent = "Generate Audio Guide";
    generateButton.disabled = false;
  }
});

transcriptToggle.addEventListener("click", () => {
  transcriptContent.classList.toggle("hidden");
  transcriptArrow.classList.toggle("rotate-180");
});
