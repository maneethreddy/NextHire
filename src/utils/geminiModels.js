import { GoogleGenerativeAI } from '@google/generative-ai';

const getApiKey = () => import.meta.env.VITE_GEMINI_API_KEY;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const listGeminiModels = async () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;
  
  for (let attempt = 0; attempt <= 3; attempt++) {
    try {
      const models = await genAI.listModels();
      return (models.models || []).map((model) => ({
        name: model.name,
        methods: model.supportedGenerationMethods
      }));
    } catch (error) {
      lastError = error;
      const errorMessage = error.message || '';
      const isRetryable = errorMessage.includes('429') || errorMessage.includes('503');
      
      if (attempt < 3 && isRetryable) {
        const waitTime = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Model list rate limited. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
      } else {
        break;
      }
    }
  }
  
  throw new Error(`Failed to list Gemini models. ${lastError?.message || ''}`);
};
