import ExcelJS from 'exceljs';
import fs from 'fs';

async function run() {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile('d:\\portfolio\\pitchy\\Narayan Dairy Project—Financial Forecast V1.4 (1) (1).xlsx');
    
    let md = '# Excel Analysis\n\n';
    
    wb.worksheets.forEach(ws => {
      md += `## Sheet: ${ws.name}\n`;
      let count = 0;
      for(let r=1; r<=Math.min(ws.rowCount, 50); r++) {
        const row = ws.getRow(r);
        const rowVals = [];
        for(let c=1; c<=Math.min(ws.columnCount, 15); c++) {
           const cell = row.getCell(c);
           let val: any = cell.value;
           if (val && typeof val === 'object' && val.formula) {
              val = `[FORMULA: ${val.formula}]`;
           }
           rowVals.push(val ? val.toString().replace(/\n/g, ' ') : '');
        }
        if (rowVals.some(v => v !== '')) {
           md += `Row ${r}: ${rowVals.join(' | ')}\n`;
           count++;
        }
      }
      md += '\n';
    });
    
    fs.writeFileSync('d:\\portfolio\\pitchy\\backend\\excel_analysis.md', md);
    console.log('Analysis written to excel_analysis.md');
  } catch (err) {
    console.error(err);
  }
}
run();
