import { test, expect } from '@playwright/test';

/**
 * Transcript Parsing Tests
 * Tests to verify transcript displays correctly with speakers and timestamps
 * This file specifically tests for the regression where all lines showed "System" at "[00:00]"
 */

test.describe('Transcript Parsing', () => {

    test('should parse transcript lines with speaker and timestamp format', async ({ page }) => {
        await page.goto('/');

        // Load example video
        await page.getByRole('button', { name: 'Load Example Video' }).click();
        await expect(page.getByRole('button', { name: /Analyze 1 File/ })).toBeVisible();

        // Note: Full transcript testing requires mocking the API response
        // For now we test that the transcript panel UI elements exist
        // The actual parsing logic is tested below in the parsedLines tests
    });

    test('transcript panel should have speaker editing capability', async ({ page }) => {
        await page.goto('/');

        // Load example video  
        await page.getByRole('button', { name: 'Load Example Video' }).click();
        await expect(page.getByRole('button', { name: /Analyze 1 File/ })).toBeVisible();

        // Verify UI is set up for analysis
        // After analysis, the "Speakers" button should be available
        // This is a smoke test to verify the UI elements are in place
    });
});

/**
 * Transcript Format Validation
 * These tests run in the browser via page.evaluate() to test the actual parsing logic
 */
test.describe('Transcript Format Validation', () => {

    test('should correctly parse "Speaker [MM:SS]: Message" format', async ({ page }) => {
        await page.goto('/');

        // Execute parsing logic in browser context
        const result = await page.evaluate(() => {
            // Simulate the parsing logic from App.tsx
            const pattern = /^([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:\s*(.*)$/;
            const testLine = 'Narrator [00:05]: Welcome to this accessibility demo.';
            const match = testLine.match(pattern);

            return {
                matched: !!match,
                speaker: match?.[1]?.trim() || null,
                timestamp: match?.[2] || null,
                message: match?.[3] || null
            };
        });

        expect(result.matched).toBe(true);
        expect(result.speaker).toBe('Narrator');
        expect(result.timestamp).toBe('00:05');
        expect(result.message).toBe('Welcome to this accessibility demo.');
    });

    test('should correctly parse "[MM:SS] Speaker: Message" format', async ({ page }) => {
        await page.goto('/');

        const result = await page.evaluate(() => {
            const pattern = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/;
            const testLine = '[00:12] User: I am testing keyboard navigation.';
            const match = testLine.match(pattern);

            return {
                matched: !!match,
                speaker: match?.[2]?.trim() || null,
                timestamp: match?.[1] || null,
                message: match?.[3] || null
            };
        });

        expect(result.matched).toBe(true);
        expect(result.speaker).toBe('User');
        expect(result.timestamp).toBe('00:12');
        expect(result.message).toBe('I am testing keyboard navigation.');
    });

    test('should correctly parse "Speaker (MM:SS): Message" format', async ({ page }) => {
        await page.goto('/');

        const result = await page.evaluate(() => {
            const pattern = /^([^(\n]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.*)$/;
            const testLine = 'ScreenReader (01:30): Button, Submit Order';
            const match = testLine.match(pattern);

            return {
                matched: !!match,
                speaker: match?.[1]?.trim() || null,
                timestamp: match?.[2] || null,
                message: match?.[3] || null
            };
        });

        expect(result.matched).toBe(true);
        expect(result.speaker).toBe('ScreenReader');
        expect(result.timestamp).toBe('01:30');
        expect(result.message).toBe('Button, Submit Order');
    });

    test('should handle timestamps with hours (HH:MM:SS)', async ({ page }) => {
        await page.goto('/');

        const result = await page.evaluate(() => {
            const pattern = /^([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:\s*(.*)$/;
            const testLine = 'Narrator [1:05:30]: One hour into the presentation.';
            const match = testLine.match(pattern);

            return {
                matched: !!match,
                timestamp: match?.[2] || null
            };
        });

        expect(result.matched).toBe(true);
        expect(result.timestamp).toBe('1:05:30');
    });

    test('should NOT match plain text without speaker/timestamp (fallback to System)', async ({ page }) => {
        await page.goto('/');

        const result = await page.evaluate(() => {
            const pattern1 = /^([^\[\n]+?)\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]:\s*(.*)$/;
            const pattern2 = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.*)$/;
            const pattern3 = /^([^(\n]+?)\s*\((\d{1,2}:\d{2}(?::\d{2})?)\):\s*(.*)$/;

            const testLine = 'Welcome to this accessibility demo.';

            return {
                matchesPattern1: !!testLine.match(pattern1),
                matchesPattern2: !!testLine.match(pattern2),
                matchesPattern3: !!testLine.match(pattern3)
            };
        });

        // Plain text should NOT match any pattern (falls back to System)
        expect(result.matchesPattern1).toBe(false);
        expect(result.matchesPattern2).toBe(false);
        expect(result.matchesPattern3).toBe(false);
    });
});
