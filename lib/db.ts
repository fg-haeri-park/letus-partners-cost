import { Pool } from 'pg'

const SCHEMA = process.env.DB_SCHEMA ?? 'app_260612_shjx'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
    })
  }
  return pool
}

// 쿼리 실행 헬퍼 — search_path를 전용 스키마로 고정
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect()
  try {
    await client.query(`SET search_path = ${SCHEMA}, public`)
    const result = await client.query(sql, params)
    return result.rows as T[]
  } finally {
    client.release()
  }
}

// 단건 조회
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}
