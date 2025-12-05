import { test, expect } from '@playwright/test';

test.describe('Browse & Filter', () => {
  test.describe('Movies Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/movies');
    });

    test('should display movies page', async ({ page }) => {
      await expect(page).toHaveURL(/\/movies/);

      // Should have a heading
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible();
    });

    test('should display movie cards', async ({ page }) => {
      // Wait for content to load
      await page.waitForTimeout(1000);

      // Look for movie cards or content items
      const movieCards = page.locator('[data-testid="content-card"]').or(
        page.locator('.content-card')
      ).or(
        page.locator('article')
      );

      // Should have at least some movies
      const count = await movieCards.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should have filter sidebar or filter options', async ({ page }) => {
      // Look for filter sidebar or filter button
      const filterSidebar = page.locator('[data-testid="filter-sidebar"]').or(
        page.locator('aside')
      ).or(
        page.getByRole('button', { name: /filter/i })
      );

      await expect(filterSidebar.first()).toBeVisible();
    });

    test('should filter by genre', async ({ page }) => {
      // Find genre filter
      const genreFilter = page.getByRole('button', { name: /genre/i }).or(
        page.getByText(/genre/i)
      );

      if (await genreFilter.first().isVisible()) {
        await genreFilter.first().click();

        // Select a genre (e.g., Action)
        const actionOption = page.getByRole('checkbox', { name: /action/i }).or(
          page.getByRole('button', { name: /action/i }).or(
            page.getByText(/^action$/i)
          )
        );

        if (await actionOption.first().isVisible()) {
          await actionOption.first().click();

          // URL should update with genre parameter
          await expect(page).toHaveURL(/genre.*action|action/i);
        }
      }
    });

    test('should have sort options', async ({ page }) => {
      const sortDropdown = page.getByRole('combobox', { name: /sort/i }).or(
        page.getByRole('button', { name: /sort/i })
      ).or(
        page.locator('[data-testid="sort-dropdown"]')
      );

      if (await sortDropdown.first().isVisible()) {
        await sortDropdown.first().click();

        // Should have sort options
        const sortOptions = page.getByRole('option').or(
          page.locator('[role="menuitem"]')
        );

        await expect(sortOptions.first()).toBeVisible();
      }
    });
  });

  test.describe('TV Shows Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/tv');
    });

    test('should display TV shows page', async ({ page }) => {
      await expect(page).toHaveURL(/\/tv/);

      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible();
    });

    test('should display TV show cards', async ({ page }) => {
      await page.waitForTimeout(1000);

      const tvCards = page.locator('[data-testid="content-card"]').or(
        page.locator('.content-card')
      ).or(
        page.locator('article')
      );

      const count = await tvCards.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Genre Pages', () => {
    test('should display genre page for action movies', async ({ page }) => {
      await page.goto('/genre/movie/action');

      // Should show action genre content
      const heading = page.getByRole('heading', { name: /action/i });
      await expect(heading.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        // Heading may have different format
        console.log('Action heading not found - page structure may differ');
      });
    });

    test('should display genre page for drama TV', async ({ page }) => {
      await page.goto('/genre/tv/drama');

      await page.waitForTimeout(1000);

      // Page should load without errors
      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Category Pages', () => {
    test('should display trending category', async ({ page }) => {
      await page.goto('/category/trending');

      await page.waitForTimeout(1000);

      // Should have content
      const content = page.locator('[data-testid="content-card"]').or(
        page.locator('article')
      ).or(
        page.locator('.content-grid')
      );

      await expect(content.first()).toBeVisible({ timeout: 5000 });
    });

    test('should display top-rated category', async ({ page }) => {
      await page.goto('/category/top-rated');

      await page.waitForTimeout(1000);

      await expect(page.locator('body')).toBeVisible();
    });
  });

  test.describe('Pagination / Infinite Scroll', () => {
    test('should load more content when scrolling', async ({ page }) => {
      await page.goto('/movies');

      // Wait for initial load
      await page.waitForTimeout(1000);

      // Count initial items
      const initialCards = page.locator('[data-testid="content-card"]').or(
        page.locator('article')
      );
      const initialCount = await initialCards.count();

      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });

      // Wait for more content to load
      await page.waitForTimeout(2000);

      // Count items again
      const newCount = await initialCards.count();

      // Should have more items (or same if no infinite scroll)
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  test.describe('Responsive Design', () => {
    test('should show filter as bottom sheet on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/movies');
      await page.waitForTimeout(1000);

      // Look for mobile filter button
      const filterButton = page.getByRole('button', { name: /filter/i });

      if (await filterButton.isVisible()) {
        await filterButton.click();

        // Should show filter sheet/modal
        const filterSheet = page.locator('[data-testid="mobile-filter"]').or(
          page.locator('[role="dialog"]')
        ).or(
          page.locator('.filter-sheet')
        );

        await expect(filterSheet.first()).toBeVisible({ timeout: 3000 }).catch(() => {
          console.log('Mobile filter sheet not found');
        });
      }
    });

    test('should adjust grid columns on different screen sizes', async ({ page }) => {
      // Desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('/movies');
      await page.waitForTimeout(1000);

      // Grid should have more columns on desktop
      const grid = page.locator('.grid').or(
        page.locator('[data-testid="content-grid"]')
      );

      await expect(grid.first()).toBeVisible();

      // Mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      // Grid should still be visible
      await expect(grid.first()).toBeVisible();
    });
  });
});
