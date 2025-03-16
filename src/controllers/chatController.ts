import { Request, Response } from 'express';
import OpenAI from 'openai';

/**
 * Handle chat messages sent to this CVM instance
 * @param req - Express request object
 * @param res - Express response object
 */
export const chatHandler = async (req: Request, res: Response) => {
    try {
        // Get message, roleId, and OpenAI parameters from request body
        const { message, roleId, openai_api_key, openai_api_url } = req.body;
        
        // Log the received message to console
        console.log(`[CVM Chat] Received message from roleId ${roleId}: ${message}`);
        
        // Generate current timestamp
        const timestamp = new Date().toISOString();
        
        let responseText;
        
        // If OpenAI API key is provided, use OpenAI API
        if (openai_api_key) {
            try {
                // Initialize OpenAI client with provided credentials
                const openai = new OpenAI({
                    apiKey: openai_api_key,
                    baseURL: openai_api_url // Will use default if not provided
                });
                
                // Call OpenAI API
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: message }
                    ],
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
        
        // Prepare response object
        const response = {
            text: responseText,
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