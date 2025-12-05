import { ImportService } from './modules/import/import.service';
import { AppDataSource } from '../ormconfig';

async function run() {
  // Initialize the data source first
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const importer = new ImportService();
  const res = await importer.importCsvData();
  console.log('Import result:', res);
  // make sure to destroy connection
  try { await AppDataSource.destroy(); } catch (e) {}
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
