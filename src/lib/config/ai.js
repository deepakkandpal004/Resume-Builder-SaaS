import OpenAI from "openai";
const getAI = () => new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1",
    timeout: 25000,
    maxRetries: 0,
});
export default getAI;
