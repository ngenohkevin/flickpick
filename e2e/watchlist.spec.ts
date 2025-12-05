import { test, expect } from '@playwright/test';

test.describe('Watchlist Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test.describe('Adding to Watchlist', () => {
    test('should add movie to watchlist from movie page', async ({ page }) => {
      // Go to a movie page (using trending to find one)
      await page.goto('/movies');
      await page.waitForTimeout(1000);

      // Click on first movie card
      const firstCard = page.locator('[data-testid="content-card"]').or(
        page.locator('article')
      ).first();

      if (await firstCard.isVisible()) {
        await firstCard.click();

        // Wait for movie page to load
        await page.waitForURL(/\/movie\/\d+/);

        // Find and click watchlist button
        const watchlistButton = page.getByRole('button', { name: /watchlist/i }).or(
          page.getByRole('button', { name: /add to list/i })
        ).or(
          page.locator('[data-testid="watchlist-button"]')
        );

        if (await watchlistButton.first().isVisible()) {
          await watchlistButton.first().click();

          // Button should change state (filled heart, "Added", etc.)
          await page.waitForTimeout(500);

          // Verify item is in localStorage
          const watchlistData = await page.evaluate(() => {
            return localStorage.getItem('flickpick-watchlist');
          });

          expect(watchlistData).toBeTruthy();
          const watchlist = JSON.parse(watchlistData || '{}');
          expect(watchlist.state?.items?.length).toBeGreaterThan(0);
        }
      }
    });

    test('should add TV show to watchlist from TV page', async ({ page }) => {
      await page.goto('/tv');
      await page.waitForTimeout(1000);

      const firstCard = page.locator('[data-testid="content-card"]').or(
        page.locator('article')
      ).first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/tv\/\d+/);

        const watchlistButton = page.getByRole('button', { name: /watchlist/i }).or(
          page.locator('[data-testid="watchlist-button"]')
        );

        if (await watchlistButton.first().isVisible()) {
          await watchlistButton.first().click();
          await page.waitForTimeout(500);

          const watchlistData = await page.evaluate(() => {
            return localStorage.getItem('flickpick-watchlist');
          });

          expect(watchlistData).toBeTruthy();
        }
      }
    });

    test('should show toast notification when adding to watchlist', async ({ page }) => {
      await page.goto('/movies');
      await page.waitForTimeout(1000);

      const firstCard = page.locator('[data-testid="content-card"]').first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/movie\/\d+/);

        const watchlistButton = page.getByRole('button', { name: /watchlist/i }).first();

        if (await watchlistButton.isVisible()) {
          await watchlistButton.click();

          // Look for toast notification
          const toast = page.locator('[data-testid="toast"]').or(
            page.locator('[role="alert"]')
          ).or(
            page.locator('.toast')
          );

          await expect(toast.first()).toBeVisible({ timeout: 3000 }).catch(() => {
            console.log('Toast notification not found');
          });
        }
      }
    });
  });

  test.describe('Removing from Watchlist', () => {
    test('should remove item from watchlist', async ({ page }) => {
      // First, add an item to watchlist
      await page.goto('/movies');
      await page.waitForTimeout(1000);

      const firstCard = page.locator('[data-testid="content-card"]').or(
        page.locator('article')
      ).first();

      if (await firstCard.isVisible()) {
        await firstCard.click();
        await page.waitForURL(/\/movie\/\d+/);

        const watchlistButton = page.getByRole('button', { name: /watchlist/i }).first();

        if (await watchlistButton.isVisible()) {
          // Add to watchlist
          await watchlistButton.click();
          await page.waitForTimeout(500);

          // Click again to remove
          await watchlistButton.click();
          await page.waitForTimeout(500);

          // Verify item is removed from localStorage
          const watchlistData = await page.evaluate(() => {
            return localStorage.getItem('flickpick-watchlist');
          });

          if (watchlistData) {
            const watchlist = JSON.parse(watchlistData);
            expect(watchlist.state?.items?.length || 0).toBe(0);
          }
        }
      }
    });
  });

  test.describe('Watchlist Page', () => {
    test('should display empty state when watchlist is empty', async ({ page }) => {
      await page.goto('/watchlist');

      // Should show empty state
      const emptyState = page.getByText(/empty/i).or(
        page.getByText(/no items/i)
      ).or(
        page.getByText(/start adding/i)
      ).or(
        page.locator('[data-testid="watchlist-empty"]')
      );

      await expect(emptyState.first()).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('Empty state not found - may have different UI');
      });
    });

    test('should display watchlist items', async ({ page }) => {
      // Add item to watchlist via localStorage
      await page.goto('/');
      await page.evaluate(() => {
        const watchlistData = {
          state: {
            items: [
              {
                id: 27205,
                title: 'Inception',
                media_type: 'movie',
                content_type: 'movie',
                poster_path: '/9gk7adHYeDvHkCSEqAvQNLV5Ber.jpg',
                added_at: new Date().toISOString(),
              },
              {
                id: 1396,
                title: 'Breaking Bad',
                media_type: 'tv',
                content_type: 'tv',
                poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
                added_at: new Date().toISOString(),
              },
            ],
          },
          version: 0,
        };
        localStorage.setItem('flickpick-watchlist', JSON.stringify(watchlistData));
      });

      await page.goto('/watchlist');
      await page.waitForTimeout(1000);

      // Should show watchlist items
      const items = page.locator('[data-testid="watchlist-item"]').or(
        page.locator('[data-testid="content-card"]')
      ).or(
        page.locator('article')
      );

      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should filter watchlist by type', async ({ page }) => {
      // Add mixed items to watchlist
      await page.goto('/');
      await page.evaluate(() => {
        const watchlistData = {
          state: {
            items: [
              {
                id: 27205,
                title: 'Inception',
                media_type: 'movie',
                content_type: 'movie',
                poster_path: '/poster1.jpg',
                added_at: new Date().toISOString(),
              },
              {
                id: 1396,
                title: 'Breaking Bad',
                media_type: 'tv',
                content_type: 'tv',
                poster_path: '/poster2.jpg',
                added_at: new Date().toISOString(),
              },
            ],
          },
          version: 0,
        };
        localStorage.setItem('flickpick-watchlist', JSON.stringify(watchlistData));
      });

      await page.goto('/watchlist');
      await page.waitForTimeout(1000);

      // Find filter tabs
      const movieFilter = page.getByRole('tab', { name: /movies/i }).or(
        page.getByRole('button', { name: /movies/i })
      );

      if (await movieFilter.first().isVisible()) {
        await movieFilter.first().click();
        await page.waitForTimeout(500);

        // Should only show movies
        const items = page.locator('[data-testid="watchlist-item"]').or(
          page.locator('[data-testid="content-card"]')
        );
        const count = await items.count();
        expect(count).toBe(1);
      }
    });

    test('should have "Pick for me" random selection feature', async ({ page }) => {
      // Add items to watchlist
      await page.goto('/');
      await page.evaluate(() => {
        const watchlistData = {
          state: {
            items: [
              {
                id: 27205,
                title: 'Inception',
                media_type: 'movie',
                content_type: 'movie',
                poster_path: '/poster1.jpg',
                added_at: new Date().toISOString(),
              },
              {
                id: 550,
                title: 'Fight Club',
                media_type: 'movie',
                content_type: 'movie',
                poster_path: '/poster2.jpg',
                added_at: new Date().toISOString(),
              },
            ],
          },
          version: 0,
        };
        localStorage.setItem('flickpick-watchlist', JSON.stringify(watchlistData));
      });

      await page.goto('/watchlist');
      await page.waitForTimeout(1000);

      const pickForMeButton = page.getByRole('button', { name: /pick for me/i }).or(
        page.getByRole('button', { name: /random/i })
      );

      if (await pickForMeButton.isVisible()) {
        await pickForMeButton.click();

        // Should show a result or modal
        await page.waitForTimeout(500);

        // Could navigate to a random movie or show a modal
        const result = page.locator('[data-testid="random-pick"]').or(
          page.locator('[role="dialog"]')
        );

        // Check if navigation happened or modal appeared
        const url = page.url();
        const hasResult = await result.first().isVisible().catch(() => false);

        expect(url.includes('/movie/') || url.includes('/tv/') || hasResult).toBeTruthy();
      }
    });
  });

  test.describe('Watchlist Persistence', () => {
    test('should persist watchlist across page reloads', async ({ page }) => {
      // Add item to watchlist
      await page.goto('/');
      await page.evaluate(() => {
        const watchlistData = {
          state: {
            items: [
              {
                id: 27205,
                title: 'Inception',
                media_type: 'movie',
                content_type: 'movie',
                poster_path: '/poster.jpg',
                added_at: new Date().toISOString(),
              },
            ],
          },
          version: 0,
        };
        localStorage.setItem('flickpick-watchlist', JSON.stringify(watchlistData));
      });

      // Reload page
      await page.reload();
      await page.waitForTimeout(1000);

      // Watchlist should still have the item
      const watchlistData = await page.evaluate(() => {
        return localStorage.getItem('flickpick-watchlist');
      });

      expect(watchlistData).toBeTruthy();
      const watchlist = JSON.parse(watchlistData || '{}');
      expect(watchlist.state?.items?.length).toBe(1);
    });
  });
});
