import { Request, Response } from 'express';
import { getProfile, setProfile } from '../db/database';

/**
 * 设置Agent在Sui链上的Role ID和Package ID
 * 只有在配置不存在时才能设置，一旦设置则不可修改
 */
export const setProfileHandler = async (req: Request, res: Response) => {
    try {
        const { role_id, package_id } = req.body;
        
        // 验证参数
        if (!role_id || !package_id) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数 role_id 或 package_id'
            });
        }
        
        // 设置配置文件
        const result = await setProfile({
            role_id,
            package_id
        });
        
        if (result.success) {
            return res.status(201).json({
                success: true,
                message: result.message,
                id: result.id
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }
    } catch (error) {
        console.error('设置配置文件时出错:', error);
        return res.status(500).json({
            success: false,
            message: '设置配置文件时发生内部服务器错误'
        });
    }
};

/**
 * 获取Agent配置信息
 */
export const getProfileHandler = async (req: Request, res: Response) => {
    try {
        const profile = await getProfile();
        
        if (profile) {
            return res.status(200).json({
                success: true,
                profile: {
                    role_id: profile.role_id,
                    package_id: profile.package_id,
                    created_at: profile.created_at,
                    updated_at: profile.updated_at
                }
            });
        } else {
            return res.status(404).json({
                success: false,
                message: '未找到配置文件数据'
            });
        }
    } catch (error) {
        console.error('获取配置文件时出错:', error);
        return res.status(500).json({
            success: false,
            message: '获取配置文件时发生内部服务器错误'
        });
    }
}; 