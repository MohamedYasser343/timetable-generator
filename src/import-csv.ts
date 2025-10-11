import { ImportService } from './modules/import/import.service';
import { AppDataSource } from '../ormconfig';

async function run() {
  // NOTE: ImportService will call AppDataSource.initialize() itself; but ensure connection not duplicated.
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
