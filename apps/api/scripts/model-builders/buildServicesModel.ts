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

export default async function buildServicesModel(outputDir: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Venture Wolf India';

  // 1. COVER
  const wsCover = wb.addWorksheet('COVER');
  populateCoverSheet(wsCover, 'Services & Agency');

  // 2. ASSUMPTIONS
  const wsAssumptions = wb.addWorksheet('ASSUMPTIONS');
  buildAssumptionDashboard(wsAssumptions, 'SERVICES');

  // 3. FUNDING REQUIREMENT
  const wsFunding = wb.addWorksheet('FUNDING_REQUIREMENT');
  populateFundingRequirement(wsFunding);

  // 4. BILLABLE_CAPACITY_ENGINE
  const wsCap = wb.addWorksheet('BILLABLE_CAPACITY_ENGINE');
  build60MonthGrid(wsCap, 'Billable Headcount & Capacity');
  
  wsCap.getCell('B5').value = 'Billable Headcount';
  wsCap.getCell('B6').value = 'Target Utilization (%)';
  wsCap.getCell('B7').value = 'Average Monthly Billing Rate (₹)';
  wsCap.getCell('B8').value = 'Total Revenue (₹)';
  wsCap.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const baseHc = `INDEX(ASSUMPTIONS!$C$10:$E$10, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsCap.getCell(`${colStr}5`).value = { formula: `${baseHc} + INT(${m - 1} / 2)` };
    
    const util = `INDEX(ASSUMPTIONS!$C$11:$E$11, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsCap.getCell(`${colStr}6`).value = { formula: util };
    styleDataCell(wsCap.getCell(`${colStr}6`), '0.00%');

    const baseRate = `INDEX(ASSUMPTIONS!$C$12:$E$12, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    wsCap.getCell(`${colStr}7`).value = { formula: `${baseRate} * ((1 + 0.05) ^ ${year})` };
    styleDataCell(wsCap.getCell(`${colStr}7`), '₹#,##0');

    wsCap.getCell(`${colStr}8`).value = { formula: `${colStr}5 * ${colStr}6 * ${colStr}7` };
    styleDataCell(wsCap.getCell(`${colStr}8`), '₹#,##0');
  }

  // 5. DIRECT_COGS_ENGINE
  const wsCogs = wb.addWorksheet('DIRECT_COGS_ENGINE');
  build60MonthGrid(wsCogs, 'Direct Cost of Service Delivery (COGS)');
  wsCogs.getCell('B5').value = 'Direct Billable Payroll (₹)';
  wsCogs.getCell('B6').value = 'Software Licenses & Tech per Head (₹)';
  wsCogs.getCell('B7').value = 'Subcontractor / Freelancer Buffer (₹)';
  wsCogs.getCell('B8').value = 'Total COGS (Incl. PF) (₹)';
  wsCogs.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const salaryInflation = `INDEX(ASSUMPTIONS!$C$15:$E$15, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const pfBurden = `INDEX(ASSUMPTIONS!$C$8:$E$8, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    
    wsCogs.getCell(`${colStr}5`).value = { formula: `('BILLABLE_CAPACITY_ENGINE'!${colStr}5 * 80000) * ((1 + ${salaryInflation}) ^ ${year})` };
    wsCogs.getCell(`${colStr}6`).value = { formula: `'BILLABLE_CAPACITY_ENGINE'!${colStr}5 * 5000` };
    wsCogs.getCell(`${colStr}7`).value = { formula: `'BILLABLE_CAPACITY_ENGINE'!${colStr}8 * 0.05` };
    wsCogs.getCell(`${colStr}8`).value = { formula: `(${colStr}5 * (1 + ${pfBurden})) + ${colStr}6 + ${colStr}7` };
    
    [5,6,7,8].forEach(r => styleDataCell(wsCogs.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 6. HR_AND_OPEX
  const wsOpex = wb.addWorksheet('HR_AND_OPEX');
  build60MonthGrid(wsOpex, 'HR & Operating Expenses (Non-Billable)');
  wsOpex.getCell('B5').value = 'Founders & Leadership Payroll (₹)';
  wsOpex.getCell('B6').value = 'Sales & Marketing (₹)';
  wsOpex.getCell('B7').value = 'HR, Admin & Legal (₹)';
  wsOpex.getCell('B8').value = 'Office Rent & Utilities (₹)';
  wsOpex.getCell('B9').value = 'Total OpEx (Incl. PF on Payroll) (₹)';
  wsOpex.getCell('B9').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const salaryInflation = `INDEX(ASSUMPTIONS!$C$15:$E$15, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const pfBurden = `INDEX(ASSUMPTIONS!$C$8:$E$8, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    
    wsOpex.getCell(`${colStr}5`).value = { formula: `250000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}6`).value = { formula: `150000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}7`).value = { formula: `100000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}8`).value = { formula: `150000 * ((1 + 0.05) ^ ${year})` }; // Rent inflates at fixed 5%
    
    wsOpex.getCell(`${colStr}9`).value = { formula: `((${colStr}5 + ${colStr}6 + ${colStr}7) * (1 + ${pfBurden})) + ${colStr}8` };
    
    [5,6,7,8,9].forEach(r => styleDataCell(wsOpex.getCell(`${colStr}${r}`), '₹#,##0'));
  }

  // 7. CAPEX_AND_DEPRECIATION
  const wsCapex = wb.addWorksheet('CAPEX_AND_DEPRECIATION');
  populateCapexAndDepreciation(wsCapex);

  // 8. WORKING_CAPITAL
  const wsWc = wb.addWorksheet('WORKING_CAPITAL');
  populateWorkingCapital(wsWc);

  // 9. MONTHLY_P_AND_L
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
    
    wsPnl.getCell(`${colStr}5`).value = { formula: `'BILLABLE_CAPACITY_ENGINE'!${colStr}8` };
    wsPnl.getCell(`${colStr}6`).value = { formula: `'DIRECT_COGS_ENGINE'!${colStr}8` };
    wsPnl.getCell(`${colStr}7`).value = { formula: `${colStr}5 - ${colStr}6` };
    wsPnl.getCell(`${colStr}8`).value = { formula: `'HR_AND_OPEX'!${colStr}9` };
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

  // 10. MONTHLY_CASH_FLOW
  const wsCf = wb.addWorksheet('MONTHLY_CASH_FLOW');
  populateMonthlyCashFlow(wsCf);

  // 11. QUARTERLY_SUMMARY
  const wsQs = wb.addWorksheet('QUARTERLY_SUMMARY');
  populateQuarterlySummary(wsQs);

  // 12. YEARLY_SUMMARY
  const wsSummary = wb.addWorksheet('YEARLY_SUMMARY');
  buildYearlySummary(wsSummary);

  const finalPath = path.join(outputDir, 'template_services.xlsx');
  await wb.xlsx.writeFile(finalPath);
  console.log(`✅ Generated Services Model: ${finalPath}`);
}
