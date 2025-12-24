import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Note: Vercel serverless functions are stateless
// Chat sessions won't persist between invocations
// For production, consider using Vercel KV or making chat stateless

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { systemInstruction } = req.body;

        console.log(`[${new Date().toISOString()}] Creating chat session...`);

        const chat = genAI.chats.create({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction,
                tools: [{ googleSearch: {} }]
            }
        });

        // Generate session ID
        const sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Note: In serverless, we can't store the chat object
        // The frontend will need to send full context with each message
        // or we need to use Vercel KV for persistence

        console.log(`[${new Date().toISOString()}] Chat session created: ${sessionId}`);
        res.status(200).json({ sessionId });
    } catch (error) {
        console.error('Chat creation error:', error);
        res.status(500).json({
            error: error.message || 'Failed to create chat session'
        });
    }
}
