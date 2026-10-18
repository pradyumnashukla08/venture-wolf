const fs = require('fs');

const appendContent = `
export const populateCoverSheet = (ws: ExcelJS.Worksheet, industry: string) => {
  applyUniversalStyling(ws);
  ws.mergeCells('B10:H16');
  const titleCell = ws.getCell('B10');
  titleCell.value = \`Venture Wolf — \${industry} Financial Model (India)\\nDynamic 60-Month Forecast\`;
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
    ws.getCell(\`B\${row.r}\`).value = row.label;
    styleLabelCell(ws.getCell(\`B\${row.r}\`));
    ws.getCell(\`C\${row.r}\`).value = row.val;
    styleDataCell(ws.getCell(\`C\${row.r}\`), '₹#,##0');
    ws.getCell(\`C\${row.r}\`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INPUT_YELLOW } };
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
      ws.getCell(\`\${colStr}5\`).value = 0;
      ws.getCell(\`\${colStr}6\`).value = { formula: \`'FUNDING_REQUIREMENT'!$C$5\` };
    } else {
      ws.getCell(\`\${colStr}5\`).value = { formula: \`\${prevColStr}8\` };
      ws.getCell(\`\${colStr}6\`).value = 0;
    }

    ws.getCell(\`\${colStr}7\`).value = { formula: \`(\${colStr}5 + \${colStr}6) / 60\` };
    ws.getCell(\`\${colStr}8\`).value = { formula: \`\${colStr}5 + \${colStr}6 - \${colStr}7\` };

    [5,6,7,8].forEach(r => styleDataCell(ws.getCell(\`\${colStr}\${r}\`), '₹#,##0'));
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

    ws.getCell(\`\${colStr}5\`).value = { formula: \`'MONTHLY_P_AND_L'!\${colStr}5 * (30/365)\` };
    ws.getCell(\`\${colStr}6\`).value = { formula: \`'MONTHLY_P_AND_L'!\${colStr}8 * (15/365)\` };
    ws.getCell(\`\${colStr}7\`).value = { formula: \`\${colStr}5 - \${colStr}6\` };

    if (m === 1) {
      ws.getCell(\`\${colStr}8\`).value = { formula: \`\${colStr}7\` };
    } else {
      ws.getCell(\`\${colStr}8\`).value = { formula: \`\${colStr}7 - \${prevColStr}7\` };
    }

    [5,6,7,8].forEach(r => styleDataCell(ws.getCell(\`\${colStr}\${r}\`), '₹#,##0'));
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

    ws.getCell(\`\${colStr}5\`).value = { formula: \`'MONTHLY_P_AND_L'!\${colStr}15\` };
    ws.getCell(\`\${colStr}6\`).value = { formula: \`'CAPEX_AND_DEPRECIATION'!\${colStr}7\` };
    ws.getCell(\`\${colStr}7\`).value = { formula: \`'WORKING_CAPITAL'!\${colStr}8\` };
    ws.getCell(\`\${colStr}8\`).value = { formula: \`\${colStr}5 + \${colStr}6 - \${colStr}7\` };

    ws.getCell(\`\${colStr}9\`).value = { formula: \`'CAPEX_AND_DEPRECIATION'!\${colStr}6\` };
    ws.getCell(\`\${colStr}10\`).value = { formula: \`-\${colStr}9\` };

    if (m === 1) {
      ws.getCell(\`\${colStr}11\`).value = { formula: \`'FUNDING_REQUIREMENT'!$C$9\` };
    } else {
      ws.getCell(\`\${colStr}11\`).value = 0;
    }
    ws.getCell(\`\${colStr}12\`).value = { formula: \`\${colStr}11\` };

    ws.getCell(\`\${colStr}13\`).value = { formula: \`\${colStr}8 + \${colStr}10 + \${colStr}12\` };

    if (m === 1) {
      ws.getCell(\`\${colStr}14\`).value = { formula: \`\${colStr}13\` };
    } else {
      ws.getCell(\`\${colStr}14\`).value = { formula: \`\${prevColStr}14 + \${colStr}13\` };
    }

    [5,6,7,8,9,10,11,12,13,14].forEach(r => styleDataCell(ws.getCell(\`\${colStr}\${r}\`), '₹#,##0'));
  }
};

export const populateQuarterlySummary = (ws: ExcelJS.Worksheet) => {
  applyUniversalStyling(ws);
  ws.getColumn('B').width = 40;
  
  ws.getCell('B2').value = 'Quarterly Rollup Summary';
  ws.getCell('B2').font = { name: 'Arial', size: 14, bold: true };
  
  styleHeaderCell(ws.getCell('B4'), NAVY, WHITE);
  ws.getCell('B4').value = 'Particulars';

  for (let q = 1; q <= 20; q++) {
    const colIdx = q + 2;
    const colStr = numToChar(colIdx);
    ws.getColumn(colIdx).width = 15;
    const cell = ws.getCell(\`\${colStr}4\`);
    cell.value = \`Q\${q}\`;
    styleHeaderCell(cell, NAVY, WHITE);
  }

  const rowLabels = [
    { r: 5, label: 'Total Revenue', pnlRow: 5 },
    { r: 6, label: 'Total COGS', pnlRow: 6 },
    { r: 7, label: 'Gross Profit', pnlRow: 7 },
    { r: 8, label: 'Total OpEx', pnlRow: 8 },
    { r: 9, label: 'EBITDA', pnlRow: 9 },
    { r: 10, label: 'Net Income', pnlRow: 15 },
  ];

  rowLabels.forEach(row => {
    ws.getCell(\`B\${row.r}\`).value = row.label;
    styleLabelCell(ws.getCell(\`B\${row.r}\`), row.r === 7 || row.r === 9 || row.r === 10);
    if (row.r === 7 || row.r === 9 || row.r === 10) {
       ws.getCell(\`B\${row.r}\`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
    }
  });

  for (let q = 1; q <= 20; q++) {
    const colIdx = q + 2;
    const colStr = numToChar(colIdx);
    
    const startMonth = (q - 1) * 3 + 1;
    const endMonth = q * 3;
    const startMCol = numToChar(startMonth + 2);
    const endMCol = numToChar(endMonth + 2);

    rowLabels.forEach(row => {
      ws.getCell(\`\${colStr}\${row.r}\`).value = { formula: \`SUM('MONTHLY_P_AND_L'!\${startMCol}\${row.pnlRow}:\${endMCol}\${row.pnlRow})\` };
      styleDataCell(ws.getCell(\`\${colStr}\${row.r}\`), '₹#,##0');
      if (row.r === 7 || row.r === 9 || row.r === 10) {
         ws.getCell(\`\${colStr}\${row.r}\`).font = { bold: true };
         ws.getCell(\`\${colStr}\${row.r}\`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
    });
  }
};
`;

fs.appendFileSync('scripts/model-builders/generatorUtils.ts', appendContent);
