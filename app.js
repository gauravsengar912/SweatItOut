import { storage } from "./storage.js";
import { buildPrompt } from "./prompts.js";
import { generatePlan } from "./openai.js";

const apiKeySection = document.getElementById("apiKeySection");
const userForm = document.getElementById("userForm");
const planSection = document.getElementById("planSection");
const planOutput = document.getElementById("planOutput");

// Init
const savedKey = storage.getApiKey();
const savedPlan = storage.getPlan();

if (savedKey) {
  apiKeySection.classList.add("hidden");
  userForm.classList.remove("hidden");
}

if (savedPlan) {
  userForm.classList.add("hidden");
  planSection.classList.remove("hidden");
  planOutput.textContent = savedPlan;
}

// Save API key
document.getElementById("saveApiKey").onclick = () => {
  const key = document.getElementById("apiKeyInput").value;
  storage.saveApiKey(key);
  apiKeySection.classList.add("hidden");
  userForm.classList.remove("hidden");
};

// Generate plan
document.getElementById("generatePlan").onclick = async () => {
  const data = {
    age: age.value,
    height: height.value,
    weight: weight.value,
    goal: goal.value,
    experience: experience.value
  };

  const prompt = buildPrompt(data);
  const plan = await generatePlan(storage.getApiKey(), prompt);

  storage.savePlan(plan);
  planOutput.textContent = plan;

  userForm.classList.add("hidden");
  planSection.classList.remove("hidden");
};

// Edit plan
document.getElementById("editPlan").onclick = () => {
  storage.clearPlan();
  planSection.classList.add("hidden");
  userForm.classList.remove("hidden");
};