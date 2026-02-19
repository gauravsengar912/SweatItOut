export async function generatePlan(apiKey, userData) {

  if (!apiKey || !apiKey.startsWith("sk-")) {
    throw new Error("Invalid OpenAI API Key");
  }

  const prompt = `
Create a structured personalized fitness plan.

User:
Age: ${userData.age}
Height: ${userData.height}
Weight: ${userData.weight}
Goal: ${userData.goal}
Experience: ${userData.experience}

Return EXACTLY in this format:

## 4-Day Workout Split
Day 1:
Day 2:
Day 3:
Day 4:

## Indian Diet Plan
Breakfast:
Lunch:
Snack:
Dinner:

## Weekly Progression

## Recovery & Lifestyle Tips
`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an elite fitness coach." },
        { role: "user", content: prompt }
      ],
      temperature: 0.7
    })
  });

  // 🔴 THIS WAS MISSING
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API Error ${response.status}: ${errText}`);
  }

  const data = await response.json();

  if (!data.choices || !data.choices.length) {
    throw new Error("Empty response from OpenAI");
  }

  return data.choices[0].message.content;
}