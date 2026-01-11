import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODELS } from './config.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
    // CORS headers
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
        const { videoBase64, mimeType, systemInstruction, responseSchema } = req.body;

        if (!videoBase64 || !mimeType) {
            return res.status(400).json({ error: 'Missing required fields: videoBase64, mimeType' });
        }

        console.log(`[${new Date().toISOString()}] Analyzing video (${mimeType})...`);

        const response = await genAI.models.generateContent({
            model: GEMINI_MODELS.ANALYSIS,
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: videoBase64,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: `Perform an exhaustive accessibility audit using Deque WCAG 2.2 and Axe-core 4.11 standards.

TRANSCRIPT FORMAT (STRICT - DO NOT DEVIATE):
- Each speaker turn MUST be on its OWN LINE (separated by newline characters)
- Format: SpeakerName [MM:SS]: Message
- Use actual newline characters to separate each speaker turn
- Do NOT put multiple speaker turns on the same line
- Do NOT output as a continuous paragraph

CORRECT EXAMPLE:
Narrator [00:00]: Welcome to this demo.
User [00:05]: I'm going to test the navigation.
Narrator [00:12]: The focus moves to the menu.

INCORRECT (DO NOT DO THIS):
Narrator [00:00]: Welcome. User [00:05]: Testing. Narrator [00:12]: Focus moves.

Provide the complete transcript and structured issues list.`,
                    },
                ],
            },
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema
            },
        });

        console.log(`[${new Date().toISOString()}] Analysis complete`);
        res.status(200).json({ text: response.text });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: error.message || 'Analysis failed'
        });
    }
}
