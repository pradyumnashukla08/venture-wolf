const ExcelJS = require('exceljs');
const path = require('path');

async function readLabels() {
  const templatePath = path.join(process.cwd(), 'assets', 'templates', 'template_saas.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  
  const wsSummary = workbook.getWorksheet('YEARLY_SUMMARY');
  if (!wsSummary) {
    console.log("No YEARLY_SUMMARY");
    return;
  }
  
  const rowStart = 5;
  for (let i = 0; i < 14; i++) {
    const metricRow = rowStart + 1 + i;
    const metricLabel = wsSummary.getCell(`B${metricRow}`).value;
    console.log(`Metric ${i+1}: ${metricLabel}`);
  }
}

readLabels().catch(console.error);
