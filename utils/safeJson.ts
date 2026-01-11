/**
 * safely parses JSON strings that might be malformed or contain Markdown code blocks.
 * specially handles truncated JSON from AI responses (unterminated strings, missing braces).
 */
export function safeJsonParse<T = any>(input: string): T {
    if (!input) {
        throw new Error("Empty input for JSON parsing");
    }

    // 1. Strip Markdown code blocks (```json ... ```)
    let cleaned = input.replace(/```json\n?|```/g, '').trim();

    // 2. Try standard parse first
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Continue to repair attempts
    }

    // 3. Handle common AI JSON errors

    // Remove any trailing commas before closing braces/brackets
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    // Check for unterminated string (roughly)
    // If the last significant character is a non-escaped quote, might be open? 
    // Easier approach: simply try to close string if we suspect it's open, or relying on bracing counts.

    // Count quotes to see if we possess an odd number (heuristic)
    // This is tricky because of escaped quotes. 
    const quoteCount = (cleaned.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
        cleaned += '"';
    }

    // Attempt to close truncated JSON structures
    // This is a naive attempt but handles the common case where the stream just stopped
    const openBraces = (cleaned.match(/{/g) || []).length;
    const closeBraces = (cleaned.match(/}/g) || []).length;
    const openBrackets = (cleaned.match(/\[/g) || []).length;
    const closeBrackets = (cleaned.match(/\]/g) || []).length;

    if (openBraces > closeBraces) {
        cleaned += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
        cleaned += ']'.repeat(openBrackets - closeBrackets);
    }

    // 4. Try parsing again after simple repairs
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // If it failed with "Unexpected end of JSON" or "Unterminated string", 
        // we might need to close a string first (if our heuristic failed)

        console.warn("Retrying JSON parse with aggressive cleanup...");
        // Last ditch: try to clean up control characters
        cleaned = cleaned.replace(/[\u0000-\u001F]+/g, "");

        try {
            return JSON.parse(cleaned);
        } catch (finalError: any) {
            throw new Error(`Failed to parse JSON: ${finalError.message}. Input snippet: ${cleaned.slice(0, 100)}...`);
        }
    }
}
