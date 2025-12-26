import wcagData from '../data/wcag22-full.json';

interface WCAGSuccessCriterion {
    id: string;
    num: string;
    handle: string;
}

interface WCAGGuideline {
    successcriteria?: WCAGSuccessCriterion[];
}

interface WCAGPrinciple {
    guidelines?: WCAGGuideline[];
}

interface WCAGData {
    principles?: WCAGPrinciple[];
}

// Build a mapping of WCAG standard numbers to their Understanding document slugs
const buildWCAGMap = (): { [key: string]: string } => {
    const map: { [key: string]: string } = {};

    const data = wcagData as WCAGData;

    if (data.principles) {
        for (const principle of data.principles) {
            if (principle.guidelines) {
                for (const guideline of principle.guidelines) {
                    if (guideline.successcriteria) {
                        for (const criterion of guideline.successcriteria) {
                            map[criterion.num] = criterion.id;
                        }
                    }
                }
            }
        }
    }

    return map;
};

// Cache the map so we only build it once
const wcagMap = buildWCAGMap();

/**
 * Get the WCAG Understanding document URL for a given standard number
 * @param standardNumber - The WCAG standard number (e.g., "4.1.2")
 * @returns The full URL to the Understanding document
 */
export const getWCAGLink = (standardNumber: string): string => {
    const slug = wcagMap[standardNumber.trim()];
    if (slug) {
        return `https://www.w3.org/WAI/WCAG22/Understanding/${slug}.html`;
    }
    return `https://www.w3.org/WAI/WCAG22/Understanding/`;
};

/**
 * Parse WCAG standards from a reference string
 * @param reference - The WCAG reference string (e.g., "4.1.2 Name, Role, Value" or "1.3.1, 2.4.1")
 * @returns Array of parsed standards with number and name
 */
export const parseWCAGStandards = (reference: string): Array<{ number: string; name: string }> => {
    // Extract all WCAG standard numbers (e.g., "4.1.2", "2.4.1")
    const numberMatches = reference.match(/\d+\.\d+\.\d+/g) || [];

    // Extract the criterion name (everything after the last standard number)
    const nameMatch = reference.match(/\d+\.\d+\.\d+\s+(.+)/);
    const criterionName = nameMatch ? nameMatch[1] : '';

    return numberMatches.map(num => ({
        number: num,
        name: criterionName
    }));
};
