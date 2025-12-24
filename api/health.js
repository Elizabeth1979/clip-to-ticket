export default function handler(req, res) {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        apiKeyConfigured: !!process.env.GEMINI_API_KEY,
        environment: process.env.VERCEL_ENV || 'development'
    });
}
