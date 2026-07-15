import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const archetypes = [
  { name: 'SAAS', revEngine: 'SUBSCRIBER_FUNNEL_ENGINE' },
  { name: 'MANUFACTURING', revEngine: 'PRODUCTION_AND_PRICING_ENGINE' },
  { name: 'SERVICES', revEngine: 'BILLING_CAPACITY_ENGINE' }
];

const NAVY = 'FF0F172A';
const WHITE = 'FFFFFFFF';
const LIGHT_BLUE = 'FF38BDF8';
const ZEBRA = 'FFF8FAFC';

const applyUniversalStyling = (ws: ExcelJS.Worksheet) => {
  ws.views = [{ showGridLines: false }];
  ws.getColumn('A').width = 4;
};

const styleHeaderCell = (cell: ExcelJS.Cell, bgColor = NAVY, fontColor = WHITE) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: fontColor }, bold: true, name: 'Arial', size: 11 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
};

const styleDataCell = (cell: ExcelJS.Cell, numFmt = '#,##0') => {
  cell.numFmt = numFmt;
  cell.font = { name: 'Arial', size: 11 };
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };
};

const styleLabelCell = (cell: ExcelJS.Cell, isBold = false) => {
  cell.font = { name: 'Arial', size: 11, bold: isBold };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
};

// 1. The 60-Month Header Generator (Utility)
const build60MonthGrid = (ws: ExcelJS.Worksheet, title: string) => {
  applyUniversalStyling(ws);
  
  ws.getCell('B2').value = title;
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true };

  ws.getColumn(2).width = 40; // Column B
  
  const particularsCell = ws.getCell(4, 2);
  particularsCell.value = 'Particulars';
  styleHeaderCell(particularsCell, NAVY, WHITE);

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2; // Starts at Column C (index 3)
    ws.getColumn(colIdx).width = 15;
    const monthCell = ws.getCell(4, colIdx);
    monthCell.value = `Month ${m}`;
    styleHeaderCell(monthCell, NAVY, WHITE);
  }
};

const numToChar = (num: number): string => {
  let s = '';
  while (num > 0) {
    let rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
};

async function buildVentureModel(archetype: { name: string, revEngine: string }, outputDir: string) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Venture Wolf Dynamic Engine';

  // 1. COVER
  const wsCover = wb.addWorksheet('COVER');
  applyUniversalStyling(wsCover);
  wsCover.getColumn('B').width = 60;
  
  const titleCell = wsCover.getCell('B3');
  titleCell.value = 'Venture Wolf — Financial Model Blueprint';
  titleCell.font = { name: 'Arial', size: 22, bold: true, color: { argb: NAVY } };
  
  const archCell = wsCover.getCell('B4');
  archCell.value = `Archetype: ${archetype.name} (Grounded Market Reality Engine)`;
  archCell.font = { name: 'Arial', size: 14, italic: true, color: { argb: 'FF475569' } };

  // 2. ASSUMPTIONS (Categorized Dashboard)
  const wsAssumptions = wb.addWorksheet('ASSUMPTIONS');
  applyUniversalStyling(wsAssumptions);
  wsAssumptions.getColumn(2).width = 45; // B: Particulars / Drivers
  wsAssumptions.getColumn(3).width = 20; // C: Base Case
  wsAssumptions.getColumn(4).width = 20; // D: Best Case
  wsAssumptions.getColumn(5).width = 20; // E: Worst Case

  // Active Scenario Selector
  wsAssumptions.getCell('B2').value = 'ACTIVE SCENARIO FOR MODEL:';
  wsAssumptions.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: NAVY } };
  
  const activeScenarioCell = wsAssumptions.getCell('C2');
  activeScenarioCell.value = 'Base Case';
  activeScenarioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }; // Soft Yellow
  activeScenarioCell.font = { name: 'Arial', size: 14, bold: true };
  activeScenarioCell.alignment = { horizontal: 'center', vertical: 'middle' };
  activeScenarioCell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  activeScenarioCell.dataValidation = {
    type: 'list',
    allowBlank: false,
    formulae: ['"Base Case,Best Case,Worst Case"']
  };

  // Headers
  const headers = ['Particulars / Drivers', 'Base Case', 'Best Case', 'Worst Case'];
  headers.forEach((hdr, idx) => {
    const cell = wsAssumptions.getCell(4, 2 + idx);
    cell.value = hdr;
    styleHeaderCell(cell, LIGHT_BLUE, NAVY);
  });

  let currentRow = 5;

  const addCategoryHeader = (title: string) => {
    const cell = wsAssumptions.getCell(currentRow, 2);
    cell.value = title;
    styleHeaderCell(cell, NAVY, WHITE);
    wsAssumptions.mergeCells(currentRow, 2, currentRow, 5);
    currentRow++;
  };

  const addAssumptionRow = (label: string, format: string, base: number, best: number, worst: number) => {
    wsAssumptions.getCell(currentRow, 2).value = label;
    styleLabelCell(wsAssumptions.getCell(currentRow, 2));

    const vals = [base, best, worst];
    vals.forEach((val, idx) => {
      const cell = wsAssumptions.getCell(currentRow, 3 + idx);
      cell.value = val;
      styleDataCell(cell, format);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }; // Editable Yellow
    });
    currentRow++;
  };

  addCategoryHeader('MACRO-ECONOMIC & TAX');
  addAssumptionRow('Corporate Tax Rate (%)', '0.00%', 0.25, 0.20, 0.30);
  addAssumptionRow('Interest Rate on Debt (%)', '0.00%', 0.08, 0.06, 0.12);
  addAssumptionRow('Annual Inflation Rate (%)', '0.00%', 0.03, 0.02, 0.06);

  addCategoryHeader('REVENUE DRIVERS');
  if (archetype.name === 'SAAS') {
    addAssumptionRow('Starting MRR', '$#,##0', 50000, 75000, 20000);
    addAssumptionRow('MoM Growth Rate (%)', '0.00%', 0.15, 0.25, 0.05);
    addAssumptionRow('Avg. Churn Rate (%)', '0.00%', 0.05, 0.02, 0.10);
  } else if (archetype.name === 'MANUFACTURING') {
    addAssumptionRow('Factory Capacity (Units)', '#,##0', 10000, 15000, 5000);
    addAssumptionRow('Target Yield (%)', '0.00%', 0.95, 0.98, 0.85);
    addAssumptionRow('Unit Price Growth (%)', '0.00%', 0.05, 0.10, 0.00);
  } else {
    // Services
    addAssumptionRow('Base Headcount', '#,##0', 10, 15, 5);
    addAssumptionRow('Target Utilization (%)', '0.00%', 0.75, 0.90, 0.50);
    addAssumptionRow('Hourly Rate Growth (%)', '0.00%', 0.05, 0.10, 0.00);
  }

  addCategoryHeader('COST & OPEX DRIVERS');
  addAssumptionRow('COGS Margin (%)', '0.00%', 0.30, 0.20, 0.45);
  addAssumptionRow('Annual Payroll Increase (%)', '0.00%', 0.05, 0.03, 0.10);
  addAssumptionRow('Marketing Spend as % of Revenue', '0.00%', 0.10, 0.15, 0.05);

  // 3. FUNDING REQUIREMENT
  wb.addWorksheet('FUNDING_REQUIREMENT');

  // 4. REVENUE ENGINE (Dynamic)
  const wsRev = wb.addWorksheet(archetype.revEngine);
  build60MonthGrid(wsRev, `${archetype.name} Revenue Engine`);
  
  if (archetype.name === 'SAAS') {
    ['Starting Subscribers', 'New Subscribers', 'Churned Subscribers', 'Ending Subscribers', 'ARPU', 'Total Revenue'].forEach((label, idx) => {
      wsRev.getCell(5 + idx, 2).value = label;
      styleLabelCell(wsRev.getCell(5 + idx, 2), idx === 3 || idx === 5);
    });
    for (let m = 1; m <= 60; m++) {
      const colLetter = numToChar(m + 2);
      const prevColLetter = numToChar(m + 1);
      
      // Starting Subscribers
      wsRev.getCell(`${colLetter}5`).value = m === 1 ? 0 : { formula: `${prevColLetter}8` };
      styleDataCell(wsRev.getCell(`${colLetter}5`));
      
      // New Subscribers (dummy data: grows over time)
      wsRev.getCell(`${colLetter}6`).value = 50 + (m * 10);
      styleDataCell(wsRev.getCell(`${colLetter}6`));
      
      // Churned Subscribers (dummy data: 5% of starting)
      wsRev.getCell(`${colLetter}7`).value = { formula: `ROUND(${colLetter}5 * 0.05, 0)` };
      styleDataCell(wsRev.getCell(`${colLetter}7`));
      
      // Ending Subscribers
      wsRev.getCell(`${colLetter}8`).value = { formula: `${colLetter}5 + ${colLetter}6 - ${colLetter}7` };
      styleDataCell(wsRev.getCell(`${colLetter}8`));
      wsRev.getCell(`${colLetter}8`).font = { bold: true };
      
      // ARPU
      wsRev.getCell(`${colLetter}9`).value = 29.99;
      styleDataCell(wsRev.getCell(`${colLetter}9`), '$#,##0.00');
      
      // Total Revenue
      wsRev.getCell(`${colLetter}10`).value = { formula: `${colLetter}8 * ${colLetter}9` };
      styleDataCell(wsRev.getCell(`${colLetter}10`), '$#,##0');
      wsRev.getCell(`${colLetter}10`).font = { bold: true };
    }
  } else if (archetype.name === 'MANUFACTURING') {
    ['Units Produced', 'Unit Price', 'Total Revenue'].forEach((label, idx) => {
      wsRev.getCell(5 + idx, 2).value = label;
      styleLabelCell(wsRev.getCell(5 + idx, 2), idx === 2);
    });
    for (let m = 1; m <= 60; m++) {
      const colLetter = numToChar(m + 2);
      wsRev.getCell(`${colLetter}5`).value = 1000 + (m * 100);
      styleDataCell(wsRev.getCell(`${colLetter}5`));
      wsRev.getCell(`${colLetter}6`).value = 150;
      styleDataCell(wsRev.getCell(`${colLetter}6`), '$#,##0.00');
      wsRev.getCell(`${colLetter}7`).value = { formula: `${colLetter}5 * ${colLetter}6` };
      styleDataCell(wsRev.getCell(`${colLetter}7`), '$#,##0');
      wsRev.getCell(`${colLetter}7`).font = { bold: true };
    }
  } else if (archetype.name === 'SERVICES') {
    ['Headcount', 'Utilization %', 'Hourly Rate', 'Billable Hours', 'Total Revenue'].forEach((label, idx) => {
      wsRev.getCell(5 + idx, 2).value = label;
      styleLabelCell(wsRev.getCell(5 + idx, 2), idx === 4);
    });
    for (let m = 1; m <= 60; m++) {
      const colLetter = numToChar(m + 2);
      wsRev.getCell(`${colLetter}5`).value = 5 + Math.floor(m / 6);
      styleDataCell(wsRev.getCell(`${colLetter}5`));
      wsRev.getCell(`${colLetter}6`).value = 0.75;
      styleDataCell(wsRev.getCell(`${colLetter}6`), '0%');
      wsRev.getCell(`${colLetter}7`).value = 150;
      styleDataCell(wsRev.getCell(`${colLetter}7`), '$#,##0.00');
      wsRev.getCell(`${colLetter}8`).value = { formula: `${colLetter}5 * ${colLetter}6 * 160` };
      styleDataCell(wsRev.getCell(`${colLetter}8`));
      wsRev.getCell(`${colLetter}9`).value = { formula: `${colLetter}8 * ${colLetter}7` };
      styleDataCell(wsRev.getCell(`${colLetter}9`), '$#,##0');
      wsRev.getCell(`${colLetter}9`).font = { bold: true };
    }
  }

  // 5. COGS ENGINE
  wb.addWorksheet('COGS_ENGINE');

  // 6. HR & OPERATING EXPENSES
  const wsOpex = wb.addWorksheet('HR_AND_OPEX');
  build60MonthGrid(wsOpex, 'HR & Operating Expenses');
  
  ['Founders Salaries', 'Engineering Payroll', 'Sales & Marketing', 'Server/Cloud Costs', 'Total OpEx'].forEach((label, idx) => {
    wsOpex.getCell(5 + idx, 2).value = label;
    styleLabelCell(wsOpex.getCell(5 + idx, 2), idx === 4);
  });
  
  for (let m = 1; m <= 60; m++) {
    const colLetter = numToChar(m + 2);
    wsOpex.getCell(`${colLetter}5`).value = 10000;
    styleDataCell(wsOpex.getCell(`${colLetter}5`), '$#,##0');
    wsOpex.getCell(`${colLetter}6`).value = 15000 + (m * 500);
    styleDataCell(wsOpex.getCell(`${colLetter}6`), '$#,##0');
    wsOpex.getCell(`${colLetter}7`).value = 5000 + (m * 200);
    styleDataCell(wsOpex.getCell(`${colLetter}7`), '$#,##0');
    wsOpex.getCell(`${colLetter}8`).value = 1000 + (m * 100);
    styleDataCell(wsOpex.getCell(`${colLetter}8`), '$#,##0');
    
    wsOpex.getCell(`${colLetter}9`).value = { formula: `SUM(${colLetter}5:${colLetter}8)` };
    styleDataCell(wsOpex.getCell(`${colLetter}9`), '$#,##0');
    wsOpex.getCell(`${colLetter}9`).font = { bold: true };
    wsOpex.getCell(`${colLetter}9`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
  }

  // 7. CAPEX & DEPRECIATION
  wb.addWorksheet('CAPEX_AND_DEPRECIATION');

  // 8. WORKING CAPITAL SCHEDULE
  wb.addWorksheet('WORKING_CAPITAL_SCHEDULE');

  // 9. MONTHLY P&L
  const wsPnL = wb.addWorksheet('MONTHLY_P_AND_L');
  build60MonthGrid(wsPnL, 'Monthly Profit & Loss');
  
  ['Total Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'EBITDA', 'Net Income'].forEach((label, idx) => {
    wsPnL.getCell(5 + idx, 2).value = label;
    styleLabelCell(wsPnL.getCell(5 + idx, 2), [2, 4, 5].includes(idx));
  });

  for (let m = 1; m <= 60; m++) {
    const colLetter = numToChar(m + 2);
    
    // Revenue linked to Rev Engine
    const revRow = archetype.name === 'SAAS' ? 10 : archetype.name === 'MANUFACTURING' ? 7 : 9;
    wsPnL.getCell(`${colLetter}5`).value = { formula: `'${archetype.revEngine}'!${colLetter}${revRow}` };
    styleDataCell(wsPnL.getCell(`${colLetter}5`), '$#,##0');

    // Dummy COGS (30% of Revenue for demo purposes)
    wsPnL.getCell(`${colLetter}6`).value = { formula: `${colLetter}5 * 0.3` };
    styleDataCell(wsPnL.getCell(`${colLetter}6`), '$#,##0');
    
    // Gross Profit
    wsPnL.getCell(`${colLetter}7`).value = { formula: `${colLetter}5 - ${colLetter}6` };
    styleDataCell(wsPnL.getCell(`${colLetter}7`), '$#,##0');
    wsPnL.getCell(`${colLetter}7`).font = { bold: true };
    
    // OpEx linked to HR_AND_OPEX
    wsPnL.getCell(`${colLetter}8`).value = { formula: `'HR_AND_OPEX'!${colLetter}9` };
    styleDataCell(wsPnL.getCell(`${colLetter}8`), '$#,##0');
    
    // EBITDA
    wsPnL.getCell(`${colLetter}9`).value = { formula: `${colLetter}7 - ${colLetter}8` };
    styleDataCell(wsPnL.getCell(`${colLetter}9`), '$#,##0');
    wsPnL.getCell(`${colLetter}9`).font = { bold: true };
    
    // Net Income (Simplified to just equal EBITDA for the monthly sheet placeholder)
    wsPnL.getCell(`${colLetter}10`).value = { formula: `${colLetter}9` };
    styleDataCell(wsPnL.getCell(`${colLetter}10`), '$#,##0');
    wsPnL.getCell(`${colLetter}10`).font = { bold: true };
    wsPnL.getCell(`${colLetter}10`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
  }

  // 10. MONTHLY CASH FLOW
  wb.addWorksheet('MONTHLY_CASH_FLOW');

  // 11. QUARTERLY SUMMARY
  wb.addWorksheet('QUARTERLY_SUMMARY');

  // 12. YEARLY_SUMMARY (PAT Waterfall)
  const wsSummary = wb.addWorksheet('YEARLY_SUMMARY');
  applyUniversalStyling(wsSummary);
  wsSummary.getColumn('B').width = 40;
  for (let i = 3; i <= 7; i++) {
    wsSummary.getColumn(i).width = 18;
  }

  wsSummary.getCell('B2').value = 'Dynamic Annual Financial Summary (PAT Waterfall)';
  wsSummary.getCell('B2').font = { name: 'Arial', size: 16, bold: true };

  const columns = ['C', 'D', 'E', 'F', 'G'];
  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
  styleHeaderCell(wsSummary.getCell('B4'), NAVY, WHITE);
  wsSummary.getCell('B4').value = 'Particulars';
  
  columns.forEach((col, idx) => {
    const cell = wsSummary.getCell(`${col}4`);
    cell.value = years[idx];
    styleHeaderCell(cell, NAVY, WHITE);
  });

  const rowLabels = [
    { row: 5, label: 'Total Revenue', bold: true },
    { row: 6, label: 'Total COGS', bold: false },
    { row: 7, label: 'Gross Profit', bold: true },
    { row: 8, label: 'Gross Margin %', bold: true },
    { row: 9, label: 'Total Operating Expenses', bold: false },
    { row: 10, label: 'EBITDA', bold: true },
    { row: 11, label: 'Depreciation & Amortization', bold: false },
    { row: 12, label: 'EBIT (Operating Income)', bold: true },
    { row: 13, label: 'Interest Expense', bold: false },
    { row: 14, label: 'PBT (Profit Before Tax)', bold: true },
    { row: 15, label: 'Corporate Taxes', bold: false },
    { row: 16, label: 'Profit After Tax (PAT)', bold: true },
    { row: 17, label: 'PAT Margin %', bold: true }
  ];

  rowLabels.forEach(r => {
    const cell = wsSummary.getCell(`B${r.row}`);
    cell.value = r.label;
    styleLabelCell(cell, r.bold);
    if (r.bold) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
  });

  // Helper for rolling up 12 months from MONTHLY_P_AND_L
  const getSumFormula = (rowIdx: number, year: number) => {
    const startCol = numToChar((year - 1) * 12 + 3); // Year 1: C (3), Year 2: O (15), etc.
    const endCol = numToChar(year * 12 + 2);         // Year 1: N (14), Year 2: Z (26), etc.
    return `SUM('MONTHLY_P_AND_L'!${startCol}${rowIdx}:${endCol}${rowIdx})`;
  };

  columns.forEach((col, idx) => {
    const yearNum = idx + 1;
    
    // Revenue linked to P&L (row 5)
    wsSummary.getCell(`${col}5`).value = { formula: getSumFormula(5, yearNum) };
    styleDataCell(wsSummary.getCell(`${col}5`), '$#,##0');

    // COGS linked to P&L (row 6)
    wsSummary.getCell(`${col}6`).value = { formula: getSumFormula(6, yearNum) };
    styleDataCell(wsSummary.getCell(`${col}6`), '$#,##0');

    // Gross Profit
    wsSummary.getCell(`${col}7`).value = { formula: `${col}5-${col}6` };
    styleDataCell(wsSummary.getCell(`${col}7`), '$#,##0');
    wsSummary.getCell(`${col}7`).font = { bold: true };
    wsSummary.getCell(`${col}7`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };

    // Gross Margin %
    wsSummary.getCell(`${col}8`).value = { formula: `IF(${col}5>0, ${col}7/${col}5, 0)` };
    styleDataCell(wsSummary.getCell(`${col}8`), '0.00%');
    wsSummary.getCell(`${col}8`).font = { bold: true };

    // OpEx linked to P&L (row 8)
    wsSummary.getCell(`${col}9`).value = { formula: getSumFormula(8, yearNum) };
    styleDataCell(wsSummary.getCell(`${col}9`), '$#,##0');

    // EBITDA
    wsSummary.getCell(`${col}10`).value = { formula: `${col}7-${col}9` };
    styleDataCell(wsSummary.getCell(`${col}10`), '$#,##0');
    wsSummary.getCell(`${col}10`).font = { bold: true };
    wsSummary.getCell(`${col}10`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };

    // D&A
    wsSummary.getCell(`${col}11`).value = 50000;
    styleDataCell(wsSummary.getCell(`${col}11`), '$#,##0');

    // EBIT
    wsSummary.getCell(`${col}12`).value = { formula: `${col}10-${col}11` };
    styleDataCell(wsSummary.getCell(`${col}12`), '$#,##0');
    wsSummary.getCell(`${col}12`).font = { bold: true };
    wsSummary.getCell(`${col}12`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };

    // Interest Expense (Dynamically pulled from active scenario)
    wsSummary.getCell(`${col}13`).value = { formula: `500000 * INDEX(ASSUMPTIONS!$C$7:$E$7, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))` };
    styleDataCell(wsSummary.getCell(`${col}13`), '$#,##0');

    // PBT
    wsSummary.getCell(`${col}14`).value = { formula: `${col}12-${col}13` };
    styleDataCell(wsSummary.getCell(`${col}14`), '$#,##0');
    wsSummary.getCell(`${col}14`).font = { bold: true };
    wsSummary.getCell(`${col}14`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };

    // Corporate Taxes (Dynamically pulled from active scenario)
    wsSummary.getCell(`${col}15`).value = { formula: `MAX(0, ${col}14 * INDEX(ASSUMPTIONS!$C$6:$E$6, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0)))` };
    styleDataCell(wsSummary.getCell(`${col}15`), '$#,##0');

    // PAT
    wsSummary.getCell(`${col}16`).value = { formula: `${col}14-${col}15` };
    styleDataCell(wsSummary.getCell(`${col}16`), '$#,##0');
    wsSummary.getCell(`${col}16`).font = { bold: true };
    wsSummary.getCell(`${col}16`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };

    // PAT Margin %
    wsSummary.getCell(`${col}17`).value = { formula: `IF(${col}5>0, ${col}16/${col}5, 0)` };
    styleDataCell(wsSummary.getCell(`${col}17`), '0.00%');
    wsSummary.getCell(`${col}17`).font = { bold: true };
  });

  const filePath = path.join(outputDir, `template_${archetype.name.toLowerCase()}.xlsx`);
  await wb.xlsx.writeFile(filePath);
  console.log(`✅ Generated 12-Sheet Model: ${filePath}`);
}

async function runGenerator() {
  const outputDir = path.join(__dirname, '../assets/templates');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating Master Excel Blueprints with Dynamic Engines...');
  for (const archetype of archetypes) {
    await buildVentureModel(archetype, outputDir);
  }
  console.log('🎉 All venture models generated successfully.');
}

runGenerator();
