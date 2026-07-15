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

export default async function buildManufacturingModel(outputDir: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Venture Wolf India';

  // 1. COVER
  const wsCover = wb.addWorksheet('COVER');
  populateCoverSheet(wsCover, 'Manufacturing & Hardware');

  // 2. ASSUMPTIONS
  const wsAssumptions = wb.addWorksheet('ASSUMPTIONS');
  buildAssumptionDashboard(wsAssumptions, 'MANUFACTURING');

  // 3. FUNDING REQUIREMENT
  const wsFunding = wb.addWorksheet('FUNDING_REQUIREMENT');
  populateFundingRequirement(wsFunding);

  // 4. PRODUCTION_ENGINE
  const wsProd = wb.addWorksheet('PRODUCTION_ENGINE');
  build60MonthGrid(wsProd, 'Production & Revenue Engine');
  
  wsProd.getCell('B5').value = 'Installed Capacity (Units)';
  wsProd.getCell('B6').value = 'Effective Utilization (%)';
  wsProd.getCell('B7').value = 'Units Produced (Sellable)';
  wsProd.getCell('B8').value = 'Unit Price (₹)';
  wsProd.getCell('B9').value = 'Total Revenue (₹)';
  wsProd.getCell('B9').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    wsProd.getCell(`${colStr}5`).value = { formula: `INDEX(ASSUMPTIONS!$C$10:$E$10, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))` };
    
    const util = 0.30 + (0.60 * ((m - 1) / 59)); 
    wsProd.getCell(`${colStr}6`).value = util;
    styleDataCell(wsProd.getCell(`${colStr}6`), '0.00%');

    const yieldFormula = `INDEX(ASSUMPTIONS!$C$11:$E$11, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsProd.getCell(`${colStr}7`).value = { formula: `${colStr}5 * ${colStr}6 * ${yieldFormula}` };
    styleDataCell(wsProd.getCell(`${colStr}7`), '#,##0');

    const priceGrowth = `INDEX(ASSUMPTIONS!$C$13:$E$13, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    wsProd.getCell(`${colStr}8`).value = { formula: `1000 * ((1 + ${priceGrowth}) ^ ${year})` };
    styleDataCell(wsProd.getCell(`${colStr}8`), '₹#,##0');

    wsProd.getCell(`${colStr}9`).value = { formula: `${colStr}7 * ${colStr}8` };
    styleDataCell(wsProd.getCell(`${colStr}9`), '₹#,##0');
  }

  // 5. BOM_COGS_ENGINE
  const wsCogs = wb.addWorksheet('BOM_COGS_ENGINE');
  build60MonthGrid(wsCogs, 'Bill of Materials & COGS Engine');
  wsCogs.getCell('B5').value = 'Raw Material Cost Per Unit (₹)';
  wsCogs.getCell('B6').value = 'Packaging & Logistics Per Unit (₹)';
  wsCogs.getCell('B7').value = 'Total Variable Cost Per Unit (₹)';
  wsCogs.getCell('B8').value = 'Total COGS (₹)';
  wsCogs.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const inflation = `INDEX(ASSUMPTIONS!$C$16:$E$16, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    
    wsCogs.getCell(`${colStr}5`).value = { formula: `300 * ((1 + ${inflation}) ^ ${year})` };
    wsCogs.getCell(`${colStr}6`).value = { formula: `50 * ((1 + ${inflation}) ^ ${year})` };
    wsCogs.getCell(`${colStr}7`).value = { formula: `${colStr}5 + ${colStr}6` };
    
    wsCogs.getCell(`${colStr}8`).value = { formula: `${colStr}7 * 'PRODUCTION_ENGINE'!${colStr}7` };
    styleDataCell(wsCogs.getCell(`${colStr}8`), '₹#,##0');
  }

  // 6. HR_AND_OPEX
  const wsOpex = wb.addWorksheet('HR_AND_OPEX');
  build60MonthGrid(wsOpex, 'HR & Operating Expenses (OpEx)');
  wsOpex.getCell('B5').value = 'Factory Payroll (₹)';
  wsOpex.getCell('B6').value = 'Corporate Payroll (₹)';
  wsOpex.getCell('B7').value = 'Factory Overheads (₹)';
  wsOpex.getCell('B8').value = 'Marketing & Sales (₹)';
  wsOpex.getCell('B9').value = 'Admin & Legal (₹)';
  wsOpex.getCell('B10').value = 'Total OpEx (Incl. PF Burden) (₹)';
  wsOpex.getCell('B10').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    
    const salaryInflation = `INDEX(ASSUMPTIONS!$C$16:$E$16, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    const year = Math.floor((m - 1) / 12);
    
    wsOpex.getCell(`${colStr}5`).value = { formula: `200000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}6`).value = { formula: `150000 * ((1 + ${salaryInflation}) ^ ${year})` };
    wsOpex.getCell(`${colStr}7`).value = 50000;
    
    const marketingSpendPct = `INDEX(ASSUMPTIONS!$C$17:$E$17, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsOpex.getCell(`${colStr}8`).value = { formula: `'PRODUCTION_ENGINE'!${colStr}9 * ${marketingSpendPct}` }; 
    
    wsOpex.getCell(`${colStr}9`).value = 25000;
    
    const pfBurden = `INDEX(ASSUMPTIONS!$C$8:$E$8, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
    wsOpex.getCell(`${colStr}10`).value = { formula: `((${colStr}5 + ${colStr}6) * (1 + ${pfBurden})) + ${colStr}7 + ${colStr}8 + ${colStr}9` };
    styleDataCell(wsOpex.getCell(`${colStr}10`), '₹#,##0');
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
    
    wsPnl.getCell(`${colStr}5`).value = { formula: `'PRODUCTION_ENGINE'!${colStr}9` };
    wsPnl.getCell(`${colStr}6`).value = { formula: `'BOM_COGS_ENGINE'!${colStr}8` };
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

  // 10. MONTHLY_CASH_FLOW
  const wsCf = wb.addWorksheet('MONTHLY_CASH_FLOW');
  populateMonthlyCashFlow(wsCf);

  // 11. QUARTERLY_SUMMARY
  const wsQs = wb.addWorksheet('QUARTERLY_SUMMARY');
  populateQuarterlySummary(wsQs);

  // 12. YEARLY_SUMMARY
  const wsSummary = wb.addWorksheet('YEARLY_SUMMARY');
  buildYearlySummary(wsSummary);

  const finalPath = path.join(outputDir, 'template_manufacturing.xlsx');
  await wb.xlsx.writeFile(finalPath);
  console.log(`✅ Generated Manufacturing Model: ${finalPath}`);
}
