import buildSaaSModel from './buildSaaSModel.js';
import buildManufacturingModel from './buildManufacturingModel.js';
import buildServicesModel from './buildServicesModel.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAll() {
  console.log('Generating Master Excel Blueprints with Dynamic Engines...');
  
  const outDir = path.resolve(__dirname, '../../assets/templates');
  
  await buildSaaSModel(outDir);
  await buildManufacturingModel(outDir);
  await buildServicesModel(outDir);
  
  console.log('🎉 All venture models generated successfully.');
}

runAll().catch(console.error);
