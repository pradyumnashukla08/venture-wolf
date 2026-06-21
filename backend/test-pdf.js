import pdf from 'pdf-parse';
import fs from 'fs';

async function testPdf() {
  try {
    const p = require('path').resolve('./test.pdf');
    if (!fs.existsSync(p)) {
      console.log('creating dummy pdf');
      // Create a minimal PDF file manually just to test the parser
      const dummyPdf = Buffer.from('%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n149\n%EOF\n');
      fs.writeFileSync(p, dummyPdf);
    }
    const buffer = fs.readFileSync(p);
    const data = await pdf(buffer);
    console.log('PDF Text:', data.text);
  } catch (e) {
    console.error('Error:', e);
  }
}
testPdf();
