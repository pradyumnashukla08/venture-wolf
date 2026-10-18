import { GoogleGenAI } from '@google/genai';

async function listModels() {
  try {
    const ai = new GoogleGenAI({
      apiKey: 'AQ.Ab8RN6LF4zOzElyOnzQ4aAr_mNQir4jMGgq5zuDiAji2uKEF-Q',
    });

    console.log("Listing models...");
    const models = await ai.models.list();
    for await (const model of models) {
        console.log(model.name);
    }
  } catch (error) {
    console.error(error);
  }
}

listModels();
