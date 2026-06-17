import pg from 'pg';

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_CONNECTION_STRING;

const poolConfig = connectionString
  ? { connectionString }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT || 5432),
      database: process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE || 'frameworks',
      user: process.env.POSTGRES_USER || process.env.POSTGRES_USERNAME || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      max: 5,
    };

export const pool = new Pool(poolConfig);

export function getRequestIp(input) {
  const request = input?.request ?? input;
  const headers = request?.headers;

  if (!headers?.get) {
    return '';
  }

  const forwarded = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');
  const cfIp = headers.get('cf-connecting-ip');
  const flyIp = headers.get('fly-client-ip');

  return (
    forwarded?.split(',')[0]?.trim() ||
    realIp?.trim() ||
    cfIp?.trim() ||
    flyIp?.trim() ||
    ''
  );
}
