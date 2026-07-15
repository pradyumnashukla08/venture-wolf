import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

const ai = new GoogleGenAI({});

export async function extractDataRoomContext(documentUrls: string[]): Promise<string> {
  if (!documentUrls || documentUrls.length === 0) {
    return 'No additional documents provided.';
  }

  const parts: any[] = [];
  const TRUSTED_DOMAIN = 'supabase.co/storage/v1/object/public/data_room/';
  
  for (const url of documentUrls) {
    try {
      if (!url.includes(TRUSTED_DOMAIN)) {
        throw new Error('Security Alert: Unauthorized document source blocked.');
      }

      // Fetch the file buffer
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      
      // Infer mimeType from headers or fallback
      let mimeType = (response.headers['content-type'] as string) || 'application/pdf';
      if (!mimeType || mimeType.includes('octet-stream')) {
        mimeType = 'application/pdf'; // Fallback for data room documents
      }

      // Convert buffer to Base64
      const base64Data = buffer.toString('base64');
      
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    } catch (error) {
      console.warn(`[DOCUMENT PARSER] Failed to read a document, skipping...`, error);
    }
  }

  if (parts.length === 0) {
    return 'Failed to extract document contents.';
  }

  const prompt = `You are an expert financial auditor. Review these data room documents (Pitch Deck, Cap Table, etc.). Extract and summarize all hard operational metrics, current revenue run-rates, customer acquisition costs, historical margins, and cap table realities. Return a highly condensed, data-dense summary to be used as context for a financial model.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [prompt, ...parts]
    });

    return response.text || 'No insights could be extracted from the documents.';
  } catch (error) {
    console.error('[DOCUMENT PARSER] AI generation failed:', error);
    return 'Error extracting context from documents via AI.';
  }
}
