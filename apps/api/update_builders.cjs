const fs = require('fs');
const path = require('path');

const pnlHeaders = `
  wsPnl.getCell('B10').value = 'Depreciation & Amortization';
  wsPnl.getCell('B11').value = 'EBIT';
  wsPnl.getCell('B12').value = 'Interest Expense';
  wsPnl.getCell('B13').value = 'Profit Before Tax (PBT)';
  wsPnl.getCell('B14').value = 'Corporate Tax';
  wsPnl.getCell('B15').value = 'Net Income (PAT)';
  wsPnl.getCell('B15').font = { bold: true };
`;

const pnlFormulas = `
    wsPnl.getCell(\`\${colStr}10\`).value = { formula: \`'CAPEX_AND_DEPRECIATION'!\${colStr}7\` };
    wsPnl.getCell(\`\${colStr}11\`).value = { formula: \`\${colStr}9 - \${colStr}10\` };
    const interestFormula = \`(5000000 * INDEX(ASSUMPTIONS!$C$8:$E$8, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))) / 12\`;
    wsPnl.getCell(\`\${colStr}12\`).value = { formula: interestFormula };
    wsPnl.getCell(\`\${colStr}13\`).value = { formula: \`\${colStr}11 - \${colStr}12\` };
    const taxRateFormula = \`INDEX(ASSUMPTIONS!$C$6:$E$6, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))\`;
    const dpiitFormula = \`INDEX(ASSUMPTIONS!$C$7:$E$7, 1, MATCH(ASSUMPTIONS!$C$2, ASSUMPTIONS!$C$4:$E$4, 0))\`;
    const yearNum = Math.floor((m - 1) / 12) + 1;
    if (yearNum <= 3) {
      wsPnl.getCell(\`\${colStr}14\`).value = { formula: \`IF(\${dpiitFormula}=1, 0, MAX(0, \${colStr}13 * \${taxRateFormula}))\` };
    } else {
      wsPnl.getCell(\`\${colStr}14\`).value = { formula: \`MAX(0, \${colStr}13 * \${taxRateFormula})\` };
    }
    wsPnl.getCell(\`\${colStr}15\`).value = { formula: \`\${colStr}13 - \${colStr}14\` };
    
    [5,6,7,8,9,10,11,12,13,14,15].forEach(r => styleDataCell(wsPnl.getCell(\`\${colStr}\${r}\`), '₹#,##0'));
`;

const processFile = (file, industryTitle) => {
  let content = fs.readFileSync(file, 'utf-8');

  // Update Imports
  content = content.replace(
    /} from '.\/generatorUtils.js';/,
    `  populateCoverSheet,
  populateFundingRequirement,
  populateCapexAndDepreciation,
  populateWorkingCapital,
  populateMonthlyCashFlow,
  populateQuarterlySummary\n} from './generatorUtils.js';`
  );

  // Update COVER
  content = content.replace(
    /applyUniversalStyling\(wsCover\);[\s\S]*?\/\/ 2\. ASSUMPTIONS/,
    `populateCoverSheet(wsCover, '${industryTitle}');\n\n  // 2. ASSUMPTIONS`
  );

  // Update FUNDING_REQUIREMENT
  content = content.replace(
    /applyUniversalStyling\(wsFunding\);[\s\S]*?\/\/ 4\./,
    `populateFundingRequirement(wsFunding);\n\n  // 4.`
  );

  // Update CAPEX and WORKING CAPITAL (10, 11, 12 sheets shift up because 13 was for SaaS)
  // We can just use the literal text to replace.
  content = content.replace(
    /applyUniversalStyling\(wsCapex\);[\s\S]*?\/\/ \d+\. MONTHLY_P_AND_L/,
    `populateCapexAndDepreciation(wsCapex);\n\n  // WORKING_CAPITAL\n  const wsWc = wb.addWorksheet('WORKING_CAPITAL');\n  populateWorkingCapital(wsWc);\n\n  // MONTHLY_P_AND_L`
  );

  // Update PNL Headers
  content = content.replace(
    /wsPnl\.getCell\('B9'\)\.value = 'EBITDA';/,
    `wsPnl.getCell('B9').value = 'EBITDA';\n${pnlHeaders}`
  );

  // Update PNL Loop
  content = content.replace(
    /\[5,6,7,8,9\]\.forEach[\s\S]*?}\n/,
    `${pnlFormulas}  }\n`
  );

  // Update CASH FLOW and QUARTERLY SUMMARY
  content = content.replace(
    /applyUniversalStyling\(wsCf\);[\s\S]*?\/\/ \d+\. YEARLY_SUMMARY/,
    `populateMonthlyCashFlow(wsCf);\n\n  // QUARTERLY_SUMMARY\n  const wsQs = wb.addWorksheet('QUARTERLY_SUMMARY');\n  populateQuarterlySummary(wsQs);\n\n  // YEARLY_SUMMARY`
  );

  fs.writeFileSync(file, content);
};

processFile('scripts/model-builders/buildManufacturingModel.ts', 'Manufacturing & Hardware');
processFile('scripts/model-builders/buildSaaSModel.ts', 'SaaS & Software');
processFile('scripts/model-builders/buildServicesModel.ts', 'Services & Agency');
