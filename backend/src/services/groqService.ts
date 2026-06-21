import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const evaluateStartup = async (stage: string, pitchDeckText: string, financialsText: string) => {
  console.log(`Evaluating startup at stage: ${stage}`);

  // Stage-Aware Prompt Logic
  let stageFocus = '';
  if (stage.toLowerCase() === 'pre-seed' || stage.toLowerCase() === 'preseed') {
    stageFocus = 'Focus heavily on Founder Pedigree, Total Addressable Market (TAM), and early validation signals.';
  } else if (stage.toLowerCase() === 'seed') {
    stageFocus = 'Focus heavily on Monthly Recurring Revenue (MRR), Month-over-Month (MoM) Growth, and Runway.';
  } else if (stage.toLowerCase().includes('series')) {
    stageFocus = 'Focus heavily on Net Retention Rate (NRR), Gross Margin, and LTV:CAC ratio.';
  } else {
    stageFocus = 'Focus on overall business viability, market size, and team execution capabilities.';
  }

  const prompt = `
You are an elite Silicon Valley Venture Capitalist evaluating a startup.
Analyze the following extracted text from the founder's pitch deck and financial spreadsheets.

Startup Stage: ${stage}
${stageFocus}

--- PITCH DECK EXTRACTED TEXT ---
${pitchDeckText ? pitchDeckText : '[No Pitch Deck Provided]'}

--- FINANCIALS EXTRACTED TEXT ---
${financialsText ? financialsText : '[No Financials Provided]'}
--- END DOCUMENTS ---

You are a computerized data engine. You must output a raw, parseable JSON object ONLY. Never include markdown markers, backticks, introductory talk, or trailing text.
Provide your evaluation as a strict JSON object with exactly the following schema:
{
  "overall_score": <number between 0 and 100>,
  "team_score": <number between 0 and 100>,
  "market_score": <number between 0 and 100>,
  "execution_score": <number between 0 and 100>,
  "red_flags": [<array of strings detailing major concerns>],
  "stage_advice": "<string with actionable advice for the founders based on their stage>"
}
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an elite VC evaluator. You only output valid JSON without any markdown code blocks.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    // Strip opening and closing markdown blocks safely
    const sanitizedResponse = content.replace(/```json\n?|\n?```/g, '').trim();
    const evaluation = JSON.parse(sanitizedResponse);
    return evaluation;
  } catch (error: any) {
    console.error('Error during Groq evaluation:', error);
    
    // Pass up specific rate limit or overload errors from Groq SDK
    if (error.status === 429) {
      const err: any = new Error('AI Engine is currently rate-limited. Please try again in a moment.');
      err.status = 429;
      throw err;
    }
    if (error.status === 503) {
      const err: any = new Error('AI Engine is currently overloaded. Please try again later.');
      err.status = 503;
      throw err;
    }

    const err: any = new Error('Failed to evaluate startup via Groq AI.');
    err.status = 500;
    throw err;
  }
};

export const generateAssistText = async (fieldLabel: string, context: any, instruction?: string) => {
  console.log(`Generating AI Assist for field: ${fieldLabel}`);

  const prompt = `
You are an expert startup advisor and copywriter helping a founder fill out their pitch profile.
The founder clicked the "AI Assist" sparkle button for the following field: "${fieldLabel}".

Here is the context they have provided so far:
${JSON.stringify(context, null, 2)}

${instruction ? `CRITICAL INSTRUCTION FOR THIS FIELD: ${instruction}` : `Your task is to generate a concise, professional 1-2 sentence response perfectly suited for the "${fieldLabel}" field.`}

Do not include any introductory text, quotes, or markdown formatting. Output ONLY the raw text that should be pasted into the input field.
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an elite copywriter for startups. You output only the exact raw text requested, without quotes or conversational filler.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7, // Higher temperature for creative copywriting
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response');
    }

    return content.trim();
  } catch (error: any) {
    console.error('Error during Groq AI Assist generation:', error);
    const err: any = new Error('Failed to generate text via Groq AI.');
    err.status = 500;
    throw err;
  }
};

export const analyzeImage = async (base64Image: string, documentType: string) => {
  console.log(`Analyzing image for document type: ${documentType}`);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an elite VC data extraction engine. Analyze this image representing a "${documentType}" document. Extract all key financial metrics, textual data, and summarize charts or graphs if present. Output a highly detailed, raw text summary of the contents.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      model: 'llama-3.2-90b-vision-preview',
      temperature: 0.2,
      max_tokens: 1024,
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq Vision returned empty response');
    }

    return content.trim();
  } catch (error: any) {
    console.error('Error during Groq Vision analysis:', error);
    return `[Warning: Failed to extract data from image (${documentType})]`;
  }
};

export const transcribeAndEvaluatePitch = async (audioFilePath: string) => {
  console.log(`Transcribing audio file: ${audioFilePath}`);
  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-large-v3',
    });

    const transcriptText = transcription.text;
    console.log(`Transcription completed. Length: ${transcriptText.length} characters.`);

    if (!transcriptText || transcriptText.trim().length < 10) {
      throw new Error('Transcription is too short or empty. Please record a longer pitch.');
    }

    const prompt = `
You are an expert pitch coach and elite Venture Capitalist.
Evaluate the following pitch transcript from a startup founder.

--- PITCH TRANSCRIPT ---
${transcriptText}
--- END TRANSCRIPT ---

Analyze the pitch and return ONLY a valid JSON object with the following schema:
{
  "persuasion_score": <number between 0 and 100>,
  "pacing_and_tone": "<string feedback on pacing, enthusiasm, and tone>",
  "hook_strength": "<string feedback on the opening hook within the first few sentences>",
  "clarity_of_ask": "<string feedback on whether the capital ask and use-of-funds are clear>"
}
`;

    console.log('Evaluating transcript with LLM...');
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an elite VC pitch coach. You output valid JSON without markdown.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Groq returned empty response for pitch evaluation');
    }

    const sanitizedResponse = content.replace(/```json\n?|\n?```/g, '').trim();
    const evaluation = JSON.parse(sanitizedResponse);
    
    return {
      transcript: transcriptText,
      evaluation
    };
  } catch (error: any) {
    console.error('Error during Pitch Audio processing:', error);
    throw error;
  }
};
