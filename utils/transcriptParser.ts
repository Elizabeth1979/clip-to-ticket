/**
 * Transcript parsing utilities
 * Extracted for testability and reuse
 */

export interface TranscriptLine {
    speaker: string;
    timestamp: string;
    seconds: number;
    message: string;
}

/**
 * Parse a timestamp string to seconds
 * Supports formats: MM:SS, M:SS, HH:MM:SS
 */
export function parseTimestamp(ts: string): number {
    const clean = ts.replace(/[\[\]s]/g, '').trim();
    if (clean.includes(':')) {
        const parts = clean.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseFloat(clean) || 0;
}

/**
 * Parse a transcript string into structured lines
 * Handles multiple AI transcript formats:
 * - "Speaker [MM:SS]: Message"
 * - "[MM:SS] Speaker: Message"
 * - "Speaker (MM:SS): Message"
 */
export function parseTranscript(transcript: string): TranscriptLine[] {
    if (!transcript) return [];

    return transcript.split('\n')
        .filter(line => line.trim())
        .map(line => {
            // Pattern 1: Speaker Name [MM:SS]: Message
            const pattern1 = /^([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:\s*(.*)$/;
            const match1 = line.match(pattern1);
            if (match1) {
                const [, speaker, ts, message] = match1;
                return {
                    speaker: speaker.trim(),
                    timestamp: ts,
                    seconds: parseTimestamp(ts),
                    message
                };
            }

            // Pattern 2: [MM:SS] Speaker: Message
            const pattern2 = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/;
            const match2 = line.match(pattern2);
            if (match2) {
                const [, ts, speaker, message] = match2;
                return {
                    speaker: speaker.trim(),
                    timestamp: ts,
                    seconds: parseTimestamp(ts),
                    message
                };
            }

            // Pattern 3: Speaker (MM:SS): Message (parentheses)
            const pattern3 = /^([^(\n]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.*)$/;
            const match3 = line.match(pattern3);
            if (match3) {
                const [, speaker, ts, message] = match3;
                return {
                    speaker: speaker.trim(),
                    timestamp: ts,
                    seconds: parseTimestamp(ts),
                    message
                };
            }

            // Fallback: treat line as system message
            return { speaker: 'System', timestamp: '00:00', seconds: 0, message: line };
        });
}
