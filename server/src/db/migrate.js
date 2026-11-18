import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

export async function migrate(database = pool) {
  const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  await database.query(schema);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await migrate();
    console.log('Database schema is up to date.');
  } catch (error) {
    console.error('Database migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

