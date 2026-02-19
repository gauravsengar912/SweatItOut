export const storage = {
  saveApiKey(key) {
    localStorage.setItem("OPENAI_KEY", key);
  },
  getApiKey() {
    return localStorage.getItem("OPENAI_KEY");
  },
  savePlan(plan) {
    localStorage.setItem("WORKOUT_PLAN", plan);
  },
  getPlan() {
    return localStorage.getItem("WORKOUT_PLAN");
  },
  clearPlan() {
    localStorage.removeItem("WORKOUT_PLAN");
  }
};