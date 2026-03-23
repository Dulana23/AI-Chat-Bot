// jiat-chatbot.js

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODELS = [
  { id: "stepfun/step-3.5-flash:free", name: "StepFun 3.5 Flash (Free)" },
  { id: "openai/gpt-3.5-turbo", name: "OpenAI GPT-3.5 Turbo" },
  { id: "openai/gpt-4-turbo", name: "OpenAI GPT-4 Turbo" },
  { id: "google/gemini-pro", name: "Google Gemini Pro" }
];
let currentModel = MODELS[0].id;

// DOM Elements
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const apiKeyModal = document.getElementById("api-key-modal");
const apiKeyInput = document.getElementById("api-key-input");
const saveApiKeyBtn = document.getElementById("save-api-key");
const modelSelect = document.getElementById("model-select");
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");

// Helper: Get/Set API Key
function getApiKey() {
  return localStorage.getItem("openrouter_api_key");
}
function setApiKey(key) {
  localStorage.setItem("openrouter_api_key", key);
}

// Show API Key Modal if needed
function checkApiKey() {
  if (!getApiKey()) {
    apiKeyModal.classList.remove("hidden");
  }
}
saveApiKeyBtn.onclick = () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    setApiKey(key);
    apiKeyModal.classList.add("hidden");
  }
};

// Populate model select
function populateModelSelect() {
  modelSelect.innerHTML = "";
  MODELS.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
  });
  modelSelect.value = currentModel;
}
modelSelect?.addEventListener("change", (e) => {
  currentModel = e.target.value;
});

// Render message
function addMessage(role, content, images=[]) {
  const msgDiv = document.createElement("div");
  msgDiv.className = `flex ${role === "user" ? "justify-end" : "justify-start"}`;
  let html = `
    <div class="max-w-xs px-4 py-2 rounded-lg shadow ${role === "user" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"}">
      ${content.replace(/\n/g, "<br>")}
  `;
  if (images && images.length) {
    html += `<div class="flex gap-2 mt-2">`;
    images.forEach(src => {
      html += `<img src="${src}" class="w-16 h-16 object-cover rounded border" />`;
    });
    html += `</div>`;
  }
  html += `</div>`;
  msgDiv.innerHTML = html;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Chat history (for context)
let messages = [
  { role: "system", content: "You are JIAT-Chatbot, a helpful assistant." }
];

// Image handling
let uploadedImages = []; // Array of base64 strings

imageInput.addEventListener("change", (e) => {
  imagePreview.innerHTML = "";
  uploadedImages = [];
  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function(ev) {
      uploadedImages.push(ev.target.result);
      const img = document.createElement("img");
      img.src = ev.target.result;
      img.className = "w-16 h-16 object-cover rounded border";
      imagePreview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// Send message to OpenRouter
async function sendMessage(userMsg, images=[]) {
  addMessage("user", userMsg, images);
  messages.push({ role: "user", content: userMsg });

  // If images, add as "tool" or "image" message if API supports, else just show preview
  // OpenRouter currently does not support image input for all models, so we just show preview

  addMessage("assistant", "<span class='italic text-gray-400'>Thinking...</span>");

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "JIAT-Chatbot"
      },
      body: JSON.stringify({
        model: currentModel,
        messages: messages
      })
    });

    if (!res.ok) throw new Error("API Error");
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response.";
    // Remove "Thinking..." placeholder
    chatMessages.removeChild(chatMessages.lastChild);
    addMessage("assistant", reply);
    messages.push({ role: "assistant", content: reply });
  } catch (e) {
    chatMessages.removeChild(chatMessages.lastChild);
    addMessage("assistant", "Error: " + e.message);
  }
}

// Form submit handler
chatForm.onsubmit = (e) => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  chatInput.value = "";
  sendMessage(msg, uploadedImages);
  uploadedImages = [];
  imagePreview.innerHTML = "";
  imageInput.value = "";
};

// On load
window.onload = () => {
  checkApiKey();
  populateModelSelect();
};