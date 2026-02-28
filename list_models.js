import { GoogleGenerativeAI } from '@google/generative-ai';

// API Key directly from .env (since we can't load .env easily in this quick script without dotenv)
const apiKey = 'AIzaSyCdYWd1ZyN8dJchSBgZKhXusVVIrNLbt-0';

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    try {
        const response = await genAI.listModels();
        console.log('Available Models:');
        response.models.forEach(model => {
            console.log(`- ${model.name} (${model.supportedGenerationMethods.join(', ')})`);
        });
    } catch (error) {
        console.error('Error listing models:', error);
    }
}

listModels();
