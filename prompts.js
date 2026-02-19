export function buildPrompt(data) {
  return `
You are a certified fitness trainer and Indian nutrition expert.

User details:
Age: ${data.age}
Height: ${data.height} cm
Weight: ${data.weight} kg
Goal: ${data.goal}
Experience: ${data.experience}

Create:
1. A 4-day gym workout split (lean muscle focused)
2. Indian diet plan (non-vegetarian, affordable foods)
3. Weekly progression tips
4. Recovery & lifestyle suggestions

Format cleanly with headings.
`;
}