import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM_CONFIG } from './config.ts';

let mysqlPool: mysql.Pool | null = null;
export let isMysqlConnected = false;

export function getMysqlPool(): mysql.Pool {
  if (!mysqlPool) {
    mysqlPool = mysql.createPool({
      host: PLATFORM_CONFIG.mysql.host,
      port: PLATFORM_CONFIG.mysql.port,
      database: PLATFORM_CONFIG.mysql.database,
      user: PLATFORM_CONFIG.mysql.user,
      password: PLATFORM_CONFIG.mysql.password,
      waitForConnections: true,
      connectionLimit: PLATFORM_CONFIG.mysql.connectionLimit,
      multipleStatements: true,
    });
  }
  return mysqlPool;
}

export async function initializeMysqlIfAvailable(): Promise<boolean> {
  try {
    const pool = getMysqlPool();
    const conn = await pool.getConnection();
    try {
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
  };
}

