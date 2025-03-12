import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';

let db: Database;

// Initialize database
export const initializeDatabase = async (): Promise<void> => {
    // 使用/app/data目录来存储数据库文件
    const dbPath = path.join(process.env.DB_PATH || '/app/data', 'database.sqlite');
    
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error opening database:', err);
            return;
        }
        console.log('Connected to SQLite database at', dbPath);
    });

    // Create tables if they don't exist
    await createTables();
};

// Helper function to run queries with promises
const runQuery = (query: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Create necessary tables
const createTables = async (): Promise<void> => {
    const createWalletTable = `
        CREATE TABLE IF NOT EXISTS wallet (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            address TEXT NOT NULL UNIQUE,
            private_key TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `;

    // 使用Promise化的runQuery函数来等待表创建完成
    try {
        await runQuery(createWalletTable);
        console.log('钱包表创建或已存在');
    } catch (error) {
        console.error('创建钱包表时出错:', error);
        throw error; // 向上传播错误，确保初始化失败时可以被捕获
    }
};

// Helper function to get results with promises
const getQuery = (query: string, params: any[] = []): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper function to get a single result with promises
const getOneQuery = (query: string, params: any[] = []): Promise<any> => {
    return new Promise((resolve, reject) => {
        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Database interface types
export type Wallet = {
    id?: number;
    address: string;
    private_key: string;
    created_at?: string;
};

// Create a new wallet
export async function createWallet(wallet: Wallet): Promise<{ success: boolean, id?: number }> {
    const query = `
        INSERT INTO wallet (address, private_key)
        VALUES (?, ?)
    `;
    try {
        const result: any = await runQuery(query, [wallet.address, wallet.private_key]);
        return { success: true, id: result.lastID };
    } catch (error) {
        console.error('Error creating wallet:', error);
        return { success: false };
    }
}

// Get wallet by address
export async function getWalletByAddress(address: string): Promise<Wallet | null> {
    const query = `
        SELECT id, address, private_key, created_at 
        FROM wallet 
        WHERE address = ?
    `;
    try {
        const result = await getOneQuery(query, [address]);
        return result || null;
    } catch (error) {
        console.error('Error getting wallet by address:', error);
        return null;
    }
}

// Get all wallets
export async function getWallets(): Promise<Wallet[]> {
    const query = `
        SELECT id, address, created_at 
        FROM wallet
    `;
    try {
        return await getQuery(query);
    } catch (error) {
        console.error('Error getting wallets:', error);
        return [];
    }
} 