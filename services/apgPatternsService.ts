
import apgPatternsData from '../data/apg-patterns.json';

export interface APGPattern {
    id: string;
    name: string;
    fullName: string;
    url: string;
    description: string;
    category: string;
}

interface APGPatternsData {
    patterns: APGPattern[];
}

const typedData = apgPatternsData as APGPatternsData;

/**
 * Get an APG pattern by its ID
 * @param id - Pattern ID (e.g., "toolbar", "menubar")
 * @returns APG pattern object or null if not found
 */
export function getAPGPatternById(id: string): APGPattern | null {
    const pattern = typedData.patterns.find(p => p.id.toLowerCase() === id.toLowerCase());
    return pattern || null;
}

/**
 * Get the URL for an APG pattern
 * @param id - Pattern ID (e.g., "toolbar", "menubar")
 * @returns Pattern URL or null if not found
 */
export function getAPGPatternUrl(id: string): string | null {
    const pattern = getAPGPatternById(id);
    return pattern?.url || null;
}

/**
 * Get all APG patterns
 * @returns Array of all APG patterns
 */
export function getAllAPGPatterns(): APGPattern[] {
    return typedData.patterns;
}

/**
 * Get the count of APG patterns
 * @returns Number of patterns in the database
 */
export function getAPGPatternCount(): number {
    return typedData.patterns.length;
}

/**
 * Format APG patterns data for AI consumption
 * @returns Formatted string with all pattern information
 */
export function getFormattedPatternsForAI(): string {
    return JSON.stringify(typedData.patterns.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        url: p.url
    })), null, 2);
}
