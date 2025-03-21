import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

let db: Database | null = null;

// 数据目录路径
const DATA_DIR = '/app/data';
const DB_FILE = path.join(DATA_DIR, 'anemone.db');

/**
 * 设置数据库连接
 */
export async function setupDatabase(): Promise<void> {
  try {
    // 确保数据目录存在
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`数据目录已创建: ${DATA_DIR}`);
    }
    
    // 使用文件数据库进行持久化存储
    db = await open({
      filename: DB_FILE,
      driver: sqlite3.Database
    });
    
    console.log(`数据库连接已建立: ${DB_FILE}`);
    
    // 创建必要的表
    await createTables();
    
    console.log('数据库表已创建');
  } catch (error) {
    console.error('数据库设置失败:', error);
    throw error;
  }
}

/**
 * 创建必要的数据库表
 */
async function createTables(): Promise<void> {
  // 创建钱包表 - 与旧版本保持一致
  await db?.exec(`
    CREATE TABLE IF NOT EXISTS wallet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      address TEXT NOT NULL UNIQUE,
      private_key TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // 创建消息历史表
  await db?.exec(`
    CREATE TABLE IF NOT EXISTS message_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message_type TEXT DEFAULT 'text',
      metadata TEXT,
      conversation_round INTEGER,
      related_message_id INTEGER
    )
  `);
  
  // 检查是否需要添加新列（适用于已有的数据库）
  try {
    // 检查message_history表是否存在conversation_round列
    const columns = await db?.all("PRAGMA table_info(message_history)");
    const hasConversationRound = columns && Array.isArray(columns) && columns.some((col: any) => col.name === 'conversation_round');
    
    if (!hasConversationRound) {
      console.log('正在添加conversation_round列');
      await db?.exec("ALTER TABLE message_history ADD COLUMN conversation_round INTEGER");
    }
    
    // 检查message_history表是否存在related_message_id列
    const hasRelatedMessageId = columns && Array.isArray(columns) && columns.some((col: any) => col.name === 'related_message_id');
    
    if (!hasRelatedMessageId) {
      console.log('正在添加related_message_id列');
      await db?.exec("ALTER TABLE message_history ADD COLUMN related_message_id INTEGER");
    }
  } catch (error) {
    console.error('检查或添加新列时出错:', error);
  }
  
  // 创建配置文件表
  await db?.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id TEXT UNIQUE,
      package_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/**
 * 获取数据库连接
 */
export function getDatabase(): Database | null {
  return db;
}

/**
 * 执行SQL查询
 * @param query SQL查询语句
 * @param params 参数
 */
export async function runQuery(query: string, params: any[] = []): Promise<any> {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  
  return await db.run(query, ...params);
}

/**
 * 执行SQL查询并获取结果
 * @param query SQL查询语句
 * @param params 参数
 */
export async function getQuery(query: string, params: any[] = []): Promise<any[]> {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  
  return await db.all(query, ...params);
}

/**
 * 执行SQL查询并获取单个结果
 * @param query SQL查询语句
 * @param params 参数
 */
export async function getOneQuery(query: string, params: any[] = []): Promise<any> {
  if (!db) {
    throw new Error('数据库未初始化');
  }
  
  return await db.get(query, ...params);
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
    console.log('数据库连接已关闭');
  }
} 