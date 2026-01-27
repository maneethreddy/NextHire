import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;

export const listGeminiModels = async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const models = await genAI.listModels();
  return (models.models || []).map((model) => ({
    name: model.name,
    methods: model.supportedGenerationMethods
  }));
};
