import pg from 'pg';
const { Pool } = pg;

export const supabasePool = new Pool({
  host: process.env.SUPABASE_HOST || 'db.szdovfcrwypgwpzwnicz.supabase.co',
  port: Number(process.env.SUPABASE_PORT) || 5432,
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD || 'MEDIBRIDGE2AI£1234',
  database: process.env.SUPABASE_DB || 'postgres',
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

export async function querySupabase<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const client = await supabasePool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}
