import dotenv from 'dotenv';
dotenv.config();
import { generateMarketAssumptions } from './src/services/ai/financeAnalyst.js';
import { injectAndExtractFinancials } from './src/services/finance/excelInjector.js';

async function run() {
  try {
    console.log('Generating AI Assumptions...');
    const aiAssumptions = await generateMarketAssumptions(
      'A test B2B SaaS startup with a lot of growth.',
      'SAAS',
      ''
    );
    console.log('AI Assumptions Generated:', aiAssumptions.assumptions);
    if (aiAssumptions.corrections.length > 0) {
      console.log('Guardrail corrections applied:', aiAssumptions.corrections);
    }

    console.log('Injecting Financials...');
    const executionResults = await injectAndExtractFinancials(
      'SAAS',
      aiAssumptions.assumptions,
      'Test Corp'
    );
    console.log('Done:', executionResults.downloadUrl);
  } catch (err: any) {
    console.error('ERROR OCCURRED:', err.message);
    console.error(err.stack);
  }
}

run();
