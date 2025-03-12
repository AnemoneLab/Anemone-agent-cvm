import { Request, Response } from 'express';
import { getWallets } from '../db/database';

// 获取唯一钱包地址
export const getWalletAddressHandler = async (req: Request, res: Response) => {
    try {
        const wallets = await getWallets();
        
        if (wallets.length === 0) {
            return res.status(404).json({ error: '钱包未初始化' });
        }
        
        // 只返回第一个钱包的地址（服务中只应该有一个钱包）
        res.json({
            success: true,
            address: wallets[0].address,
            created_at: wallets[0].created_at
        });
    } catch (error) {
        console.error('Error in getWalletAddress:', error);
        res.status(500).json({ error: '获取钱包地址时出错' });
    }
}; 