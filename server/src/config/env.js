import dotenv from 'dotenv';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://sweety:sweety@127.0.0.1:5433/sweety',
  testDatabaseUrl: process.env.TEST_DATABASE_URL,
  jwtSecret: process.env.NODE_ENV === 'test'
    ? (process.env.JWT_SECRET ?? 'test-secret-only')
    : required('JWT_SECRET'),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  appTimeZone: process.env.APP_TIME_ZONE ?? 'Asia/Kolkata'
};

