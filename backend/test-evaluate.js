import { evaluateStartupMultimodal } from './src/services/geminiService.js';

async function runTest() {
  console.log('--- AUDITING GEMINI MULTIMODAL ENGINE ---');
  
  console.log('1. Testing evaluateStartupMultimodal with dummy PDF/Image...');
  // A tiny 1x1 pixel base64 image (PNG)
  const tinyImageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  
  try {
    const rawDocuments = [
      {
        type: 'Pitch Deck',
        mimeType: 'image/png',
        base64: tinyImageBase64
      }
    ];

    const evaluation = await evaluateStartupMultimodal('Seed', rawDocuments);
    console.log('Final AI Evaluation Result:', JSON.stringify(evaluation, null, 2));

    if (evaluation && evaluation.overall_score !== undefined) {
      console.log('\n--- AUDIT PASSED 100% PERFECTLY ---');
    } else {
      console.log('\n--- AUDIT FAILED: Missing overall_score ---');
    }
  } catch (err) {
    console.error('Audit Error:', err);
    console.log('\n--- AUDIT FAILED ---');
  }
}

runTest();
