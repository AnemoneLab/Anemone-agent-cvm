import { Request, Response } from 'express';
import OpenAI from 'openai';
import { saveMessage, getRecentMessages, getConversationHistory, Message } from '../db/database';

/**
 * Handle chat messages sent to this CVM instance
 * @param req - Express request object
 * @param res - Express response object
 */
export const chatHandler = async (req: Request, res: Response) => {
    try {
        // Get message, roleId, and OpenAI parameters from request body
        const { message, roleId, userId, openai_api_key, openai_api_url } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: userId'
            });
        }
        
        // Log the received message to console
        console.log(`[CVM Chat] Received message from roleId ${roleId}, userId ${userId}: ${message}`);
        
        // Generate current timestamp
        const timestamp = new Date().toISOString();
        
        // Save the user message to history
        await saveMessage({
            user_id: userId,
            role: 'user',
            content: message,
            timestamp: timestamp
        });
        
        let responseText;
        
        // If OpenAI API key is provided, use OpenAI API
        if (openai_api_key) {
            try {
                // Initialize OpenAI client with provided credentials
                const openai = new OpenAI({
                    apiKey: openai_api_key,
                    baseURL: openai_api_url // Will use default if not provided
                });
                
                // Get recent conversation history
                const historyEntries = await getConversationHistory(userId, 5);
                
                // Create messages array with system message + history + current message
                const messages = [
                    { role: "system", content: "You are a helpful assistant." } as const,
                    ...historyEntries.map(entry => ({
                        role: entry.role as "user" | "assistant" | "system",
                        content: entry.content
                    })),
                    { role: "user", content: message } as const
                ];
                
                // Call OpenAI API
                const completion = await openai.chat.completions.create({
                    messages,
                    model: "gpt-4o",
                });
                
                // Extract response from OpenAI
                responseText = completion.choices[0]?.message?.content || 
                    "无法从OpenAI获取有效回复";
                
                console.log(`[CVM Chat] OpenAI response received: ${responseText.substring(0, 100)}...`);
            } catch (openaiError: any) {
                console.error('[CVM Chat] OpenAI API error:', openaiError);
                responseText = `OpenAI API调用失败: ${openaiError.message || '未知错误'}`;
            }
        } else {
            // Fallback to default response if no API key provided
            responseText = `This is a response from Agent CVM. I received your message: "${message}" at ${timestamp}`;
        }
        
        // Save the assistant response to history
        await saveMessage({
            user_id: userId,
            role: 'assistant',
            content: responseText,
            timestamp: new Date().toISOString()
        });
        
        // Prepare response object
        const response = {
            text: responseText,
            roleId: roleId,
            userId: userId,
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

/**
 * Get chat history for a specific user
 * @param req - Express request object
 * @param res - Express response object
 */
export const historyHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId as string;
        const limit = parseInt(req.query.limit as string || '5');
        const beforeTimestamp = req.query.before as string;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: userId'
            });
        }
        
        // Get messages from the database
        const messages = await getRecentMessages(userId, limit, beforeTimestamp);
        
        // Return the messages
        return res.status(200).json({
            success: true,
            messages: messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                message_type: msg.message_type,
                metadata: msg.metadata ? JSON.parse(msg.metadata) : null
            }))
        });
    } catch (error) {
        console.error('[CVM Chat] Error retrieving chat history:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
}; 