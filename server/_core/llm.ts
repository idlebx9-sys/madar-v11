/**
 * LLM stub — previously called Forge-hosted models.
 * Wire your own provider (OpenAI / Anthropic) here if AI features are needed.
 * Shape matches what routers.ts expects: response.choices[0].message.content
 */
export async function invokeLLM(_opts: {
  messages?: unknown[];
  model?: string;
  response_format?: unknown;
  [key: string]: unknown;
}): Promise<{
  choices: Array<{ message: { content: string } }>;
}> {
  const fallback = JSON.stringify({
    name: "موقعي",
    description: "موقع احترافي وحديث لعرض خدماتك",
    tagline: "جودة عالية وخدمة متميزة",
    primaryColor: "#D4AF37",
    secondaryColor: "#0F5132",
  });
  return {
    choices: [{ message: { content: fallback } }],
  };
}
