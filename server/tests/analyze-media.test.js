/**
 * Tests for /api/analyze-media endpoint
 * 
 * Verifies:
 * 1. Independent processing of videos (Partial Failure)
 * 2. Total failure handling and error messages
 * 3. Static media handling
 */

import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mocks
const mockGenerateContent = jest.fn();

// Mock the GoogleGenAI class and other imports before importing the app/index
// Note: transforming ES modules with Jest can be tricky.
// We will mock the behavior by overwriting the genAI instance or mocking the module.
// Since index.js initializes genAI globally at top level, we might need a slightly different approach
// or export the app and genAI instance.

// For this test, we'll use a slightly different pattern:
// We will mock 'index.js' logic by mocking the library it uses.
// But 'index.js' is an entry point file (starts server).
// Best practice is to separate 'app' definition from 'listen'.
// However, to avoid refactoring the entire file structure now, we will use
// jest.mock to intercept the import of @google/genai.

jest.unstable_mockModule('@google/genai', () => {
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            }
        })),
        Type: {
            OBJECT: 'OBJECT',
            STRING: 'STRING',
            ARRAY: 'ARRAY',
            INTEGER: 'INTEGER'
        }
    };
});

// Import the app AFTER mocking (dynamic import needed for ESM)
// Note: We need to modify index.js to export 'app' for efficient testing,
// otherwise importing it runs the server.
// If index.js runs the server on import, we might get port conflicts.
// It's better to verify if we can modify index.js slightly to export app.
// Assuming we can't easily change the entry point structure heavily, 
// we will rely on supertest against the running local server? 
// No, that integration test is flaky.
// Better to export `app` from `index.js`. 
// Let's assume for this Agent task we can quickly export `app`.

// WAIT: I cannot modify imports easily if I don't change `index.js`.
// Let's create a separate `app.js` or just modify `index.js` to export `app` and only listen if not in test mode.

// Plan:
// 1. Modify `index.js` to export `app`.
// 2. Modify `index.js` to only `app.listen` if `process.env.NODE_ENV !== 'test'`.
// 3. Then import `app` here.

let app;

describe('POST /api/analyze-media', () => {
    beforeAll(async () => {
        // Dynamic import of the app after mocking
        const mod = await import('../index.js');
        app = mod.app;
    });

    beforeEach(() => {
        mockGenerateContent.mockClear();
    });

    const mockVideoItem = {
        type: 'video',
        base64: 'fakebase64video',
        mimeType: 'video/mp4'
    };

    const mockImageItem = {
        type: 'image',
        base64: 'fakebase64image',
        mimeType: 'image/jpeg'
    };

    const mockSuccessResponse = (issueTitle, transcript = "Full transcript of the video content.") => ({
        text: JSON.stringify({
            issues: [{
                issue_title: issueTitle,
                issue_description: "Description",
                wcag_reference: "1.1.1",
                axe_rule_id: "image-alt",
                severity: "Minor",
                ease_of_fix: "Easy",
                suggested_fix: "Fix it",
                timestamp: "00:00",
                status: "Open",
                disclaimer: "AI generated"
            }],
            transcript: transcript,
            transcripts: [transcript] // Per-video transcript
        }),
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 }
    });

    const mockMultiVideoSuccessResponse = (issueTitle, transcript, videoIndex) => ({
        text: JSON.stringify({
            issues: [{
                issue_title: issueTitle,
                issue_description: "Description",
                wcag_reference: "1.1.1",
                axe_rule_id: "image-alt",
                severity: "Minor",
                ease_of_fix: "Easy",
                suggested_fix: "Fix it",
                timestamp: "00:00",
                status: "Open",
                disclaimer: "AI generated",
                video_index: videoIndex
            }],
            transcript: transcript,
            transcripts: [transcript]
        }),
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 }
    });

    it('should process multiple videos independently and return compiled issues', async () => {
        // Setup mock to return success for both calls
        mockGenerateContent
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Video 1 Issue", "Video 1 transcript content.", 0))
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Video 2 Issue", "Video 2 transcript content.", 1));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const body = response.body;
        // Check structural integrity
        // The endpoint returns { text: jsonString, metadata: ... }
        expect(body).toHaveProperty('text');

        const parsed = JSON.parse(body.text);
        expect(parsed.issues).toHaveLength(2);

        // Check video attribution
        // We expect video_index to be 0 for the first issue and 1 for the second
        // Note: Promise.all order is preserved, so valid logic assumption.
        expect(parsed.issues[0].video_index).toBe(0);
        expect(parsed.issues[0].video_index).toBe(0);
        expect(parsed.issues[1].video_index).toBe(1);

        // Verify transcript aggregation
        expect(parsed.transcript).toContain("--- Video 1 Transcript ---");
        expect(parsed.transcript).toContain("--- Video 2 Transcript ---");
    });

    it('should return separate transcripts array for multiple videos', async () => {
        mockGenerateContent
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Video 1 Issue", "Speaker A [00:05]: Hello from video one.", 0))
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Video 2 Issue", "Speaker B [00:10]: This is video two.", 1));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const parsed = JSON.parse(response.body.text);

        // Verify transcripts array exists and has correct count
        expect(parsed.transcripts).toBeDefined();
        expect(parsed.transcripts).toHaveLength(2);

        // Verify each transcript is separate
        expect(parsed.transcripts[0]).toContain("video one");
        expect(parsed.transcripts[1]).toContain("video two");

        // Verify transcripts don't mix content
        expect(parsed.transcripts[0]).not.toContain("video two");
        expect(parsed.transcripts[1]).not.toContain("video one");
    });

    it('should process single video and return clean transcript', async () => {
        mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse("Single Video"));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const parsed = JSON.parse(response.body.text);

        // Should NOT have headers for single video
        expect(parsed.transcript).not.toContain("--- Video 1 Transcript ---");
        expect(parsed.transcript).toBe("Full transcript of the video content.");

        // Transcripts array should have exactly one element matching transcript
        expect(parsed.transcripts).toBeDefined();
        expect(parsed.transcripts).toHaveLength(1);
        expect(parsed.transcripts[0]).toBe("Full transcript of the video content.");
    });

    it('should handle partial failure (Video 1 succeeds, Video 2 fails)', async () => {
        // Video 1 succeeds
        mockGenerateContent.mockResolvedValueOnce(mockMultiVideoSuccessResponse("Video 1 Issue", "Video 1 transcript.", 0));
        // Video 2 fails
        mockGenerateContent.mockRejectedValueOnce(new Error("Gemini overloaded"));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const parsed = JSON.parse(response.body.text);

        // Should have results from Video 1
        expect(parsed.issues).toHaveLength(1);
        expect(parsed.issues[0].issue_title).toBe("Video 1 Issue");
        expect(parsed.issues[0].video_index).toBe(0);

        // Transcripts array should exist with successful video's transcript
        expect(parsed.transcripts).toBeDefined();
        expect(parsed.transcripts.length).toBeGreaterThan(0);
    });

    it('should preserve transcript ordering matching video order', async () => {
        mockGenerateContent
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Issue A", "Transcript for first uploaded video.", 0))
            .mockResolvedValueOnce(mockMultiVideoSuccessResponse("Issue B", "Transcript for second uploaded video.", 1));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const parsed = JSON.parse(response.body.text);

        // Verify order is preserved (first video = index 0, second video = index 1)
        expect(parsed.transcripts[0]).toContain("first uploaded video");
        expect(parsed.transcripts[1]).toContain("second uploaded video");
    });

    it('should return 500 and detailed error when ALL attempts fail', async () => {
        // Both fail
        mockGenerateContent.mockRejectedValueOnce(new Error("Failure 1"));
        mockGenerateContent.mockRejectedValueOnce(new Error("Failure 2"));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockVideoItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(500);
        // Verify detailed message
        expect(response.body.error).toContain("All analysis attempts failed");
        expect(response.body.error).toContain("Video 1: Failure 1");
        expect(response.body.error).toContain("Video 2: Failure 2");
    });

    it('should process mixed media (Video + Static)', async () => {
        // Video succeeds
        mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse("Video Issue"));
        // Static batch succeeds
        mockGenerateContent.mockResolvedValueOnce(mockSuccessResponse("Static Issue"));

        const response = await request(app)
            .post('/api/analyze-media')
            .send({
                media: [mockVideoItem, mockImageItem],
                systemInstruction: "sys",
                responseSchema: {}
            });

        expect(response.status).toBe(200);
        const parsed = JSON.parse(response.body.text);
        expect(parsed.issues).toHaveLength(2);

        // Verify calling order (Video first, then Static if implemented that way)
        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    });
});
