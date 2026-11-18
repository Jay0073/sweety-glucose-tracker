import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.nodeEnv === 'test' && env.testDatabaseUrl
    ? env.testDatabaseUrl
    : env.databaseUrl
});

