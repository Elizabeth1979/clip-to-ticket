# MediaToTicket Server

Secure backend proxy for Gemini API calls.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Gemini API key to `.env`:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

3. Install dependencies (if not already done):
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`

## Endpoints

- `GET /health` - Health check
- `POST /api/analyze-video` - Analyze video for accessibility issues
- `POST /api/create-chat` - Create AI chat session
- `POST /api/chat/:sessionId/message` - Send message to chat (SSE streaming)

## Security Features

- **Rate Limiting**: 10 requests per hour per IP
- **CORS**: Restricted to frontend origin
- **Environment Variables**: API key stored securely server-side
- **Error Handling**: Sanitized error messages in production
