import { GoogleGenAI } from '@google/genai';

async function testGemini() {
  try {
    const ai = new GoogleGenAI({
      apiKey: 'AQ.Ab8RN6LF4zOzElyOnzQ4aAr_mNQir4jMGgq5zuDiAji2uKEF-Q',
    });

    console.log("Calling Gemini...");
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: 'Hello, world!',
    });

    console.log("Success:", response.text);
  } catch (error) {
    console.error("FAILED WITH ERROR:");
    console.error(error);
  }
}

testGemini();
