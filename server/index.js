import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy - required for Render/Railway to get real IP addresses
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));


// Rate limiting: 10 requests per hour per IP
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    apiKeyConfigured: !!process.env.GEMINI_API_KEY
  });
});

// Video analysis endpoint
app.post('/api/analyze-video', async (req, res) => {
  try {
    const { videoBase64, mimeType, systemInstruction, responseSchema } = req.body;

    if (!videoBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields: videoBase64, mimeType' });
    }

    console.log(`[${new Date().toISOString()}] Analyzing video (${mimeType})...`);
    const startTime = Date.now();

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: videoBase64,
              mimeType: mimeType,
            },
          },
          {
            text: 'Perform an exhaustive accessibility audit using Deque WCAG 2.2 and Axe-core 4.11 standards. Provide the transcript and structured issues list.',
          },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema
      },
    });

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Extract token usage from response (if available)
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    // Calculate costs (Gemini 3 Flash pricing)
    const FLASH_INPUT_PER_1M = 0.075;
    const FLASH_OUTPUT_PER_1M = 0.30;
    const inputCost = (inputTokens / 1_000_000) * FLASH_INPUT_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * FLASH_OUTPUT_PER_1M;
    const totalCost = inputCost + outputCost;

    console.log(`[${new Date().toISOString()}] Analysis complete - ${processingTimeMs}ms, ${inputTokens} input tokens, ${outputTokens} output tokens, $${totalCost.toFixed(4)}`);

    res.json({
      text: response.text,
      metadata: {
        systemPrompt: systemInstruction,
        model: 'gemini-3-flash-preview',
        processingTimeMs,
        costBreakdown: {
          inputTokens,
          outputTokens,
          videoSeconds: 0, // Could be calculated from video metadata if needed
          inputCost,
          outputCost,
          videoCost: 0,
          totalCost
        },
        stages: [
          { name: 'Video Upload', startTime, endTime: startTime + 100, status: 'complete' },
          { name: 'AI Analysis', startTime: startTime + 100, endTime: endTime - 100, status: 'complete' },
          { name: 'Report Generation', startTime: endTime - 100, endTime, status: 'complete' }
        ],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: error.message || 'Analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Mixed media analysis endpoint (video + images)
app.post('/api/analyze-media', async (req, res) => {
  try {
    const { video, images, systemInstruction, responseSchema } = req.body;

    // Validate that we have at least some media
    if (!video && (!images || images.length === 0)) {
      return res.status(400).json({ error: 'Missing required fields: either video or images must be provided' });
    }

    const hasVideo = !!video;
    const imageCount = images?.length || 0;
    console.log(`[${new Date().toISOString()}] Analyzing media: ${hasVideo ? 'video' : 'no video'}, ${imageCount} image(s)...`);
    const startTime = Date.now();

    // Build multi-part content
    const parts = [];

    // Add video if present
    if (video) {
      parts.push({
        inlineData: {
          data: video.base64,
          mimeType: video.mimeType,
        },
      });
    }

    // Add each image with optional comment context
    if (images && images.length > 0) {
      images.forEach((img, i) => {
        parts.push({
          inlineData: {
            data: img.base64,
            mimeType: img.mimeType,
          },
        });
        // Add comment as context text if provided
        if (img.comment && img.comment.trim()) {
          parts.push({
            text: `Screenshot ${i + 1} context from user: "${img.comment.trim()}"`,
          });
        }
      });
    }

    // Add the analysis prompt
    parts.push({
      text: 'Perform an exhaustive accessibility audit using Deque WCAG 2.2 and Axe-core 4.11 standards. Provide the transcript (if video) and structured issues list.',
    });

    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts,
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema
      },
    });

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Extract token usage from response (if available)
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    // Calculate costs (Gemini 3 Flash pricing)
    const FLASH_INPUT_PER_1M = 0.075;
    const FLASH_OUTPUT_PER_1M = 0.30;
    const inputCost = (inputTokens / 1_000_000) * FLASH_INPUT_PER_1M;
    const outputCost = (outputTokens / 1_000_000) * FLASH_OUTPUT_PER_1M;
    const totalCost = inputCost + outputCost;

    console.log(`[${new Date().toISOString()}] Analysis complete - ${processingTimeMs}ms, ${inputTokens} input tokens, ${outputTokens} output tokens, $${totalCost.toFixed(4)}`);

    res.json({
      text: response.text,
      metadata: {
        systemPrompt: systemInstruction,
        model: 'gemini-3-flash-preview',
        processingTimeMs,
        costBreakdown: {
          inputTokens,
          outputTokens,
          videoSeconds: 0,
          imageCount,
          inputCost,
          outputCost,
          videoCost: 0,
          totalCost
        },
        stages: [
          { name: 'Media Upload', startTime, endTime: startTime + 100, status: 'complete' },
          { name: 'AI Analysis', startTime: startTime + 100, endTime: endTime - 100, status: 'complete' },
          { name: 'Report Generation', startTime: endTime - 100, endTime, status: 'complete' }
        ],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Media analysis error:', error);
    res.status(500).json({
      error: error.message || 'Media analysis failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Chat session storage (in-memory for now)
const chatSessions = new Map();

// Create chat session endpoint
app.post('/api/create-chat', async (req, res) => {
  try {
    const { systemInstruction, context } = req.body;

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
    chatSessions.set(sessionId, chat);

    // Clean up old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [id, _] of chatSessions.entries()) {
      const timestamp = parseInt(id.split('_')[1]);
      if (timestamp < oneHourAgo) {
        chatSessions.delete(id);
      }
    }

    console.log(`[${new Date().toISOString()}] Chat session created: ${sessionId}`);
    res.json({ sessionId });
  } catch (error) {
    console.error('Chat creation error:', error);
    res.status(500).json({
      error: error.message || 'Failed to create chat session',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Send chat message endpoint (streaming)
app.post('/api/chat/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;

    const chat = chatSessions.get(sessionId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat session not found or expired' });
    }

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`[${new Date().toISOString()}] Sending message to chat ${sessionId}...`);

    // Set up SSE headers for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const responseStream = await chat.sendMessageStream({ message });

    for await (const chunk of responseStream) {
      res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error('Chat message error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error.message || 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`🔒 ClipToTicket API Proxy running on port ${PORT}`);
  console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`🔑 API Key configured: ${!!process.env.GEMINI_API_KEY}`);
});
