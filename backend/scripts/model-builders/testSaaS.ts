import buildSaaSModel from './buildSaaSModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const outDir = path.resolve(__dirname, '../../../assets/templates');
  await buildSaaSModel(outDir);
}
run();
