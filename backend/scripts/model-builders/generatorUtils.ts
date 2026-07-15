import ExcelJS from 'exceljs';

// --- 1. Universal Styling ---
export const NAVY = 'FF0F172A';
export const WHITE = 'FFFFFFFF';
export const LIGHT_BLUE = 'FF38BDF8';
export const ZEBRA = 'FFF8FAFC';
export const INPUT_YELLOW = 'FFFEF08A';

export const applyUniversalStyling = (ws: ExcelJS.Worksheet) => {
  ws.views = [{ showGridLines: false }];
  ws.getColumn('A').width = 4;
};

export const styleHeaderCell = (cell: ExcelJS.Cell, bgColor = NAVY, fontColor = WHITE) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.font = { color: { argb: fontColor }, bold: true, name: 'Arial', size: 11 };
  cell.alignment = { horizontal: 'center', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin' }, left: { style: 'thin' },
    bottom: { style: 'thin' }, right: { style: 'thin' }
  };
};

// --- 2. INR Formatting ---
export const styleDataCell = (cell: ExcelJS.Cell, numFmt = '₹#,##0') => {
  cell.numFmt = numFmt;
  cell.font = { name: 'Arial', size: 11 };
  cell.alignment = { horizontal: 'right', vertical: 'middle' };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
  };
};

export const styleLabelCell = (cell: ExcelJS.Cell, isBold = false) => {
  cell.font = { name: 'Arial', size: 11, bold: isBold };
  cell.alignment = { horizontal: 'left', vertical: 'middle' };
};

export const numToChar = (num: number): string => {
  let s = '';
  while (num > 0) {
    let rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
};

// --- 3. The 60-Month Grid Builder ---
export const build60MonthGrid = (ws: ExcelJS.Worksheet, title: string) => {
  applyUniversalStyling(ws);
  
  ws.getCell('B2').value = title;
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true };
  ws.getColumn(2).width = 40; 
  
  const particularsCell = ws.getCell(4, 2);
  particularsCell.value = 'Particulars';
  styleHeaderCell(particularsCell, NAVY, WHITE);

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2; 
    ws.getColumn(colIdx).width = 15;
    const monthCell = ws.getCell(4, colIdx);
    monthCell.value = `Month ${m}`;
    styleHeaderCell(monthCell, NAVY, WHITE);
  }
};

// --- 4. The Unified Assumption Dashboard Builder ---
export const buildAssumptionDashboard = (ws: ExcelJS.Worksheet, archetype: string) => {
  applyUniversalStyling(ws);
  ws.getColumn(2).width = 45; // Particulars
  ws.getColumn(3).width = 20; // Worst
  ws.getColumn(4).width = 20; // Base
  ws.getColumn(5).width = 20; // Best
  ws.getColumn(6).width = 20; // Active

  // Scenario Control Header
  ws.getCell('B2').value = 'ACTIVE SCENARIO:';
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true, color: { argb: NAVY } };
  const activeScenarioCell = ws.getCell('C2');
  activeScenarioCell.value = 'Base';
  activeScenarioCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_YELLOW } };
  activeScenarioCell.dataValidation = { type: 'list', allowBlank: false, formulae: ['"Worst,Base,Best"'] };

  // Scenario Grid Headers
  const headers = ['Particulars', 'Worst', 'Base', 'Best'];
  headers.forEach((hdr, idx) => {
    const cell = ws.getCell(4, 2 + idx);
    cell.value = hdr;
    styleHeaderCell(cell, LIGHT_BLUE, NAVY);
  });

  let currentRow = 5;

  const addCategoryHeader = (title: string) => {
    const cell = ws.getCell(currentRow, 2);
    cell.value = title;
    styleHeaderCell(cell, NAVY, WHITE);
    ws.mergeCells(currentRow, 2, currentRow, 5);
    currentRow++;
  };

  const addAssumptionRow = (label: string, format: string, worst: number, base: number, best: number) => {
    ws.getCell(currentRow, 2).value = label;
    styleLabelCell(ws.getCell(currentRow, 2));
    [worst, base, best].forEach((val, idx) => {
      const cell = ws.getCell(currentRow, 3 + idx);
      cell.value = val;
      styleDataCell(cell, format);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_YELLOW } };
    });
    currentRow++;
  };

  // --- ARCHETYPE-SPECIFIC DATA INJECTION ---
  addCategoryHeader('1. MACRO-ECONOMIC & TAX (INDIA)');
  const standardTax = 0.25; // 25% Statutory Rate
  addAssumptionRow('Corporate Tax Rate (%)', '0.00%', standardTax, standardTax, standardTax);
  addAssumptionRow('DPIIT Tax Holiday Active (1=Yes, 0=No)', '0', 0, 1, 1);
  addAssumptionRow('Employer PF Burden (%)', '0.00%', 0.15, 0.12, 0.10);

  addCategoryHeader('2. REVENUE DRIVERS');
  if (archetype === 'SAAS') {
    addAssumptionRow('Initial Customer Count', '#,##0', 500, 1000, 2000);
    addAssumptionRow('Avg. Monthly Revenue Per User (₹)', '₹#,##0', 2000, 2500, 3500);
    addAssumptionRow('MoM Growth Rate (%)', '0.00%', 0.05, 0.15, 0.25);
    addAssumptionRow('Monthly Churn Rate (%)', '0.00%', 0.10, 0.05, 0.02);
  } else if (archetype === 'MANUFACTURING') {
    addAssumptionRow('Installed Capacity (Units)', '#,##0', 5000, 10000, 15000);
    addAssumptionRow('Utilization Ramp-up (M12) (%)', '0.00%', 0.60, 0.80, 0.95);
    addAssumptionRow('Avg. Unit Price (₹)', '₹#,##0', 800, 1000, 1200);
    addAssumptionRow('Annual Price Inflation (%)', '0.00%', 0.00, 0.05, 0.10);
  } else { // SERVICES
    addAssumptionRow('Starting Billable Headcount', '#,##0', 5, 10, 20);
    addAssumptionRow('Target Utilization Rate (%)', '0.00%', 0.50, 0.75, 0.90);
    addAssumptionRow('Avg. Monthly Billing Rate (₹)', '₹#,##0', 150000, 200000, 300000);
  }

  addCategoryHeader('3. COST & OPEX DRIVERS');
  addAssumptionRow('Direct COGS Margin (%)', '0.00%', 0.45, 0.30, 0.20);
  addAssumptionRow('Annual Payroll Inflation (%)', '0.00%', 0.15, 0.10, 0.08);
  addAssumptionRow('Marketing Spend (% of Revenue)', '0.00%', 0.05, 0.10, 0.15);

  addCategoryHeader('4. WORKING CAPITAL');
  addAssumptionRow('Accounts Receivable (Days)', '0', 45, 30, 15);
  addAssumptionRow('Inventory Days (if applicable)', '0', 20, 12, 5);
  addAssumptionRow('Accounts Payable (Days)', '0', 15, 30, 45);
};

// --- 5. The Universal PAT Summary Builder ---
export const buildYearlySummary = (wsSummary: ExcelJS.Worksheet) => {
  applyUniversalStyling(wsSummary);
  wsSummary.getColumn('B').width = 40;
  for (let i = 3; i <= 7; i++) { wsSummary.getColumn(i).width = 18; }

  wsSummary.getCell('B2').value = 'Venture Wolf India — Master Summary Dashboard (Full Metrics)';
  wsSummary.getCell('B2').font = { name: 'Arial', size: 16, bold: true, color: { argb: NAVY } };

  const years = ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
  const scenarios = [
    { name: 'BASE CASE', rowStart: 5 },
    { name: 'BEST CASE', rowStart: 22 },
    { name: 'WORST CASE', rowStart: 39 }
  ];

  const metrics = [
    { label: '1. Total Revenue', formula: 'REV' },
    { label: '2. Total COGS', formula: 'COGS' },
    { label: '3. Gross Profit', formula: 'REV-COGS' },
    { label: 'A. Gross Margin %', formula: 'GP/REV' },
    { label: '4. Total Operating Expenses', formula: 'OPEX' },
    { label: '5. EBITDA', formula: 'GP-OPEX' },
    { label: 'B. EBITDA %', formula: 'EBITDA/REV' },
    { label: '6. Depreciation & Amortisation', formula: 'DEP' },
    { label: '7. EBIT', formula: 'EBITDA-DEP' },
    { label: '8. Interest', formula: 'INT' },
    { label: '9. PBT', formula: 'EBIT-INT' },
    { label: '10. Taxes', formula: 'PBT*TAX' },
    { label: '11. PAT', formula: 'PBT-TAX' },
    { label: 'C. PAT %', formula: 'PAT/REV' }
  ];

  scenarios.forEach((scen) => {
    // Header
    const headCell = wsSummary.getCell(scen.rowStart - 1, 2);
    headCell.value = scen.name;
    styleHeaderCell(headCell, NAVY, WHITE);
    wsSummary.mergeCells(scen.rowStart - 1, 2, scen.rowStart - 1, 7);

    // Columns
    ['Particulars', ...years].forEach((h, i) => {
      const cell = wsSummary.getCell(scen.rowStart, 2 + i);
      cell.value = h;
      styleHeaderCell(cell, LIGHT_BLUE, NAVY);
    });

    // Rows
    metrics.forEach((m, i) => {
      wsSummary.getCell(scen.rowStart + 1 + i, 2).value = m.label;
      styleLabelCell(wsSummary.getCell(scen.rowStart + 1 + i, 2), [2, 5, 8, 12, 13].includes(i));
    });

    // Logic: Fill with simulation placeholders based on scenario
    ['C', 'D', 'E', 'F', 'G'].forEach((col, colIdx) => {
      const year = colIdx + 1;
      const baseVal = 1000000 * Math.pow(1.2, year);
      const mult = scen.name === 'BEST CASE' ? 1.5 : scen.name === 'WORST CASE' ? 0.6 : 1;
      
      // We populate cells with formula logic derived from scenario weights
      wsSummary.getCell(`${col}${scen.rowStart + 1}`).value = baseVal * mult; // Revenue
      wsSummary.getCell(`${col}${scen.rowStart + 2}`).value = (baseVal * 0.3) * mult; // COGS
      wsSummary.getCell(`${col}${scen.rowStart + 3}`).value = { formula: `${col}${scen.rowStart + 1}-${col}${scen.rowStart + 2}` }; // GP
      wsSummary.getCell(`${col}${scen.rowStart + 4}`).value = { formula: `IF(${col}${scen.rowStart + 1}>0, ${col}${scen.rowStart + 3}/${col}${scen.rowStart + 1}, 0)` }; // GP%
      wsSummary.getCell(`${col}${scen.rowStart + 5}`).value = (baseVal * 0.1) * mult; // OpEx
      wsSummary.getCell(`${col}${scen.rowStart + 6}`).value = { formula: `${col}${scen.rowStart + 3}-${col}${scen.rowStart + 5}` }; // EBITDA
      wsSummary.getCell(`${col}${scen.rowStart + 7}`).value = { formula: `IF(${col}${scen.rowStart + 1}>0, ${col}${scen.rowStart + 6}/${col}${scen.rowStart + 1}, 0)` }; // EBITDA%
      wsSummary.getCell(`${col}${scen.rowStart + 8}`).value = 500000; // DEP
      wsSummary.getCell(`${col}${scen.rowStart + 9}`).value = { formula: `${col}${scen.rowStart + 6}-${col}${scen.rowStart + 8}` }; // EBIT
      wsSummary.getCell(`${col}${scen.rowStart + 10}`).value = 500000 * 0.12; // INT
      wsSummary.getCell(`${col}${scen.rowStart + 11}`).value = { formula: `${col}${scen.rowStart + 9}-${col}${scen.rowStart + 10}` }; // PBT
      
      const taxRateFormula = `ASSUMPTIONS!$D$6`;
      const dpiitFormula = `INDEX(ASSUMPTIONS!$C$7:$E$7, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
      
      if (year <= 3) {
        wsSummary.getCell(`${col}${scen.rowStart + 12}`).value = { formula: `IF(${dpiitFormula}=1, 0, MAX(0, ${col}${scen.rowStart + 11} * ${taxRateFormula}))` };
      } else {
        wsSummary.getCell(`${col}${scen.rowStart + 12}`).value = { formula: `MAX(0, ${col}${scen.rowStart + 11} * ${taxRateFormula})` };
      }
      
      wsSummary.getCell(`${col}${scen.rowStart + 13}`).value = { formula: `${col}${scen.rowStart + 11}-${col}${scen.rowStart + 12}` }; // PAT
      wsSummary.getCell(`${col}${scen.rowStart + 14}`).value = { formula: `IF(${col}${scen.rowStart + 1}>0, ${col}${scen.rowStart + 13}/${col}${scen.rowStart + 1}, 0)` }; // PAT%
      
      metrics.forEach((m, i) => {
          const isPct = m.label.includes('%');
          const cell = wsSummary.getCell(`${col}${scen.rowStart + 1 + i}`);
          styleDataCell(cell, isPct ? '0.00%' : '₹#,##0');
          if ([2, 5, 8, 10, 12, 13].includes(i)) cell.font = { bold: true };
          if ([2, 5, 8, 10].includes(i)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
          if (i === 12) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
      });
    });
  });
};

export const populateCoverSheet = (ws: ExcelJS.Worksheet, industry: string) => {
  applyUniversalStyling(ws);
  ws.mergeCells('B10:H16');
  const titleCell = ws.getCell('B10');
  titleCell.value = `Venture Wolf — ${industry} Financial Model (India)\nDynamic 60-Month Forecast`;
  titleCell.font = { name: 'Arial', size: 28, bold: true, color: { argb: WHITE } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  ws.mergeCells('B18:H18');
  const disclaimerCell = ws.getCell('B18');
  disclaimerCell.value = 'Confidential - Generated for internal venture analysis.';
  disclaimerCell.font = { name: 'Arial', size: 12, italic: true };
  disclaimerCell.alignment = { horizontal: 'center', vertical: 'middle' };
};

export const populateFundingRequirement = (ws: ExcelJS.Worksheet) => {
  applyUniversalStyling(ws);
  ws.getColumn('B').width = 40;
  ws.getColumn('C').width = 20;

  ws.getCell('B2').value = 'Funding Requirement (Tranche Breakdown)';
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true };

  styleHeaderCell(ws.getCell('B4'), NAVY, WHITE);
  ws.getCell('B4').value = 'Use of Funds';
  styleHeaderCell(ws.getCell('C4'), NAVY, WHITE);
  ws.getCell('C4').value = 'Amount (₹)';

  const rows = [
    { r: 5, label: 'CapEx & Hardware', val: 5000000 },
    { r: 6, label: 'Working Capital Buffer', val: 3000000 },
    { r: 7, label: 'Marketing Launch', val: 1500000 },
    { r: 8, label: 'Contingency', val: 500000 }
  ];

  rows.forEach(row => {
    ws.getCell(`B${row.r}`).value = row.label;
    styleLabelCell(ws.getCell(`B${row.r}`));
    ws.getCell(`C${row.r}`).value = row.val;
    styleDataCell(ws.getCell(`C${row.r}`), '₹#,##0');
    ws.getCell(`C${row.r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_YELLOW } };
  });

  ws.getCell('B9').value = 'Total Funding Required';
  styleLabelCell(ws.getCell('B9'), true);
  ws.getCell('C9').value = { formula: 'SUM(C5:C8)' };
  styleDataCell(ws.getCell('C9'), '₹#,##0');
  ws.getCell('C9').font = { bold: true };
  ws.getCell('C9').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
};

export const populateCapexAndDepreciation = (ws: ExcelJS.Worksheet) => {
  build60MonthGrid(ws, 'CapEx & Depreciation Schedule');

  ws.getCell('B5').value = 'Opening Asset Balance (₹)';
  ws.getCell('B6').value = 'New CapEx Additions (₹)';
  ws.getCell('B7').value = 'Depreciation Expense (₹)';
  ws.getCell('B8').value = 'Closing Asset Balance (₹)';
  ws.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    const prevColStr = numToChar(colIdx - 1);

    if (m === 1) {
      ws.getCell(`${colStr}5`).value = 0;
      ws.getCell(`${colStr}6`).value = { formula: `'FUNDING_REQUIREMENT'!$C$5` };
    } else {
      ws.getCell(`${colStr}5`).value = { formula: `${prevColStr}8` };
      ws.getCell(`${colStr}6`).value = 0;
    }

    ws.getCell(`${colStr}7`).value = { formula: `(${colStr}5 + ${colStr}6) / 60` };
    ws.getCell(`${colStr}8`).value = { formula: `${colStr}5 + ${colStr}6 - ${colStr}7` };

    [5,6,7,8].forEach(r => styleDataCell(ws.getCell(`${colStr}${r}`), '₹#,##0'));
  }
};

export const populateWorkingCapital = (ws: ExcelJS.Worksheet) => {
  build60MonthGrid(ws, 'Working Capital Schedule');

  ws.getCell('B5').value = 'Accounts Receivable (₹)';
  ws.getCell('B6').value = 'Accounts Payable (₹)';
  ws.getCell('B7').value = 'Net Working Capital (₹)';
  ws.getCell('B8').value = 'Change in Working Capital (₹)';
  ws.getCell('B8').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    const prevColStr = numToChar(colIdx - 1);

    ws.getCell(`${colStr}5`).value = { formula: `'MONTHLY_P_AND_L'!${colStr}5 * (30/365)` };
    ws.getCell(`${colStr}6`).value = { formula: `'MONTHLY_P_AND_L'!${colStr}8 * (15/365)` };
    ws.getCell(`${colStr}7`).value = { formula: `${colStr}5 - ${colStr}6` };

    if (m === 1) {
      ws.getCell(`${colStr}8`).value = { formula: `${colStr}7` };
    } else {
      ws.getCell(`${colStr}8`).value = { formula: `${colStr}7 - ${prevColStr}7` };
    }

    [5,6,7,8].forEach(r => styleDataCell(ws.getCell(`${colStr}${r}`), '₹#,##0'));
  }
};

export const populateMonthlyCashFlow = (ws: ExcelJS.Worksheet) => {
  build60MonthGrid(ws, 'Monthly Cash Flow Statement');

  ws.getCell('B5').value = 'Net Income (₹)';
  ws.getCell('B6').value = 'Add Back: Depreciation (₹)';
  ws.getCell('B7').value = 'Less: Change in Working Capital (₹)';
  ws.getCell('B8').value = 'Operating Cash Flow (₹)';
  ws.getCell('B8').font = { bold: true };
  
  ws.getCell('B9').value = 'Less: CapEx Additions (₹)';
  ws.getCell('B10').value = 'Investing Cash Flow (₹)';
  ws.getCell('B10').font = { bold: true };
  
  ws.getCell('B11').value = 'Add: Equity Funding (₹)';
  ws.getCell('B12').value = 'Financing Cash Flow (₹)';
  ws.getCell('B12').font = { bold: true };
  
  ws.getCell('B13').value = 'Net Cash Flow for Month (₹)';
  ws.getCell('B13').font = { bold: true };
  ws.getCell('B14').value = 'Closing Cash Balance (₹)';
  ws.getCell('B14').font = { bold: true };

  for (let m = 1; m <= 60; m++) {
    const colIdx = m + 2;
    const colStr = numToChar(colIdx);
    const prevColStr = numToChar(colIdx - 1);

    ws.getCell(`${colStr}5`).value = { formula: `'MONTHLY_P_AND_L'!${colStr}15` };
    ws.getCell(`${colStr}6`).value = { formula: `'CAPEX_AND_DEPRECIATION'!${colStr}7` };
    ws.getCell(`${colStr}7`).value = { formula: `'WORKING_CAPITAL'!${colStr}8` };
    ws.getCell(`${colStr}8`).value = { formula: `${colStr}5 + ${colStr}6 - ${colStr}7` };

    ws.getCell(`${colStr}9`).value = { formula: `'CAPEX_AND_DEPRECIATION'!${colStr}6` };
    ws.getCell(`${colStr}10`).value = { formula: `-${colStr}9` };

    if (m === 1) {
      ws.getCell(`${colStr}11`).value = { formula: `'FUNDING_REQUIREMENT'!$C$9` };
    } else {
      ws.getCell(`${colStr}11`).value = 0;
    }
    ws.getCell(`${colStr}12`).value = { formula: `${colStr}11` };

    ws.getCell(`${colStr}13`).value = { formula: `${colStr}8 + ${colStr}10 + ${colStr}12` };

    if (m === 1) {
      ws.getCell(`${colStr}14`).value = { formula: `${colStr}13` };
    } else {
      ws.getCell(`${colStr}14`).value = { formula: `${prevColStr}14 + ${colStr}13` };
    }

    [5,6,7,8,9,10,11,12,13,14].forEach(r => styleDataCell(ws.getCell(`${colStr}${r}`), '₹#,##0'));
  }
};

export const populateQuarterlySummary = (wsSummary: ExcelJS.Worksheet) => {
  applyUniversalStyling(wsSummary);
  wsSummary.getColumn('B').width = 40;
  for (let i = 3; i <= 22; i++) { wsSummary.getColumn(i).width = 18; }

  wsSummary.getCell('B2').value = 'Venture Wolf India — Master Quarterly Dashboard (Full Metrics)';
  wsSummary.getCell('B2').font = { name: 'Arial', size: 16, bold: true, color: { argb: NAVY } };

  const quarters = Array.from({ length: 20 }, (_, i) => `Q${i + 1}`);
  const scenarios = [
    { name: 'BASE CASE', rowStart: 5 },
    { name: 'BEST CASE', rowStart: 22 },
    { name: 'WORST CASE', rowStart: 39 }
  ];

  const metrics = [
    { label: '1. Total Revenue', formula: 'REV' },
    { label: '2. Total COGS', formula: 'COGS' },
    { label: '3. Gross Profit', formula: 'REV-COGS' },
    { label: 'A. Gross Margin %', formula: 'GP/REV' },
    { label: '4. Total Operating Expenses', formula: 'OPEX' },
    { label: '5. EBITDA', formula: 'GP-OPEX' },
    { label: 'B. EBITDA %', formula: 'EBITDA/REV' },
    { label: '6. Depreciation & Amortisation', formula: 'DEP' },
    { label: '7. EBIT', formula: 'EBITDA-DEP' },
    { label: '8. Interest', formula: 'INT' },
    { label: '9. PBT', formula: 'EBIT-INT' },
    { label: '10. Taxes', formula: 'PBT*TAX' },
    { label: '11. PAT', formula: 'PBT-TAX' },
    { label: 'C. PAT %', formula: 'PAT/REV' }
  ];

  scenarios.forEach((scen) => {
    // Header
    const headCell = wsSummary.getCell(scen.rowStart - 1, 2);
    headCell.value = scen.name;
    styleHeaderCell(headCell, NAVY, WHITE);
    wsSummary.mergeCells(scen.rowStart - 1, 2, scen.rowStart - 1, 22);

    // Columns
    ['Particulars', ...quarters].forEach((h, i) => {
      const cell = wsSummary.getCell(scen.rowStart, 2 + i);
      cell.value = h;
      styleHeaderCell(cell, LIGHT_BLUE, NAVY);
    });

    // Rows
    metrics.forEach((m, i) => {
      wsSummary.getCell(scen.rowStart + 1 + i, 2).value = m.label;
      styleLabelCell(wsSummary.getCell(scen.rowStart + 1 + i, 2), [2, 5, 8, 12, 13].includes(i));
    });

    // Logic: Fill with simulation placeholders based on scenario
    for (let q = 1; q <= 20; q++) {
      const colIdx = q + 2;
      const colStr = numToChar(colIdx);
      
      const baseVal = 250000 * Math.pow(1.05, q);
      const mult = scen.name === 'BEST CASE' ? 1.5 : scen.name === 'WORST CASE' ? 0.6 : 1;
      
      // We populate cells with formula logic derived from scenario weights
      wsSummary.getCell(`${colStr}${scen.rowStart + 1}`).value = baseVal * mult; // Revenue
      wsSummary.getCell(`${colStr}${scen.rowStart + 2}`).value = (baseVal * 0.3) * mult; // COGS
      wsSummary.getCell(`${colStr}${scen.rowStart + 3}`).value = { formula: `${colStr}${scen.rowStart + 1}-${colStr}${scen.rowStart + 2}` }; // GP
      wsSummary.getCell(`${colStr}${scen.rowStart + 4}`).value = { formula: `IF(${colStr}${scen.rowStart + 1}>0, ${colStr}${scen.rowStart + 3}/${colStr}${scen.rowStart + 1}, 0)` }; // GP%
      wsSummary.getCell(`${colStr}${scen.rowStart + 5}`).value = (baseVal * 0.1) * mult; // OpEx
      wsSummary.getCell(`${colStr}${scen.rowStart + 6}`).value = { formula: `${colStr}${scen.rowStart + 3}-${colStr}${scen.rowStart + 5}` }; // EBITDA
      wsSummary.getCell(`${colStr}${scen.rowStart + 7}`).value = { formula: `IF(${colStr}${scen.rowStart + 1}>0, ${colStr}${scen.rowStart + 6}/${colStr}${scen.rowStart + 1}, 0)` }; // EBITDA%
      wsSummary.getCell(`${colStr}${scen.rowStart + 8}`).value = 125000; // DEP
      wsSummary.getCell(`${colStr}${scen.rowStart + 9}`).value = { formula: `${colStr}${scen.rowStart + 6}-${colStr}${scen.rowStart + 8}` }; // EBIT
      wsSummary.getCell(`${colStr}${scen.rowStart + 10}`).value = 125000 * 0.12; // INT
      wsSummary.getCell(`${colStr}${scen.rowStart + 11}`).value = { formula: `${colStr}${scen.rowStart + 9}-${colStr}${scen.rowStart + 10}` }; // PBT
      
      const taxRateFormula = `ASSUMPTIONS!$D$6`;
      const dpiitFormula = `INDEX(ASSUMPTIONS!$C$7:$E$7, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))`;
      
      if (q <= 12) {
        wsSummary.getCell(`${colStr}${scen.rowStart + 12}`).value = { formula: `IF(${dpiitFormula}=1, 0, MAX(0, ${colStr}${scen.rowStart + 11} * ${taxRateFormula}))` };
      } else {
        wsSummary.getCell(`${colStr}${scen.rowStart + 12}`).value = { formula: `MAX(0, ${colStr}${scen.rowStart + 11} * ${taxRateFormula})` };
      }
      
      wsSummary.getCell(`${colStr}${scen.rowStart + 13}`).value = { formula: `${colStr}${scen.rowStart + 11}-${colStr}${scen.rowStart + 12}` }; // PAT
      wsSummary.getCell(`${colStr}${scen.rowStart + 14}`).value = { formula: `IF(${colStr}${scen.rowStart + 1}>0, ${colStr}${scen.rowStart + 13}/${colStr}${scen.rowStart + 1}, 0)` }; // PAT%
      
      metrics.forEach((m, i) => {
          const isPct = m.label.includes('%');
          const cell = wsSummary.getCell(`${colStr}${scen.rowStart + 1 + i}`);
          styleDataCell(cell, isPct ? '0.00%' : '₹#,##0');
          if ([2, 5, 8, 10, 12, 13].includes(i)) cell.font = { bold: true };
          if ([2, 5, 8, 10].includes(i)) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
          if (i === 12) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };
      });
    }
  });
};
