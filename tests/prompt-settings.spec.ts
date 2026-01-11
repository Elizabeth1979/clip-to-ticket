import { test, expect } from '@playwright/test';

/**
 * E2E Tests for PromptSettings Feature
 * Tests the prompt customization UI on the upload page
 */

test.describe('Prompt Settings', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Load example video to make media items available
        await page.getByRole('button', { name: 'Load Example Video' }).click();
        await expect(page.getByRole('button', { name: /Analyze 1 File/ })).toBeVisible({ timeout: 5000 });
    });

    test('should show Analysis Settings section when media is uploaded', async ({ page }) => {
        // Verify the PromptSettings component is visible
        await expect(page.getByText('Analysis Settings')).toBeVisible();
    });

    test('should expand settings panel when clicked', async ({ page }) => {
        // Click to expand
        await page.getByText('Analysis Settings').click();

        // Verify focus areas are visible
        await expect(page.getByText('Priority Focus Areas')).toBeVisible();
        await expect(page.getByText('Keyboard Navigation')).toBeVisible();
        await expect(page.getByText('Screen Reader Compatibility')).toBeVisible();
        await expect(page.getByText('Color Contrast')).toBeVisible();
    });

    test('should show severity options when expanded', async ({ page }) => {
        await page.getByText('Analysis Settings').click();

        await expect(page.getByText('Severity Emphasis')).toBeVisible();
        await expect(page.getByText('Report all issues')).toBeVisible();
        await expect(page.getByText(/Focus on Critical/)).toBeVisible();
        await expect(page.getByText(/Focus on Quick Wins/)).toBeVisible();
    });

    test('should show custom instructions textarea when expanded', async ({ page }) => {
        await page.getByText('Analysis Settings').click();

        await expect(page.getByText('Custom Instructions')).toBeVisible();
        await expect(page.getByPlaceholder(/elderly users/)).toBeVisible();
    });

    test('should be able to select focus areas', async ({ page }) => {
        await page.getByText('Analysis Settings').click();

        // Click on Keyboard Navigation checkbox
        const keyboardLabel = page.getByText('Keyboard Navigation');
        await keyboardLabel.click();

        // Verify customized indicator appears
        await expect(page.getByText('Customized')).toBeVisible();
    });

    test('should be able to save settings', async ({ page }) => {
        await page.getByText('Analysis Settings').click();

        // Enter custom instructions
        await page.getByPlaceholder(/elderly users/).fill('This is a test app');

        // Click save
        await page.getByRole('button', { name: 'Save Settings' }).click();

        // Verify save message appears
        await expect(page.getByText('Settings saved!')).toBeVisible();
    });

    test('should show View Full Prompt Preview option', async ({ page }) => {
        await page.getByText('Analysis Settings').click();

        // Check for prompt preview option
        await expect(page.getByText('View Full Prompt Preview')).toBeVisible();
    });
});
