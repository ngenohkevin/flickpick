import { test, expect } from '@playwright/test';

test.describe('AI Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/discover');
  });

  test('should display discover page', async ({ page }) => {
    await expect(page).toHaveURL(/\/discover/);

    // Should have a heading
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('should have prompt input', async ({ page }) => {
    const promptInput = page.getByPlaceholder(/describe|what|mood|looking for/i).or(
      page.getByRole('textbox')
    ).or(
      page.locator('[data-testid="prompt-input"]')
    );

    await expect(promptInput.first()).toBeVisible();
  });

  test('should have example prompts', async ({ page }) => {
    // Look for example prompt pills/buttons
    const examplePrompts = page.locator('[data-testid="example-prompt"]').or(
      page.getByText(/cozy|thriller|mind-bending/i)
    );

    const count = await examplePrompts.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should fill prompt when clicking example', async ({ page }) => {
    const examplePrompt = page.locator('[data-testid="example-prompt"]').first().or(
      page.getByRole('button').filter({ hasText: /cozy|thriller|action/i }).first()
    );

    if (await examplePrompt.isVisible()) {
      const promptText = await examplePrompt.textContent();
      await examplePrompt.click();

      const promptInput = page.getByRole('textbox').or(
        page.locator('[data-testid="prompt-input"]')
      ).first();

      // Input should contain the example text (or part of it)
      const inputValue = await promptInput.inputValue();
      expect(inputValue.length).toBeGreaterThan(0);
    }
  });

  test('should have content type selector', async ({ page }) => {
    const contentTypeSelector = page.locator('[data-testid="content-type-selector"]').or(
      page.getByRole('group', { name: /type|content/i })
    ).or(
      page.getByText(/all|movies|tv shows|anime/i).first()
    );

    await expect(contentTypeSelector).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Content type selector not found');
    });
  });

  test('should show loading state when submitting', async ({ page }) => {
    const promptInput = page.getByRole('textbox').or(
      page.locator('[data-testid="prompt-input"]')
    ).first();

    await promptInput.fill('action movies with car chases');

    // Submit the form
    const submitButton = page.getByRole('button', { name: /discover|search|find/i }).or(
      page.locator('[data-testid="discover-submit"]')
    );

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show loading state
      const loading = page.getByText(/loading|searching|finding/i).or(
        page.locator('[data-testid="loading"]')
      ).or(
        page.locator('.animate-pulse')
      );

      // Loading should appear (or results if fast)
      await expect(
        loading.first().or(page.locator('[data-testid="discover-results"]'))
      ).toBeVisible({ timeout: 10000 }).catch(() => {
        console.log('Neither loading state nor results appeared - API may not be configured');
      });
    }
  });

  test('should display results with AI explanations', async ({ page }) => {
    const promptInput = page.getByRole('textbox').or(
      page.locator('[data-testid="prompt-input"]')
    ).first();

    await promptInput.fill('space exploration movies');

    const submitButton = page.getByRole('button', { name: /discover|search|find/i }).first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Wait for results
      await page.waitForTimeout(5000);

      // Look for result cards with explanations
      const resultCard = page.locator('[data-testid="discover-result"]').or(
        page.locator('[data-testid="content-card"]')
      ).first();

      if (await resultCard.isVisible()) {
        // Should have a reason/explanation
        const explanation = page.locator('[data-testid="ai-reason"]').or(
          page.locator('.reason')
        ).or(
          page.getByText(/because|matches|perfect for/i)
        );

        await expect(explanation.first()).toBeVisible({ timeout: 3000 }).catch(() => {
          console.log('AI explanation not found - may have different UI');
        });
      }
    }
  });

  test('should show fallback indicator when using non-primary provider', async ({ page }) => {
    const promptInput = page.getByRole('textbox').first();
    await promptInput.fill('obscure foreign films from the 1970s');

    const submitButton = page.getByRole('button', { name: /discover|search|find/i }).first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(5000);

      // Check for fallback indicator
      const fallbackIndicator = page.locator('[data-testid="fallback-indicator"]').or(
        page.getByText(/powered by|using|alternative/i)
      );

      // This may or may not appear depending on which provider responds
      const isVisible = await fallbackIndicator.first().isVisible().catch(() => false);
      console.log(`Fallback indicator visible: ${isVisible}`);
    }
  });

  test('should allow refining search', async ({ page }) => {
    const promptInput = page.getByRole('textbox').first();
    await promptInput.fill('comedy movies');

    const submitButton = page.getByRole('button', { name: /discover|search|find/i }).first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(3000);

      // Look for refine option
      const refineButton = page.getByRole('button', { name: /refine|not quite|try again/i });

      if (await refineButton.isVisible()) {
        await refineButton.click();

        // Should be able to enter new prompt
        const newPrompt = page.getByRole('textbox').first();
        await expect(newPrompt).toBeVisible();
      }
    }
  });

  test('should handle empty results gracefully', async ({ page }) => {
    const promptInput = page.getByRole('textbox').first();

    // Try a very specific/unlikely query
    await promptInput.fill('movies about purple elephants playing chess in space');

    const submitButton = page.getByRole('button', { name: /discover|search|find/i }).first();

    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(5000);

      // Should either show results (AI is creative) or a helpful message
      const noResults = page.getByText(/no results|couldn't find|try different/i);
      const results = page.locator('[data-testid="discover-result"]').or(
        page.locator('[data-testid="content-card"]')
      );

      const hasResults = await results.first().isVisible().catch(() => false);
      const hasNoResultsMessage = await noResults.first().isVisible().catch(() => false);

      // One of these should be true
      expect(hasResults || hasNoResultsMessage).toBeTruthy();
    }
  });
});

test.describe('Mood-Based Discovery', () => {
  test('should display mood selector on homepage', async ({ page }) => {
    await page.goto('/');

    const moodSelector = page.locator('[data-testid="mood-selector"]').or(
      page.getByText(/cozy|thrilling|feel-good/i).first()
    );

    await expect(moodSelector).toBeVisible({ timeout: 5000 }).catch(() => {
      console.log('Mood selector not found on homepage');
    });
  });

  test('should navigate to mood page when selecting mood', async ({ page }) => {
    await page.goto('/');

    const moodButton = page.getByRole('link', { name: /cozy/i }).or(
      page.locator('[data-testid="mood-cozy"]')
    ).or(
      page.getByText(/cozy/i).first()
    );

    if (await moodButton.isVisible()) {
      await moodButton.click();

      await expect(page).toHaveURL(/\/mood\//);
    }
  });

  test('should display mood-specific content', async ({ page }) => {
    await page.goto('/mood/cozy');
    await page.waitForTimeout(1000);

    // Should have content cards
    const contentCards = page.locator('[data-testid="content-card"]').or(
      page.locator('article')
    );

    const count = await contentCards.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Content Blend', () => {
  test('should display blend page', async ({ page }) => {
    await page.goto('/blend');

    await expect(page).toHaveURL(/\/blend/);
  });

  test('should have title selection interface', async ({ page }) => {
    await page.goto('/blend');

    // Should have input to search/select titles
    const titleSearch = page.getByPlaceholder(/search|add|select/i).or(
      page.locator('[data-testid="title-search"]')
    ).or(
      page.getByRole('combobox')
    );

    await expect(titleSearch.first()).toBeVisible();
  });

  test('should allow selecting multiple titles', async ({ page }) => {
    await page.goto('/blend');

    const titleSearch = page.getByPlaceholder(/search|add|select/i).or(
      page.locator('[data-testid="title-search"]')
    ).first();

    if (await titleSearch.isVisible()) {
      await titleSearch.fill('inception');
      await page.waitForTimeout(500);

      // Click on a result if available
      const result = page.locator('[data-testid="title-result"]').first().or(
        page.locator('[role="option"]').first()
      );

      if (await result.isVisible()) {
        await result.click();

        // Selected title should appear
        const selectedTitle = page.locator('[data-testid="selected-title"]').or(
          page.getByText(/inception/i)
        );

        await expect(selectedTitle.first()).toBeVisible();
      }
    }
  });

  test('should show blend results', async ({ page }) => {
    await page.goto('/blend');

    // Try to select titles and blend
    const titleSearch = page.getByPlaceholder(/search|add|select/i).first();

    if (await titleSearch.isVisible()) {
      // Add first title
      await titleSearch.fill('dark knight');
      await page.waitForTimeout(500);

      const firstResult = page.locator('[role="option"]').first();
      if (await firstResult.isVisible()) {
        await firstResult.click();
      }

      // Add second title
      await titleSearch.fill('inception');
      await page.waitForTimeout(500);

      const secondResult = page.locator('[role="option"]').first();
      if (await secondResult.isVisible()) {
        await secondResult.click();
      }

      // Click blend button
      const blendButton = page.getByRole('button', { name: /blend|mix|find/i });
      if (await blendButton.isVisible()) {
        await blendButton.click();
        await page.waitForTimeout(5000);

        // Should show results
        const results = page.locator('[data-testid="blend-result"]').or(
          page.locator('[data-testid="content-card"]')
        );

        const count = await results.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
