import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import type { MarketAssumptions } from '../../validators/financeSchemas.js';
import { computeScenarioFinancials } from './computeFinancials.js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function injectAndExtractFinancials(
  archetype: 'SAAS' | 'MANUFACTURING' | 'SERVICES',
  aiAssumptions: MarketAssumptions,
  companyName: string
) {
  const templateName = `template_${archetype.toLowerCase()}.xlsx`;
  const templatePath = path.join(process.cwd(), 'assets', 'templates', templateName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Master template path not found: ${templatePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const wsAssumptions = workbook.getWorksheet('ASSUMPTIONS');
  if (!wsAssumptions) throw new Error('Target matrix missing sheet: ASSUMPTIONS');

  // Injecting metrics sequentially matching rows [Worst: Col C, Base: Col D, Best: Col E]
  const scenarios = [
    { name: aiAssumptions.Worst, col: 'C' },
    { name: aiAssumptions.Base, col: 'D' },
    { name: aiAssumptions.Best, col: 'E' }
  ];

  scenarios.forEach(({ name, col }) => {
    // Row 6 is static Corporate Tax Rate (0.25) from our audit, row 7 is DPIIT toggle
    wsAssumptions.getCell(`${col}7`).value = name.dpiitTaxHolidayActive;
    wsAssumptions.getCell(`${col}8`).value = name.interestRateOnDebt;
    wsAssumptions.getCell(`${col}9`).value = name.annualInflationRate;

    // Archetype dynamic blocks
    wsAssumptions.getCell(`${col}11`).value = name.initialMetric;
    wsAssumptions.getCell(`${col}12`).value = name.growthRateOrYield;
    wsAssumptions.getCell(`${col}13`).value = name.pricingMetric;

    // OpEx / Payroll
    wsAssumptions.getCell(`${col}15`).value = name.cogsMargin;
    wsAssumptions.getCell(`${col}16`).value = name.annualPayrollIncrease;
    wsAssumptions.getCell(`${col}17`).value = name.employerPfBurden;
    wsAssumptions.getCell(`${col}18`).value = name.marketingSpendPct;

    // Working Capital
    wsAssumptions.getCell(`${col}20`).value = name.receivableDays;
    wsAssumptions.getCell(`${col}21`).value = name.inventoryDays;
    wsAssumptions.getCell(`${col}22`).value = name.payableDays;
  });

  const wsSummary = workbook.getWorksheet('YEARLY_SUMMARY');
  if (!wsSummary) throw new Error('Target extraction layout missing sheet: YEARLY_SUMMARY');

  // Compute Financials Natively instead of reading broken Excel formulas
  const baseCaseData = computeScenarioFinancials(aiAssumptions.Base, archetype);
  const bestCaseData = computeScenarioFinancials(aiAssumptions.Best, archetype);
  const worstCaseData = computeScenarioFinancials(aiAssumptions.Worst, archetype);

  const injectSummaryBlock = (rowStart: number, computedData: Record<string, number[]>) => {
    const years = ['C', 'D', 'E', 'F', 'G'];
    
    let i = 0;
    for (const [metricKey, dataArray] of Object.entries(computedData)) {
      const metricRow = rowStart + 1 + i;
      i++;
      
      // Inject label and values
      wsSummary.getCell(`B${metricRow}`).value = metricKey;
      if (dataArray && Array.isArray(dataArray)) {
        for (let j = 0; j < years.length; j++) {
          const col = years[j];
          wsSummary.getCell(`${col}${metricRow}`).value = dataArray[j];
        }
      }
    }
  };

  // Hardcode the numbers into the Excel file for the user download
  injectSummaryBlock(5, baseCaseData);
  injectSummaryBlock(22, bestCaseData);
  injectSummaryBlock(39, worstCaseData);

  const extractedDashboard = {
    baseCase: baseCaseData,
    bestCase: bestCaseData,
    worstCase: worstCaseData
  };

  // Buffer conversion and stream pipe output generation to Supabase Bucket Storage
  const buffer = await workbook.xlsx.writeBuffer();
  // Using explicit byte array cast since Supabase JS storage uses ArrayBuffer/Blob in Node
  const fileName = `financial_models/${companyName.replace(/\s+/g, '_')}_Forecast_${Date.now()}.xlsx`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('financial_models')
    .upload(fileName, buffer as unknown as ArrayBuffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      upsert: true
    });

  if (uploadError) throw uploadError;

  // Retrieve public asset download link URL string response
  const { data: urlData } = supabase.storage.from('financial_models').getPublicUrl(fileName);

  return {
    summaryData: extractedDashboard,
    downloadUrl: urlData.publicUrl
  };
}
