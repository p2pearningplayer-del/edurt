import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM_CONFIG } from './config.ts';

let mysqlPool: mysql.Pool | null = null;
export let isMysqlConnected = false;

/**
 * Hostinger Business Plan Optimized MySQL Connection Pool:
 * - connectionLimit: 8 (keeps connections well under Hostinger user threshold)
 * - maxIdle: 2 & idleTimeout: 20000 (prevents idle connection hoarding)
 * - enableKeepAlive: true (avoids TCP timeout drops on remote MySQL)
 */
export function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: PLATFORM_CONFIG.mysql.host,
      port: PLATFORM_CONFIG.mysql.port,
      database: PLATFORM_CONFIG.mysql.database,
      user: PLATFORM_CONFIG.mysql.user,
      password: PLATFORM_CONFIG.mysql.password,
      waitForConnections: true,
      connectionLimit: 8,
      maxIdle: 2,
      idleTimeout: 20000,
      queueLimit: 100,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      multipleStatements: true,
    });
  }
  return mysqlPool;
}

/**
 * Query with automatic retry and exponential backoff for Hostinger shared/business environments
 */
export async function queryWithRetry<T = any>(
  sql: string,
  params: any[] = [],
  maxRetries = 3
): Promise<[T, mysql.FieldPacket[]]> {
  const pool = getMysqlPool();
  let attempt = 0;
  let lastError: any = null;

  while (attempt < maxRetries) {
    try {
      return (await pool.query(sql, params)) as [T, mysql.FieldPacket[]];
    } catch (err: any) {
      lastError = err;
      const isRetryable =
        err?.code === 'ECONNRESET' ||
        err?.code === 'PROTOCOL_CONNECTION_LOST' ||
        err?.code === 'ETIMEDOUT' ||
        err?.code === 'ER_CON_COUNT_ERROR' ||
        err?.code === 'ER_LOCK_WAIT_TIMEOUT';

      attempt++;
      if (isRetryable && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 200;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }

  throw lastError;
}

export async function initializeMysqlIfAvailable(): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const conn = await pool.getConnection();
    try {
      await conn.query('SET SESSION wait_timeout = 60, interactive_timeout = 60');
      const schemaPath = path.resolve(process.cwd(), 'database', 'schema.mysql.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        await conn.query(sql);
      }
      isMysqlConnected = true;
      console.log(
        `[LearnUp India DB] Connected to Hostinger MySQL database '${PLATFORM_CONFIG.mysql.database}' as '${PLATFORM_CONFIG.mysql.user}'`
      );
      return true;
    } finally {
      conn.release();
    }
  } catch (err) {
    isMysqlConnected = false;
    console.log(
      `[LearnUp India DB] MySQL host (${PLATFORM_CONFIG.mysql.host}) not reachable in current environment (${(err as Error).message}); using local SQLite relational engine synced with schema.mysql.sql.`
    );
    return false;
  }
}

export function getMysqlStatus() {
  return {
    host: PLATFORM_CONFIG.mysql.host,
    port: PLATFORM_CONFIG.mysql.port,
    database: PLATFORM_CONFIG.mysql.database,
    user: PLATFORM_CONFIG.mysql.user,
    connected: isMysqlConnected,
    schemaFile: 'database/schema.mysql.sql',
    poolConfig: {
      connectionLimit: 8,
      maxIdle: 2,
      idleTimeout: 20000,
    },
  };
}
