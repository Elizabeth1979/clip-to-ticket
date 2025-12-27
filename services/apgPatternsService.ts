
import apgData from '../data/apg-patterns.json';

export interface APGEntry {
    id: string;
    name: string;
    fullName: string;
    url: string;
    description: string;
    category?: string; // Only patterns have categories
}

interface APGData {
    patterns: APGEntry[];
    practices: APGEntry[];
}

const typedData = apgData as APGData;

// Combine patterns and practices for lookups
const allEntries = [...typedData.patterns, ...typedData.practices];

/**
 * Get an APG pattern or practice by its ID
 * @param id - Entry ID (e.g., "toolbar", "accessible-name")
 * @returns APG entry object or null if not found
 */
export function getAPGPatternById(id: string): APGEntry | null {
    const entry = allEntries.find(e => e.id.toLowerCase() === id.toLowerCase());
    return entry || null;
}

/**
 * Get the URL for an APG pattern or practice
 * @param id - Entry ID (e.g., "toolbar", "accessible-name")
 * @returns Entry URL or null if not found
 */
export function getAPGPatternUrl(id: string): string | null {
    const entry = getAPGPatternById(id);
    return entry?.url || null;
}

/**
 * Parse APG patterns/practices from a reference string (similar to WCAG parsing)
 * @param reference - The APG reference string (e.g., "toolbar" or "accessible-name, button")
 * @returns Array of parsed entries with id, name, and url
 */
export function parseAPGPatterns(reference: string): Array<{ id: string; name: string; url: string }> {
    if (!reference || reference.trim() === '') {
        return [];
    }

    // Split by comma and trim each entry ID
    const entryIds = reference.split(',').map(id => id.trim()).filter(id => id !== '');

    return entryIds.map(id => {
        const entry = getAPGPatternById(id);
        return {
            id: id,
            name: entry?.name || id,
            url: entry?.url || 'https://www.w3.org/WAI/ARIA/apg/'
        };
    });
}

/**
 * Get all APG patterns
 * @returns Array of all APG patterns
 */
export function getAllAPGPatterns(): APGEntry[] {
    return typedData.patterns;
}

/**
 * Get all APG practices
 * @returns Array of all APG practices
 */
export function getAllAPGPractices(): APGEntry[] {
    return typedData.practices;
}

/**
 * Get all APG entries (patterns + practices)
 * @returns Array of all APG entries
 */
export function getAllAPGEntries(): APGEntry[] {
    return allEntries;
}

/**
 * Get the count of APG patterns
 * @returns Number of patterns
 */
export function getAPGPatternCount(): number {
    return typedData.patterns.length;
}

/**
 * Get the count of APG practices
 * @returns Number of practices
 */
export function getAPGPracticeCount(): number {
    return typedData.practices.length;
}

/**
 * Format APG data for AI consumption
 * @returns Formatted string with all pattern and practice information
 */
export function getFormattedPatternsForAI(): string {
    const formatted = {
        patterns: typedData.patterns.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.url
        })),
        practices: typedData.practices.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            url: p.url
        }))
    };
    return JSON.stringify(formatted, null, 2);
}
