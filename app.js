import { storage } from "./storage.js";
import { generatePlan } from "./api.js";

const screens = document.querySelectorAll(".screen");

function showScreen(id) {
  screens.forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

document.getElementById("startBtn").onclick = () => {
  if (storage.get("apiKey")) showScreen("formScreen");
  else showScreen("apiScreen");
};

document.getElementById("saveKeyBtn").onclick = () => {
  const key = apiKeyInput.value.trim();
  storage.set("apiKey", key);
  showScreen("formScreen");
};

document.getElementById("generateBtn").onclick = async () => {
  const userData = {
    age: age.value,
    height: height.value,
    weight: weight.value,
    goal: goal.value,
    experience: experience.value
  };

  storage.set("userData", userData);

  showScreen("loadingScreen");

  const plan = await generatePlan(storage.get("apiKey"), userData);

  storage.set("plan", plan);
  planContainer.textContent = plan;

  showScreen("planScreen");
};

document.getElementById("regenerateBtn").onclick = async () => {
  showScreen("loadingScreen");
  const plan = await generatePlan(storage.get("apiKey"), storage.get("userData"));
  storage.set("plan", plan);
  planContainer.textContent = plan;
  showScreen("planScreen");
};

document.getElementById("editBtn").onclick = () => {
  showScreen("formScreen");
};