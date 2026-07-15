import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the archetypes we want to generate
const archetypes = ['SAAS', 'MANUFACTURING', 'SERVICES'];

// Helper to set up the universal Venture Wolf styling
const styleHeaderCell = (cell: ExcelJS.Cell) => {
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' } // Dark Navy
  };
  cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  cell.alignment = { horizontal: 'center' };
};

async function generateTemplate(archetype: string, outputDir: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Venture Wolf Dynamic Engine';

  // ─── 1. COVER SHEET ───────────────────────────────────────────
  const coverSheet = workbook.addWorksheet('COVER', { views: [{ showGridLines: false }] });
  coverSheet.getColumn('B').width = 45;
  coverSheet.getCell('B3').value = 'Venture Wolf — Financial Model Blueprint';
  coverSheet.getCell('B3').font = { size: 18, bold: true, color: { argb: 'FF0F172A' } };
  coverSheet.getCell('B4').value = `Archetype: ${archetype} (Grounded Market Reality Engine)`;
  coverSheet.getCell('B4').font = { size: 12, italic: true };

  // ─── 2. ASSUMPTIONS SHEET ─────────────────────────────────────
  const assumptionsSheet = workbook.addWorksheet('ASSUMPTIONS');
  assumptionsSheet.getColumn('B').width = 30;
  
  assumptionsSheet.getCell('B2').value = 'Financial Model Core Assumptions';
  assumptionsSheet.getCell('B2').font = { size: 14, bold: true };

  const assumptionHeaders = ['Metric / Variable', 'Worst Case', 'Base Case', 'Best Case'];
  assumptionHeaders.forEach((text, index) => {
    const cell = assumptionsSheet.getCell(4, index + 2); // Start at B4
    cell.value = text;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF38BDF8' } }; // Light Blue
    cell.font = { bold: true };
  });

  // ─── 3. ARCHETYPE SPECIFIC SHEETS ─────────────────────────────
  if (archetype === 'SAAS') {
    workbook.addWorksheet('SUBSCRIBER_ENGINE');
    workbook.addWorksheet('MRR_CAC_ENGINE');
  } else if (archetype === 'MANUFACTURING') {
    workbook.addWorksheet('PRODUCTION_ENGINE');
    workbook.addWorksheet('BOM_COGS_ENGINE');
  } else if (archetype === 'SERVICES') {
    workbook.addWorksheet('HEADCOUNT_CAPACITY_ENGINE');
    workbook.addWorksheet('BILLABLE_HOURS_ENGINE');
  }

  // Add universal P&L and Cash Flow placeholders
  workbook.addWorksheet('P_AND_L');
  workbook.addWorksheet('CASH_FLOW');

  // ─── 4. YEARLY SUMMARY SHEET (CRITICAL FOR FRONTEND) ─────────
  const summarySheet = workbook.addWorksheet('YEARLY_SUMMARY');
  summarySheet.getColumn('B').width = 30;

  summarySheet.getCell('B2').value = 'Dynamic Annual Financial Summary';
  summarySheet.getCell('B2').font = { size: 14, bold: true };

  const summaryHeaders = ['Particulars', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'];
  summaryHeaders.forEach((text, index) => {
    const cell = summarySheet.getCell(4, index + 2);
    cell.value = text;
    styleHeaderCell(cell);
  });

  const rowLabels = [
    'Total Revenue', 'Total COGS', 'Gross Profit', 'Gross Margin %',
    'Total Operating Expenses', 'EBITDA', 'EBITDA %', 'Depreciation', 'Net Income'
  ];

  rowLabels.forEach((label, index) => {
    const cell = summarySheet.getCell(5 + index, 2);
    cell.value = label;
    cell.font = { bold: true };
  });

  // ─── SAVE FILE ────────────────────────────────────────────────
  const filePath = path.join(outputDir, `template_${archetype.toLowerCase()}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  console.log(`✅ Generated: ${filePath}`);
}

async function runGenerator() {
  const outputDir = path.join(__dirname, '../assets/templates');
  
  // Ensure the directory exists safely
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Generating Master Excel Blueprints...');
  for (const archetype of archetypes) {
    await generateTemplate(archetype, outputDir);
  }
  console.log('🎉 All templates generated successfully.');
}

runGenerator();
