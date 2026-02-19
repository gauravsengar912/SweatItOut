export async function generatePlan(apiKey, userData) {

  const prompt = `
Create a structured personalized fitness plan.

User:
Age: ${userData.age}
Height: ${userData.height}
Weight: ${userData.weight}
Goal: ${userData.goal}
Experience: ${userData.experience}

Return:
1. 4-Day Workout Split (Day-wise structured)
2. Indian Diet Plan (Breakfast, Lunch, Snack, Dinner)
3. Weekly progression
4. Recovery advice

Format clean with headings.
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a professional strength coach." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}