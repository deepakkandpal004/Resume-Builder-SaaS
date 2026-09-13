import OpenAI from "openai";

const getAI = () =>
  new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_BASE_URL,
    timeout: 25000,
    maxRetries: 0,
  });

export default getAI;

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
