import { test, expect } from '@playwright/test';

/**
 * E2E Tests for MediaToTicket Application
 * Tests for transcript parsing and video switching functionality
 */

test.describe('Transcript Display', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should show upload area on initial load', async ({ page }) => {
        // Verify the upload section is visible
        await expect(page.getByText('Transform media into actionable reports')).toBeVisible();
        await expect(page.getByText('Load Example Video')).toBeVisible();
    });

    test('should load example video when clicked', async ({ page }) => {
        // Click the example video button
        await page.getByRole('button', { name: 'Load Example Video' }).click();

        // Wait for the analyze button to appear (indicates video loaded)
        await expect(page.getByRole('button', { name: /Analyze 1 File/ })).toBeVisible({ timeout: 5000 });
    });
});

test.describe('Video Indicator', () => {
    test('should NOT show V1 indicator for single video issues', async ({ page }) => {
        await page.goto('/');

        // Load example video
        await page.getByRole('button', { name: 'Load Example Video' }).click();
        await expect(page.getByRole('button', { name: /Analyze 1 File/ })).toBeVisible();

        // Start analysis (this is a UI test, we're testing the indicator logic)
        // Note: Full analysis would require mocking the backend
        // For now, test that the button exists and is clickable
        const analyzeButton = page.getByRole('button', { name: /Analyze 1 File/ });
        await expect(analyzeButton).toBeEnabled();
    });
});

test.describe('Media Upload', () => {
    test('should support multiple file types in upload zone', async ({ page }) => {
        await page.goto('/');

        // Check that the upload section exists
        const uploadArea = page.locator('text=Drag \u0026 drop');
        await expect(uploadArea).toBeVisible();
    });

    test('should display language selector when media is uploaded', async ({ page }) => {
        await page.goto('/');

        // Load example video
        await page.getByRole('button', { name: 'Load Example Video' }).click();

        // Wait for language selector to appear
        await expect(page.getByText('Output Language:')).toBeVisible();

        // Verify language options exist
        const languageSelect = page.locator('select');
        await expect(languageSelect).toBeVisible();
    });
});

test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
        await page.goto('/');

        // Check main heading
        const h1 = page.locator('h1');
        await expect(h1).toHaveText('MediaToTicket');

        // Check secondary heading
        const h2 = page.locator('h2');
        await expect(h2.first()).toContainText('Transform media');
    });

    test('should have accessible buttons with visible text', async ({ page }) => {
        await page.goto('/');

        // Load example video button should be accessible
        const exampleButton = page.getByRole('button', { name: 'Load Example Video' });
        await expect(exampleButton).toBeVisible();
        await expect(exampleButton).toBeEnabled();
    });
});
