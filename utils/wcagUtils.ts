import wcagData from '../data/wcag22-full.json';

interface WCAGSuccessCriterion {
    id: string;
    num: string;
    handle: string;
    level: string;
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

interface WCAGMetadata {
    id: string;
    name: string;
    level: string;
    introducedVersion: string;
}

// Build a mapping of WCAG standard numbers to their metadata
const buildWCAGMap = (): { [key: string]: WCAGMetadata } => {
    const map: { [key: string]: WCAGMetadata } = {};

    const data = wcagData as WCAGData;

    if (data.principles) {
        for (const principle of data.principles) {
            if (principle.guidelines) {
                for (const guideline of principle.guidelines) {
                    if (guideline.successcriteria) {
                        for (const criterion of guideline.successcriteria) {
                            const versions = (criterion as any).versions || [];
                            const introduced = versions[0] || '';
                            map[criterion.num] = {
                                id: criterion.id,
                                name: criterion.handle,
                                level: criterion.level,
                                introducedVersion: (introduced === '2.1' || introduced === '2.2') ? introduced : ''
                            };
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
    const meta = wcagMap[standardNumber.trim()];
    if (meta) {
        return `https://www.w3.org/WAI/WCAG22/Understanding/${meta.id}.html`;
    }
    return `https://www.w3.org/WAI/WCAG22/Understanding/`;
};

/**
 * Parse WCAG standards from a reference string
 * @param reference - The WCAG reference string (e.g., "4.1.2 Name, Role, Value" or "1.3.1, 2.4.1")
 * @returns Array of parsed standards with number, name, level and introduced version
 */
export const parseWCAGStandards = (reference: string): Array<{ number: string; name: string; level: string; introducedVersion: string }> => {
    // Extract all WCAG standard numbers (e.g., "4.1.2", "2.4.1")
    const numberMatches = reference.match(/\d+\.\d+\.\d+/g) || [];

    return numberMatches.map(num => {
        const meta = wcagMap[num];
        return {
            number: num,
            name: meta?.name || '',
            level: meta?.level || '',
            introducedVersion: meta?.introducedVersion || ''
        };
    });
};



