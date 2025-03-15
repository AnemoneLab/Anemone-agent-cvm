import { Request, Response } from 'express';

/**
 * Handle chat messages sent to this CVM instance
 * @param req - Express request object
 * @param res - Express response object
 */
export const chatHandler = async (req: Request, res: Response) => {
    try {
        // Get message and roleId from request body
        const { message, roleId } = req.body;
        
        // Log the received message to console
        console.log(`[CVM Chat] Received message from roleId ${roleId}: ${message}`);
        
        // Generate current timestamp
        const timestamp = new Date().toISOString();
        
        // Currently return a fixed response with timestamp
        const response = {
            text: `This is a response from Agent CVM. I received your message: "${message}" at ${timestamp}`,
            roleId: roleId,
            timestamp: timestamp
        };
        
        // Return response
        return res.status(200).json({ 
            success: true, 
            response 
        });
    } catch (error) {
        console.error('[CVM Chat] Error processing chat message:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
}; 