import { PDFParse } from 'pdf-parse';
import * as xlsx from 'xlsx';

export const parsePDF = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const nodeBuffer = Buffer.from(buffer);
    if (!nodeBuffer || nodeBuffer.length === 0) {
      throw new Error('PDF buffer is empty or corrupted');
    }

    const parser = new PDFParse({ data: new Uint8Array(nodeBuffer) });
    const data = await parser.getText();
    await parser.destroy(); // Optional but good for cleanup

    if (!data.text || data.text.trim().length === 0) {
      return '[Warning: PDF extraction yielded empty text. Document may be image-based or protected.]';
    }
    
    return data.text.trim();
  } catch (error: any) {
    console.error('PDF Parsing failed:', error);
    throw new Error('Failed to extract text from PDF document: ' + error.message);
  }
};

export const parseExcel = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const nodeBuffer = Buffer.from(buffer);
    if (!nodeBuffer || nodeBuffer.length === 0) {
      throw new Error('Excel buffer is empty or corrupted');
    }

    const workbook = xlsx.read(nodeBuffer, { type: 'buffer' });
    let combinedText = '';

    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return;

      const json = xlsx.utils.sheet_to_json(sheet, { defval: '' });
      if (json.length > 0) {
        combinedText += `\n--- Sheet: ${sheetName} ---\n`;
        // Convert to highly readable CSV/tabular string format for LLM
        combinedText += xlsx.utils.sheet_to_csv(sheet) + '\n';
      }
    });

    if (!combinedText || combinedText.trim().length === 0) {
      return '[Warning: Excel extraction yielded no tabular data.]';
    }

    return combinedText.trim();
  } catch (error: any) {
    console.error('Excel Parsing failed:', error);
    throw new Error('Failed to extract text from Excel document: ' + error.message);
  }
};
