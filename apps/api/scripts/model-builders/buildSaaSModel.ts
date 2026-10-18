import ExcelJS from 'exceljs';
import path from 'path';
import {
  applyUniversalStyling,
  build60MonthGrid,
  buildAssumptionDashboard,
  buildYearlySummary,
  styleDataCell,
  numToChar,
  populateCoverSheet,
  populateFundingRequirement,
  populateCapexAndDepreciation,
  populateWorkingCapital,
  populateMonthlyCashFlow,
  populateQuarterlySummary
} from './generatorUtils.js';

export default async function buildSaaSModel(outputDir: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Venture Wolf India';

  // 1. COVER
  const wsCover = wb.addWorksheet('COVER');
  populateCoverSheet(wsCover, 'SaaS & Software');

  // 2. ASSUMPTIONS
  const wsAssumptions = wb.addWorksheet('ASSUMPTIONS');
  buildAssumptionDashboard(wsAssumptions, 'SAAS');

  // 3. FUNDING REQUIREMENT
  const wsFunding = wb.addWorksheet('FUNDING_REQUIREMENT');
  populateFundingRequirement(wsFunding);

  // 4. SUBSCRIBER_FUNNEL
  const wsSubs = wb.addWorksheet('SUBSCRIBER_FUNNEL');
  build60MonthGrid(wsSubs, 'Subscriber Funnel & Growth');
  
  wsSubs.getCell('B5').value = 'Starting Subscribers';
  wsSubs.getCell('B6').value = 'New Subscribers';
  wsSubs.getCell('B7').value = 'Churned Subscribers';
  wsSubs.getCell('B8').value = 'Ending Subscribers';
  wsSubs.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    const prevColStr = numToChar(colIdx - 1);
    
    const momGrowth = `INDEX(ASSUMPTIONS!$C$12:$E$12, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const churnRate = `INDEX(ASSUMPTIONS!$C$13:$E$13, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const startingMRR = `INDEX(ASSUMPTIONS!$C$10:$E$10, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;

    if (m === 1) {
      wsSubs.getCell(`${colStr}5`).value = 0;
      wsSubs.getCell(`${colStr}6`).value = { formula: `${startingMRR} / 2500` }; 
    } else {
      wsSubs.getCell(`${colStr}5`).value = { formula: `${prevColStr}8` };
      wsSubs.getCell(`${colStr}6`).value = { formula: `${prevColStr}6 * (1 + ${momGrowth})` };
    }
    
    wsSubs.getCell(`${colStr}7`).value = { formula: `${colStr}5 * ${churnRate}` };
    wsSubs.getCell(`${colStr}8`).value = { formula: `${colStr}5 + ${colStr}6 - ${colStr}7` };
    
    [5,6,7,8].forEach(r => styleDataCell(wsSubs.getCell(`${colStr}${r}`), '#,##0'));
  }

  // 5. REVENUE_ENGINE
  const wsRev = wb.addWorksheet('REVENUE_ENGINE');
  build60MonthGrid(wsRev, 'MRR & Revenue Engine');
  wsRev.getCell('B5').value = 'ARPU (Average Revenue Per User) (₹)';
  wsRev.getCell('B6').value = 'Total MRR (Total Revenue) (₹)';
  wsRev.getCell('B6').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    wsRev.getCell(`${colStr}5`).value = 2500;
    wsRev.getCell(`${colStr}6`).value = { formula: `'SUBSCRIBER_FUNNEL'!${colStr}8 * ${colStr}5` };
    
    [5,6].forEach(r => styleDataCell(wsRev.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 6. COGS_ENGINE
  const wsCogs = wb.addWorksheet('COGS_ENGINE');
  build60MonthGrid(wsCogs, 'Cloud Infrastructure & Variable COGS');
  wsCogs.getCell('B5').value = 'Cloud & Server Hosting (₹)';
  wsCogs.getCell('B6').value = 'Payment Gateway Fees (2%) (₹)';
  wsCogs.getCell('B7').value = 'Total COGS (₹)';
  wsCogs.getCell('B7').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    wsCogs.getCell(`${colStr}5`).value = { formula: `10000 + (50 * 'SUBSCRIBER_FUNNEL'!${colStr}8)` };
    wsCogs.getCell(`${colStr}6`).value = { formula: `0.02 * 'REVENUE_ENGINE'!${colStr}6` };
    wsCogs.getCell(`${colStr}7`).value = { formula: `${colStr}5 + ${colStr}6` };
    
    [5,6,7].forEach(r => styleDataCell(wsCogs.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 7. HR_AND_OPEX
  const wsOpex = wb.addWorksheet('HR_AND_OPEX');
  build60MonthGrid(wsOpex, 'HR & Operating Expenses (OpEx)');
  wsOpex.getCell('B5').value = 'Engineering & Product (₹)';
  wsOpex.getCell('B6').value = 'Sales & Marketing (CAC) (₹)';
  wsOpex.getCell('B7').value = 'Customer Success (₹)';
  wsOpex.getCell('B8').value = 'Founders (₹)';
  wsOpex.getCell('B9').value = 'Admin & Legal (₹)';
  wsOpex.getCell('B10').value = 'Total OpEx (Incl. PF Burden) (₹)';
  wsOpex.getCell('B10').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const salaryInflation = `INDEX(ASSUMPTIONS!$C$16:$E$16, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    
    wsOpex.getCell(`${colStr}5`).value = { formula: `300000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}7`).value = { formula: `100000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}8`).value = { formula: `150000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}9`).value = { formula: `50000 * ((1 + ${salaryInflation}) ^ ${year})` };
    
    const marketingSpendPct = `INDEX(ASSUMPTIONS!$C$17:$E$17, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsOpex.getCell(`${colStr}6`).value = { formula: `'REVENUE_ENGINE'!${colStr}6 * ${marketingSpendPct}` }; 
    
    const pfBurden = `INDEX(ASSUMPTIONS!$C$8:$E$8, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsOpex.getCell(`${colStr}10`).value = { formula: `((${colStr}5 + ${colStr}6 + ${colStr}7 + ${colStr}8 + ${colStr}9) * (1 + ${pfBurden}))` };
    
    [5,6,7,8,9,10].forEach(r => styleDataCell(wsOpex.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 8. CAPEX_AND_DEPRECIATION
  const wsCapex = wb.addWorksheet('CAPEX_AND_DEPRECIATION');
  populateCapexAndDepreciation(wsCapex);

  // 9. WORKING_CAPITAL
  const wsWc = wb.addWorksheet('WORKING_CAPITAL');
  populateWorkingCapital(wsWc);

  // 10. MONTHLY_P_AND_L
  const wsPnl = wb.addWorksheet('MONTHLY_P_AND_L');
  build60MonthGrid(wsPnl, 'Monthly Profit & Loss');
  wsPnl.getCell('B5').value = 'Total Revenue';
  wsPnl.getCell('B6').value = 'Total COGS';
  wsPnl.getCell('B7').value = 'Gross Profit';
  wsPnl.getCell('B8').value = 'Total OpEx';
  wsPnl.getCell('B9').value = 'EBITDA';
  wsPnl.getCell('B10').value = 'Depreciation & Amortization';
  wsPnl.getCell('B11').value = 'EBIT';
  wsPnl.getCell('B12').value = 'Interest Expense';
  wsPnl.getCell('B13').value = 'Profit Before Tax (PBT)';
  wsPnl.getCell('B14').value = 'Corporate Tax';
  wsPnl.getCell('B15').value = 'Net Income (PAT)';
  wsPnl.getCell('B15').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    wsPnl.getCell(`${colStr}5`).value = { formula: `'REVENUE_ENGINE'!${colStr}6` };
    wsPnl.getCell(`${colStr}6`).value = { formula: `'COGS_ENGINE'!${colStr}7` };
    wsPnl.getCell(`${colStr}7`).value = { formula: `${colStr}5 - ${colStr}6` };
    wsPnl.getCell(`${colStr}8`).value = { formula: `'HR_AND_OPEX'!${colStr}10` };
    wsPnl.getCell(`${colStr}9`).value = { formula: `${colStr}7 - ${colStr}8` };
    wsPnl.getCell(`${colStr}10`).value = { formula: `'CAPEX_AND_DEPRECIATION'!${colStr}7` };
    wsPnl.getCell(`${colStr}11`).value = { formula: `${colStr}9 - ${colStr}10` };
    const interestFormula = `(5000000 * 0.12) / 12`;
    wsPnl.getCell(`${colStr}12`).value = { formula: interestFormula };
    wsPnl.getCell(`${colStr}13`).value = { formula: `${colStr}11 - ${colStr}12` };
    const taxRateFormula = `ASSUMPTIONS!$D$6`;
    const dpiitFormula = `INDEX(ASSUMPTIONS!$C$7:$E$7, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const yearNum = Math.floor((m - 1) / 12) + 1;
    if (yearNum <= 3) {
      wsPnl.getCell(`${colStr}14`).value = { formula: `IF(${dpiitFormula}=1, 0, MAX(0, ${colStr}13 * ${taxRateFormula}))` };
    } else {
      wsPnl.getCell(`${colStr}14`).value = { formula: `MAX(0, ${colStr}13 * ${taxRateFormula})` };
    }
    wsPnl.getCell(`${colStr}15`).value = { formula: `${colStr}13 - ${colStr}14` };
    
    [5,6,7,8,9,10,11,12,13,14,15].forEach(r => styleDataCell(wsPnl.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 11. MONTHLY_CASH_FLOW
  const wsCf = wb.addWorksheet('MONTHLY_CASH_FLOW');
  populateMonthlyCashFlow(wsCf);

  // 12. QUARTERLY_SUMMARY
  const wsQs = wb.addWorksheet('QUARTERLY_SUMMARY');
  populateQuarterlySummary(wsQs);

  // 13. YEARLY_SUMMARY
  const wsSummary = wb.addWorksheet('YEARLY_SUMMARY');
  buildYearlySummary(wsSummary);

  const finalPath = path.join(outputDir, 'template_saas.xlsx');
  await wb.xlsx.writeFile(finalPath);
  console.log(`✅ Generated SaaS Model: ${finalPath}`);
}
