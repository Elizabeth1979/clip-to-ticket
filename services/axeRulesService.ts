import axe from 'axe-core';

export interface AxeRuleMetadata {
    ruleId: string;
    description: string;
    help: string;
    helpUrl: string;
    tags: string[];
    wcagCriteria: string[];
    impact: 'minor' | 'moderate' | 'serious' | 'critical' | null;
}

export class AxeRulesService {
    private static rulesCache: AxeRuleMetadata[] | null = null;

    /**
     * Get all axe-core rules with metadata
     */
    static getAllRules(): AxeRuleMetadata[] {
        if (this.rulesCache) {
            return this.rulesCache;
        }

        const rules = axe.getRules();

        this.rulesCache = rules.map(rule => ({
            ruleId: rule.ruleId,
            description: rule.description,
            help: rule.help,
            helpUrl: rule.helpUrl || `https://dequeuniversity.com/rules/axe/4.11/${rule.ruleId}`,
            tags: rule.tags,
            wcagCriteria: this.extractWcagCriteria(rule.tags),
            impact: this.getDefaultImpact(rule.tags)
        }));

        return this.rulesCache;
    }

    /**
     * Extract WCAG criteria from tags (e.g., "wcag2a", "wcag111" -> "1.1.1")
     */
    private static extractWcagCriteria(tags: string[]): string[] {
        const wcagTags = tags.filter(tag => tag.startsWith('wcag'));
        const criteria: string[] = [];

        for (const tag of wcagTags) {
            // Skip level tags like "wcag2a", "wcag2aa", "wcag21a", etc.
            if (/^wcag\d{1,2}a{1,3}$/i.test(tag)) {
                continue;
            }

            // Extract numbers from tags like "wcag111", "wcag143", "wcag2411"
            const numbers = tag.replace(/^wcag/i, '').match(/\d/g);
            if (numbers && numbers.length >= 3) {
                // Format as X.X.X
                const formatted = `${numbers[0]}.${numbers[1]}.${numbers.slice(2).join('')}`;
                criteria.push(formatted);
            }
        }

        return [...new Set(criteria)]; // Remove duplicates
    }

    /**
     * Determine default impact based on tags
     */
    private static getDefaultImpact(tags: string[]): 'minor' | 'moderate' | 'serious' | 'critical' | null {
        // Critical for WCAG Level A violations
        if (tags.includes('wcag2a') || tags.includes('wcag21a') || tags.includes('wcag22a')) {
            return 'critical';
        }
        // Serious for WCAG Level AA violations
        if (tags.includes('wcag2aa') || tags.includes('wcag21aa') || tags.includes('wcag22aa')) {
            return 'serious';
        }
        // Moderate for best practices
        if (tags.includes('best-practice')) {
            return 'moderate';
        }
        return 'serious'; // Default to serious if unclear
    }

    /**
     * Get formatted rules for AI context (condensed)
     */
    static getFormattedRulesForAI(): string {
        const rules = this.getAllRules();

        const formatted = rules.map(rule => ({
            id: rule.ruleId,
            desc: rule.description,
            help: rule.help,
            wcag: rule.wcagCriteria,
            impact: rule.impact,
            tags: rule.tags.filter(t => !t.startsWith('cat.') && !t.startsWith('wcag')), // Remove category and wcag level tags for brevity
            url: rule.helpUrl
        }));

        return JSON.stringify(formatted, null, 2);
    }

    /**
     * Get rule count for logging
     */
    static getRuleCount(): number {
        return this.getAllRules().length;
    }

    /**
     * Get rule by ID
     */
    static getRuleById(ruleId: string): AxeRuleMetadata | undefined {
        return this.getAllRules().find(rule => rule.ruleId === ruleId);
    }
}
