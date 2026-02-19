document.getElementById("generateBtn").onclick = async () => {
  try {
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

  } catch (err) {
    console.error(err);
    alert("❌ Failed to generate plan:\n" + err.message);
    showScreen("formScreen");
  }
};