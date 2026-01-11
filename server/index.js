import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { GEMINI_MODELS, getModelPricing } from './config.js';

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

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Extract token usage from response (if available)
    const usageMetadata = response.usageMetadata || {};
    const inputTokens = usageMetadata.promptTokenCount || 0;
    const outputTokens = usageMetadata.candidatesTokenCount || 0;

    // Calculate costs using centralized pricing
    const pricing = getModelPricing(GEMINI_MODELS.ANALYSIS);
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
    const totalCost = inputCost + outputCost;

    console.log(`[${new Date().toISOString()}] Analysis complete - ${processingTimeMs}ms, ${inputTokens} input tokens, ${outputTokens} output tokens, $${totalCost.toFixed(4)}`);

    res.json({
      text: response.text,
      metadata: {
        systemPrompt: systemInstruction,
        model: GEMINI_MODELS.ANALYSIS,
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

// Unified media analysis endpoint
app.post('/api/analyze-media', async (req, res) => {
  try {
    const { media, systemInstruction, responseSchema } = req.body;

    // Validate that we have at least some media
    if (!media || !Array.isArray(media) || media.length === 0) {
      return res.status(400).json({ error: 'Missing required field: media array must be provided and non-empty' });
    }

    console.log(`[${new Date().toISOString()}] Analyzing ${media.length} media item(s)...`);
    const startTime = Date.now();

    // 1. Separate media types
    const timeBasedMedia = media.filter(item => item.type === 'video' || item.type === 'audio');
    const staticMedia = media.filter(item => item.type === 'image' || item.type === 'pdf');

    console.log(`[${new Date().toISOString()}] Split: ${timeBasedMedia.length} time-based, ${staticMedia.length} static`);

    // Helper to format error messages
    const formatError = (err) => {
      let msg = err.message || String(err);
      // Try to parse if it's a JSON string (common in Google SDK errors)
      try {
        if (msg.startsWith('{') || msg.startsWith('[')) {
          const parsed = JSON.parse(msg);
          if (parsed.error && parsed.error.message) {
            return parsed.error.message; // Extract the clean message
          }
        }
      } catch (e) { /* ignore parse error */ }

      return msg;
    };

    // 2. Prepare Helper for Single Item Analysis (Time-Based)
    const analyzeTimeBasedItem = async (item, index, originalIndex) => {
      try {
        const itemLabel = item.type === 'video' ? `Video ${index + 1}` : `Audio ${index + 1}`;
        console.log(`[${new Date().toISOString()}] Processing independent ${itemLabel}...`);

        const parts = [];

        // Add the file content
        if (item.base64 && item.mimeType) {
          parts.push({
            inlineData: {
              data: item.base64,
              mimeType: item.mimeType,
            },
          });
        }

        // Add context/comment if provided
        if (item.comment && item.comment.trim()) {
          parts.push({
            text: `[Context for this ${item.type}]: "${item.comment.trim()}"`,
          });
        }

        // Add specific instruction for this item
        parts.push({
          text: `Analyze this ${item.type} specifically. Perform an exhaustive accessibility audit using Deque WCAG 2.2 and Axe-core 4.11 standards.

CRITICAL TRANSCRIPT REQUIREMENT:
- You MUST provide a COMPLETE verbatim transcript of ALL spoken audio in this file
- Transcribe EVERY word spoken from start to finish
- Do NOT use placeholder text like "Transcription will start soon" or "No transcript available"
- If there is audio content, transcribe it completely

TRANSCRIPT FORMAT (STRICT - DO NOT DEVIATE):
- Each speaker turn MUST be on its OWN LINE (separated by newline characters)
- Format: SpeakerName [MM:SS]: Message
- Use actual newline characters (\\n) to separate each speaker turn
- Do NOT put multiple speaker turns on the same line
- Do NOT output as a continuous paragraph

CORRECT EXAMPLE:
Narrator [00:00]: Welcome to this demo.
User [00:05]: I'm going to test the navigation.
Narrator [00:12]: The focus moves to the menu.

INCORRECT (DO NOT DO THIS):
Narrator [00:00]: Welcome. User [00:05]: Testing. Narrator [00:12]: Focus moves.

Timestamps must be relative to the start of THIS file, starting at [00:00].
Provide the full transcript and structured issues list.`,
        });


        const response = await genAI.models.generateContent({
          model: GEMINI_MODELS.ANALYSIS,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
          },
        });

        // FIX: response.text is a property, not a function in this version
        const textResponse = response.text;
        const usage = response.usageMetadata || {};

        // Parse issues to inject video_index
        let resultIssues = [];
        try {
          const parsed = JSON.parse(textResponse);
          if (parsed.issues && Array.isArray(parsed.issues)) {
            resultIssues = parsed.issues.map(issue => ({
              ...issue,
              video_index: originalIndex // Map back to the original media array index
            }));
          }
        } catch (e) {
          console.warn(`Failed to parse JSON for ${itemLabel}`, e);
        }

        // Parse transcript
        let transcript = "";
        try {
          const parsed = JSON.parse(textResponse);
          if (parsed.transcript) {
            transcript = parsed.transcript;
            console.log(`[${new Date().toISOString()}] ${itemLabel} transcript extracted (${transcript.length} chars, first 100: "${transcript.substring(0, 100)}...")`);
          } else {
            console.warn(`[${new Date().toISOString()}] ${itemLabel} - No transcript field in AI response`);
          }
        } catch (e) {
          // Already logged above
        }


        return {
          success: true,
          text: textResponse,
          transcript: transcript, // Return the extracted transcript
          issues: resultIssues,
          usage: {
            inputTokens: usage.promptTokenCount || 0,
            outputTokens: usage.candidatesTokenCount || 0
          }
        };

      } catch (error) {
        console.error(`Error analyzing ${item.type} (index ${originalIndex}):`, error); // Log full error
        return {
          success: false,
          error: formatError(error),
          originalIndex
        };
      }
    };

    // 3. Prepare Helper for Static Media Batch
    const analyzeStaticBatch = async (items) => {
      if (items.length === 0) return null;

      try {
        console.log(`[${new Date().toISOString()}] Processing ${items.length} static items...`);
        const parts = [];

        items.forEach((item, idx) => {
          if (item.base64 && item.mimeType) {
            parts.push({
              inlineData: {
                data: item.base64,
                mimeType: item.mimeType,
              },
            });
          }
          if (item.comment && item.comment.trim()) {
            parts.push({
              text: `[Image/PDF ${idx + 1} Context]: "${item.comment.trim()}"`,
            });
          }
        });

        parts.push({
          text: 'Perform an exhaustive accessibility audit on these static assets using Deque WCAG 2.2 and Axe-core 4.11 standards. Provide a structured issues list.',
        });

        const response = await genAI.models.generateContent({
          model: GEMINI_MODELS.ANALYSIS,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema
          },
        });

        // FIX: response.text is a property
        const textResponse = response.text;
        const usage = response.usageMetadata || {};

        // Parse to get issues (for consistency, though static items don't strictly need video_index)
        // We can map them to the first static item's original index or leave video_index undefined
        let resultIssues = [];
        try {
          const parsed = JSON.parse(textResponse);
          if (parsed.issues && Array.isArray(parsed.issues)) {
            resultIssues = parsed.issues;
          }
        } catch (e) {
          console.warn(`Failed to parse JSON for static batch`, e);
        }

        return {
          success: true,
          text: textResponse,
          issues: resultIssues,
          usage: {
            inputTokens: usage.promptTokenCount || 0,
            outputTokens: usage.candidatesTokenCount || 0
          }
        };

      } catch (error) {
        console.error('Error analyzing static batch:', error);
        return { success: false, error: formatError(error) };
      }
    };

    // 4. Execute Requests
    // SWITCH: Sequential execution to avoid 429 Rate Limits
    const timeBasedResults = [];
    for (let i = 0; i < timeBasedMedia.length; i++) {
      const item = timeBasedMedia[i];
      const originalIndex = media.indexOf(item);
      // Add a small delay between requests if it's not the first one, to be nice to the API
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const result = await analyzeTimeBasedItem(item, i, originalIndex);
      timeBasedResults.push(result);
    }

    // Process static media separately (can be parallel to video flow or sequential)
    // We'll keep it sequential to be safe
    const staticResult = staticMedia.length > 0 ? await analyzeStaticBatch(staticMedia) : null;

    // 5. Aggregate Results
    let allIssues = [];
    let aggregatedText = '';
    let aggregatedTranscript = ''; // Combined transcript for backward compatibility
    let allTranscripts = []; // Per-video transcripts array
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Process time-based results
    timeBasedResults.forEach((res, i) => {
      if (res.success) {
        allIssues = [...allIssues, ...res.issues];
        aggregatedText += `\n--- Analysis for Time-Based Media ${i + 1} ---\n ${res.text}`;

        // Aggregate transcripts
        if (res.transcript) {
          allTranscripts.push(res.transcript); // Add to per-video array
          if (timeBasedMedia.length > 1) {
            aggregatedTranscript += `\n\n--- Video ${i + 1} Transcript ---\n${res.transcript}`;
          } else {
            aggregatedTranscript += res.transcript; // Keep clean for single video
          }
        } else {
          allTranscripts.push(""); // Empty transcript for this video
        }

        totalInputTokens += res.usage.inputTokens;
        totalOutputTokens += res.usage.outputTokens;
      } else {
        // Add empty transcript for failed video
        allTranscripts.push("");
        aggregatedText += `\n--- Analysis for Time-Based Media ${i + 1} FAILED ---\n Error: ${res.error}`;
      }
    });

    // Process static results
    if (staticResult && staticResult.success) {
      allIssues = [...allIssues, ...staticResult.issues];
      aggregatedText += `\n--- Analysis for Static Media ---\n ${staticResult.text}`;
      totalInputTokens += staticResult.usage.inputTokens;
      totalOutputTokens += staticResult.usage.outputTokens;
    } else if (staticResult && !staticResult.success) {
      aggregatedText += `\n--- Analysis for Static Media FAILED ---\n Error: ${staticResult.error}`;
    }

    // 6. Calculate Finals
    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    // Calculate costs using centralized pricing
    const pricing = getModelPricing(GEMINI_MODELS.ANALYSIS);
    const inputCost = (totalInputTokens / 1_000_000) * pricing.inputPer1M;
    const outputCost = (totalOutputTokens / 1_000_000) * pricing.outputPer1M;
    const totalCost = inputCost + outputCost;

    console.log(`[${new Date().toISOString()}] Unified Analysis complete - ${processingTimeMs}ms, ${allIssues.length} issues found.`);

    // 7. Construct Final Response
    // We try to reconstruct a valid JSON object primarily for the 'issues' field which the frontend expects
    // The 'text' field will contain the concatenated raw strings for debugging/logging

    // Check if we have NOTHING
    if (allIssues.length === 0 && aggregatedText.includes("FAILED")) {
      // Construct a detailed error message
      const errors = [];
      timeBasedResults.forEach((res, i) => {
        if (!res.success) {
          const type = media[res.originalIndex].type;
          errors.push(`${type.charAt(0).toUpperCase() + type.slice(1)} ${i + 1}: ${res.error}`);
        }
      });
      if (staticResult && !staticResult.success) {
        errors.push(`Static Media Batch: ${staticResult.error}`);
      }

      const errorMessage = `All analysis attempts failed.\nDetails:\n- ${errors.join('\n- ')}`;
      throw new Error(errorMessage);
    }

    // Attempt to create a valid JSON text structure that matches the schema just in case the frontend relies on parsing `text` directly
    // (Though the frontend likely uses the `issues` array we send back if we modify the contract, 
    // but the current frontend likely expects `text` to be the JSON string... wait, let's check frontend)
    // Checking previous code: res.json({ text: response.text, ... })
    // The frontend likely parses `text` itself?
    // Let's look at AIAnalyst.tsx... it seems to stream chat.
    // TableView.tsx takes `issues`.
    // Where is the API called? `components/UnifiedMediaUpload.tsx` didn't show the call.
    // I probably missed where the API is called. It's likely in `App.tsx` or a service file.
    // However, the `responseSchema` passed in typically expects `{ issues: [...] }`.
    // If I return a concatenated string in `text`, `JSON.parse` on the frontend might fail if it expects a single valid JSON object.

    // FIX: Reconstruct a valid JSON string for the `text` field so any naive `JSON.parse(response.text)` works.
    const combinedJson = JSON.stringify({
      issues: allIssues,
      transcript: aggregatedTranscript || "No transcript available.", // Combined transcript for backward compatibility
      transcripts: allTranscripts.length > 0 ? allTranscripts : [aggregatedTranscript || ""] // Per-video transcripts
    });

    res.json({
      text: combinedJson, // Send valid JSON here so frontend parsing succeeds
      metadata: {
        systemPrompt: systemInstruction,
        processingTimeMs,
        model: GEMINI_MODELS.ANALYSIS,
        costBreakdown: {
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          mediaCount: media.length,
          inputCost,
          outputCost,
          totalCost
        },
        stages: [
          { name: 'Media Upload', startTime, endTime: startTime + 100, status: 'complete' },
          { name: 'Parallel Analysis', startTime: startTime + 100, endTime: endTime - 100, status: 'complete' },
          { name: 'Aggregation', startTime: endTime - 100, endTime, status: 'complete' }
        ],
        timestamp: new Date().toISOString()
      },
      // Explicitly send issues as a top-level field if the frontend can be updated to use it to avoid double-parsing
      // But for backward compatibility with the generic `text` response:
      issues: allIssues
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
      model: GEMINI_MODELS.CHAT,
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

// Validate model configuration at startup
async function validateModels() {
  console.log('🔍 Validating Gemini model configuration...');

  const modelsToValidate = [
    { name: 'ANALYSIS', model: GEMINI_MODELS.ANALYSIS },
    { name: 'CHAT', model: GEMINI_MODELS.CHAT },
  ];

  for (const { name, model } of modelsToValidate) {
    try {
      // Make a minimal API call to verify the model exists
      const response = await genAI.models.generateContent({
        model,
        contents: { parts: [{ text: 'Test' }] },
        config: { maxOutputTokens: 1 }
      });
      console.log(`  ✅ ${name}: ${model}`);
    } catch (error) {
      if (error.message?.includes('not found') || error.message?.includes('not supported')) {
        console.error(`  ❌ ${name}: ${model} - MODEL NOT FOUND!`);
        console.error(`     Error: ${error.message}`);
        console.error('');
        console.error('⚠️  Please update server/config.js with a valid model name.');
        console.error('   See: https://ai.google.dev/gemini-api/docs/models');
        process.exit(1);
      } else {
        // Other errors (rate limits, etc.) - model exists but other issue
        console.log(`  ⚠️  ${name}: ${model} - ${error.message?.substring(0, 50)}...`);
      }
    }
  }

  console.log('✅ Model configuration validated successfully!');
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`🔒 MediaToTicket API Proxy running on port ${PORT}`);
    console.log(`📍 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`🔑 API Key configured: ${!!process.env.GEMINI_API_KEY}`);

    // Validate models on startup (non-blocking warning if it fails)
    if (process.env.GEMINI_API_KEY) {
      validateModels().catch(err => {
        console.warn('⚠️  Model validation failed:', err.message);
      });
    }
  });
}

export { app };

