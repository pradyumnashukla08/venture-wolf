import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export const evaluateStartupMultimodal = async (
  stage: string,
  documents: { type: string; mimeType: string; localPath: string }[],
  founderProfileContext?: string
) => {
  console.log(`Evaluating startup with Gemini at stage: ${stage} with ${documents.length} docs`);

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

  const promptText = `
You are an elite Silicon Valley Venture Capitalist evaluating a startup based on the attached documents (Pitch Decks, Financial Models, Images).
Extract the information perfectly, including data from charts, graphs, and tables.

Startup Stage: ${stage}
${stageFocus}

${founderProfileContext ? `\n--- FOUNDER & STARTUP PROFILE CONTEXT ---\n${founderProfileContext}\n\nFactor the founder's background and company details into your evaluation of the team score and execution score.` : ''}

Analyze the attached documents and the profile context thoroughly.
Provide your evaluation as a strict JSON object with exactly the following schema:
{
  "overall_score": <number between 0 and 100>,
  "team_score": <number between 0 and 100>,
  "market_score": <number between 0 and 100>,
  "execution_score": <number between 0 and 100>,
  "product_score": <number between 0 and 100>,
  "traction_score": <number between 0 and 100>,
  "red_flags": [<array of strings detailing major concerns or missing key data>],
  "daily_tasks": [<array of exactly 7 highly specific, actionable daily tasks for the founder to execute over the next week to improve their fundability score based on the red flags. Keep each task under 60 characters.>],
  "stage_advice": "<string with actionable advice for the founders based on their stage>",
  "questions": [
    {
      "question": "<tough interview question>",
      "reason": "<reason why this question is being asked based on risks>"
    }
  ],
  "financial_metrics": { // If exact metrics aren't found, synthesize highly realistic benchmarks based on the startup's stage and industry. Do not return 0s unless absolutely necessary.
    "cash_balance": <number, e.g. 250000000>,
    "monthly_burn": <number, e.g. 5000000>,
    "default_runway": <number representing months>,
    "arr": <number>,
    "mrr": <number>,
    "headcount_cost": <number>
  },
  "gtm_strategy": { // If no GTM strategy is explicitly found in the deck, synthesize a realistic unit economics model and growth channel strategy based on their industry and stage. Generate exactly 3 recommended growth channels.
    "blended_cac": <number>,
    "ltv": <number>,
    "payback_period": <number representing months>,
    "ltv_cac_ratio": <number e.g. 3.5>,
    "channels": [
      {
        "name": "<string channel name e.g. LinkedIn Ads>",
        "status": "<'Scaling' | 'Testing' | 'Saturated'>",
        "cac": <number estimated channel cac>
      }
    ],
    "experiments": [
      {
        "title": "<string experiment title>",
        "description": "<string description of a recommended GTM or product experiment based on their stage. Generate exactly 3 experiments if none are explicitly found in the deck.>",
        "status": "<'Active' | 'Upcoming'>"
      }
    ]
  },
  "financial_forecast": { // If no forecast is explicitly in the deck, you MUST generate a realistic 5-year forecast (in local currency or USD) based on their current stage, industry benchmarks, and reasonable MoM growth. Do NOT return 0s.
    "revenue": {
      "Subscription Revenue": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> },
      "Implementation Revenue": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> }
    },
    "cogs": {
      "Hosting & Infra": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> },
      "Customer Success": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> }
    },
    "opex": {
      "Sales & Marketing": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> },
      "Research & Dev": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> },
      "General & Admin": { "year1": <number>, "year2": <number>, "year3": <number>, "year4": <number>, "year5": <number> }
    }
  },
  "traction_metrics": {
    "waitlist_count": <number e.g. 4250>,
    "beta_users": <number e.g. 510>,
    "nrr": <number e.g. 115 representing 115%>,
    "burn_multiple": <number e.g. 1.4>,
    "historical_revenue_6m": [<array of exactly 6 numbers representing revenue for the last 6 months>]
  }
}
`;

  // Prepare multimodal parts and upload files to Google GenAI File API
  const contents: any[] = [];
  const uploadedFiles = [];
  
  try {
    for (const doc of documents) {
      console.log(`Uploading ${doc.type} to Gemini File API from ${doc.localPath}...`);
      const file = await ai.files.upload({
        file: doc.localPath,
        config: { mimeType: doc.mimeType },
      });
      uploadedFiles.push(file);

      contents.push(`\n--- Document Type: ${doc.type} ---\n`);
      contents.push({
        fileData: {
          fileUri: file.uri,
          mimeType: file.mimeType,
        }
      });
    }

    contents.push(promptText);

    let attempt = 0;
    const maxRetries = 3;
    const baseDelay = 2000;

    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          }
        });

        const contentText = response.text;
        if (!contentText) {
          throw new Error('Gemini returned empty response');
        }

        const sanitizedResponse = contentText.replace(/```json\n?|\n?```/g, '').trim();
        const evaluation = JSON.parse(sanitizedResponse);
        return evaluation;
      } catch (error: any) {
        attempt++;
        console.error(`Error during Gemini evaluation (Attempt ${attempt}):`, error.message || error);
        
        const status = error.status || (error.error && error.error.code);
        const isRetryable = status === 503 || status === 429 || !status;

        if (attempt > maxRetries || !isRetryable) {
          const err: any = new Error('Failed to evaluate startup via Gemini AI.');
          err.status = status || 500;
          throw err;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Waiting ${delay}ms before retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  } finally {
    // Clean up files from Gemini servers
    for (const file of uploadedFiles) {
      try {
        if (file.name) {
          await ai.files.delete({ name: file.name });
          console.log(`Deleted file ${file.name} from Gemini servers.`);
        }
      } catch (e) {
        console.error(`Failed to delete file ${file.name} from Gemini servers:`, e);
      }
    }
  }
};
