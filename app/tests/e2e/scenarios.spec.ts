import { expect, test, type Page } from '@playwright/test';
import { advance } from './copy-gate';

/**
 * The quickstart.md validation scenarios that can be driven automatically.
 * V6 (offline + installable) and V7 (repeat + persistence) need a real browser, so they live here
 * rather than in the Vitest suites.
 */

const selectOnly = async (page: Page, groupLabels: readonly string[]) => {
  await page.getByRole('checkbox', { name: 'All Main Kana' }).uncheck();
  for (const label of groupLabels) {
    await page.getByRole('checkbox', { name: label }).locator('..').click();
  }
};

test('V2 — a custom practice set draws only from the selected groups', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['か 5 kana', 'さ 5 kana']);
  await expect(page.getByText('10 unique kana selected')).toBeVisible();

  // 20 cards from a 10-kana pool must be unavailable (FR-011, FR-012).
  await expect(page.getByRole('button', { name: '20', exact: true })).toBeDisabled();

  await page.getByRole('button', { name: '10', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  const allowed = new Set('かきくけこさしすせそ'.split(''));
  const allowedRomaji = new Set(['ka', 'ki', 'ku', 'ke', 'ko', 'sa', 'shi', 'su', 'se', 'so']);
  const seen: string[] = [];
  for (let card = 0; card < 10; card += 1) {
    const prompt = ((await page.locator('.flashcard__prompt').textContent()) ?? '').trim();
    expect(allowed.has(prompt) || allowedRomaji.has(prompt)).toBe(true);
    seen.push(prompt);
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await advance(page, card === 9 ? 'See results' : 'Next card');
  }
  // No kana repeats, regardless of the direction each card received (FR-016).
  expect(new Set(seen).size).toBe(10);
});

test('V4 — each direction setting produces the right prompts', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['か 5 kana']);
  await page.getByRole('button', { name: '5', exact: true }).click();

  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  for (let i = 0; i < 5; i += 1) {
    const prompt = ((await page.locator('.flashcard__prompt').textContent()) ?? '').trim();
    expect(prompt).toMatch(/^[぀-ヿ]+$/);
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await advance(page, i === 4 ? 'See results' : 'Next card');
  }

  await page.getByRole('button', { name: 'Back to home' }).click();
  await page.getByRole('radio', { name: 'Romaji → Kana' }).locator('..').click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  for (let i = 0; i < 5; i += 1) {
    const prompt = ((await page.locator('.flashcard__prompt').textContent()) ?? '').trim();
    expect(prompt).toMatch(/^[a-z]+$/);
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await advance(page, i === 4 ? 'See results' : 'Next card');
  }
});

test('V5 — case, whitespace and correctness rules hold in the real UI', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['あ 5 kana']);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  const prompt = ((await page.locator('.flashcard__prompt').textContent()) ?? '').trim();
  const romaji = { あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' }[prompt as 'あ'] ?? 'a';

  // Uppercase with surrounding whitespace must still be accepted (FR-025, FR-026).
  await page.getByLabel(/Type the/).fill(`  ${romaji.toUpperCase()}  `);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('✓ Correct')).toBeVisible();
});

test('V7 — practice again reuses the configuration, and settings survive a reload', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['か 5 kana']);
  await page.getByRole('radio', { name: 'Katakana' }).locator('..').click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  for (let i = 0; i < 5; i += 1) {
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await advance(page, i === 4 ? 'See results' : 'Next card');
  }

  await page.getByRole('button', { name: 'Practice again' }).click();
  await expect(page.getByText(/Question 1 \/ 5/)).toBeVisible();
  await expect(page.getByText('✓ 0')).toBeVisible();

  // Reopening restores the last-used configuration (FR-037).
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Katakana' })).toBeChecked();
  await expect(page.getByText('5 unique kana selected')).toBeVisible();
  await expect(page.getByRole('button', { name: '5', exact: true })).toHaveAttribute('aria-pressed', 'true');

  // Cleared storage falls back to defaults without an error (FR-037).
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Hiragana' })).toBeChecked();
  await expect(page.getByText('46 unique kana selected')).toBeVisible();
});

test('V6 — the app still works after going offline and reloading (FR-035a, SC-006)', async ({ page, context }) => {
  await page.goto('/');
  // The worker installs on the first visit but only controls the page from the next navigation on,
  // which is exactly the "close the browser and come back" case FR-035a describes.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Kana Flashcards' })).toBeVisible();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.getByText(/Question 1 \/ 10/)).toBeVisible();

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('✕ Incorrect')).toBeVisible();

  await context.setOffline(false);
});

test('V6 — the web app declares what it needs to be installable', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).toBeTruthy();

  const manifest = await (await request.get(href!)).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.name).toBe('Kana Flashcards');
  expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(true);

  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src.replace(/^\//, '')}`)).status()).toBe(200);
  }
});

test('V9 — three attempts let a learner retry before the answer is revealed', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['あ 5 kana']);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('checkbox', { name: /Allow 3 attempts/ }).check();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  const answerFor = (prompt: string) =>
    ({ あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o' })[prompt as 'あ'] ?? 'a';

  // First card: wrong twice, then right — the answer is never revealed along the way.
  const first = ((await page.locator('.flashcard__prompt').textContent()) ?? '').trim();
  for (const attemptsLeft of [2, 1]) {
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByLabel(/Type the/).press('Enter');
    await expect(page.getByText('Not quite')).toBeVisible();
    await expect(page.getByText(`${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left`)).toBeVisible();
    await expect(page.getByText('✕ Incorrect')).toBeHidden();
    await expect(page.getByText(/Correct answer/)).toBeHidden();
    await expect(page.getByText(/Question 1 \/ 5/)).toBeVisible();
  }

  await page.getByLabel(/Type the/).fill(answerFor(first));
  await page.getByLabel(/Type the/).press('Enter');
  await expect(page.getByText('✓ Correct')).toBeVisible();
  await expect(page.getByText(/On the third attempt/)).toBeVisible();
  await advance(page, 'Next card');

  // Remaining four cards: wrong three times each, so the answer is revealed on the third.
  for (let card = 2; card <= 5; card += 1) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await page.getByLabel(/Type the/).fill('zzz');
      await page.getByLabel(/Type the/).press('Enter');
      // Wait for the retry state before typing again: the input clears on each attempt, and
      // typing into it mid-clear would submit a blank, which the app correctly ignores.
      if (attempt < 3) {
        await expect(page.getByText(`${3 - attempt} attempt${attempt === 2 ? '' : 's'} left`)).toBeVisible();
      }
    }
    await expect(page.getByText('✕ Incorrect')).toBeVisible();
    // The third wrong attempt reveals the answer (FR-045) and the card holds there until it is
    // written — `advance` does the writing, as a learner has to.
    await expect(page.getByText('Type it to continue.')).toBeVisible();
    await advance(page, card === 5 ? 'See results' : 'Next card');
  }

  // One card solved on attempt 3 = 1/3 point out of 5 cards = 7%.
  await expect(page.getByRole('heading', { name: 'Quiz complete' })).toBeVisible();
  await expect(page.getByText('0.33 / 5 points')).toBeVisible();
  await expect(page.getByText('7%')).toBeVisible();
  await expect(page.getByText('✓ Correct: 1')).toBeVisible();
  await expect(page.getByText('Third try')).toBeVisible();
});

test('V9 — one attempt still reveals the answer immediately (unchanged default)', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('checkbox', { name: /Allow 3 attempts/ })).not.toBeChecked();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('✕ Incorrect')).toBeVisible();
  await expect(page.getByText('Not quite')).toBeHidden();
});

test('SC-004 — feedback renders within 100 ms of submitting', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start quiz' }).click();

  // Both timestamps are taken in the page: the keydown listener marks the submission and a
  // MutationObserver marks the moment the feedback lands, so the figure is the app's own work
  // rather than the test harness's round trips.
  await page.evaluate(() => {
    const w = window as unknown as { __t0?: number; __t1?: number };
    document.addEventListener('keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') w.__t0 = performance.now();
    }, { capture: true, once: true });

    const observer = new MutationObserver(() => {
      if (document.querySelector('.feedback')) {
        w.__t1 = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByLabel(/Type the/).press('Enter');
  await expect(page.getByText('✕ Incorrect')).toBeVisible();

  const elapsed = await page.evaluate(() => {
    const w = window as unknown as { __t0?: number; __t1?: number };
    return w.__t0 !== undefined && w.__t1 !== undefined ? w.__t1 - w.__t0 : -1;
  });

  expect(elapsed).toBeGreaterThanOrEqual(0);
  console.log(`  feedback latency: ${elapsed.toFixed(1)} ms`);
  expect(elapsed).toBeLessThan(100);
});

test('V10 — the quiz is timed silently and the time appears only in the results', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['あ 5 kana']);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('button', { name: '5', exact: true }).click();

  // Captured before the click, because the app starts its clock on the click itself.
  const started = Date.now();
  await page.getByRole('button', { name: 'Start quiz' }).click();
  // Wait for the quiz to actually render: <main> is persistent across screens, so reading it too
  // early would assert against the configuration screen and pass for the wrong reason.
  await expect(page.getByText(/Question 1 \/ 5/)).toBeVisible();

  const showsNoTimer = async (where: string) => {
    const text = (await page.locator('main').innerText()).toLowerCase();
    expect(text, `elapsed time leaked onto ${where}`).not.toMatch(/\d+\s*(s|sec|second|min)\b/);
    expect(text, `timing label leaked onto ${where}`).not.toContain('total time');
    expect(text, `timing label leaked onto ${where}`).not.toContain('per card');
  };

  await showsNoTimer('the question screen');

  for (let i = 0; i < 5; i += 1) {
    // A little think-time per card: without it the whole quiz finishes in under a second, and the
    // test cannot tell a working clock from one stuck at zero.
    await page.waitForTimeout(250);
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByLabel(/Type the/).press('Enter');
    // Spec acceptance scenario 1 covers the feedback panel as well as the card.
    await showsNoTimer('the feedback panel');
    await advance(page, i === 4 ? 'See results' : 'Next card');
  }
  const wallClock = Date.now() - started;

  await expect(page.getByRole('heading', { name: 'Quiz complete' })).toBeVisible();
  await expect(page.getByText('Total time')).toBeVisible();
  await expect(page.getByText('Per card')).toBeVisible();

  const totalText = (await page.locator('.results__timing-item').first().innerText()).split('\n')[1] ?? '';
  const seconds = /^(\d+):(\d{2})$/.test(totalText)
    ? Number(totalText.split(':')[0]) * 60 + Number(totalText.split(':')[1])
    : Number.parseFloat(totalText);

  expect(Number.isNaN(seconds), `could not parse "${totalText}"`).toBe(false);
  // Bounded on both sides: a clock stuck at zero must fail, and so must one that over-reports.
  expect(seconds).toBeGreaterThan(0);
  expect(seconds).toBeLessThanOrEqual(Math.ceil(wallClock / 1000) + 2);
});

test('V11 — Enter on the results screen starts another round', async ({ page }) => {
  await page.goto('/');
  await selectOnly(page, ['あ 5 kana']);
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();

  const finishQuiz = async () => {
    for (let i = 0; i < 5; i += 1) {
      await page.getByLabel(/Type the/).fill('zzz');
      await page.getByLabel(/Type the/).press('Enter');
      await advance(page, i === 4 ? 'See results' : 'Next card');
    }
    await expect(page.getByRole('heading', { name: 'Quiz complete' })).toBeVisible();
  };

  await finishQuiz();

  // Enter with nothing focused restarts, so a keyboard run never needs the mouse.
  await page.locator('body').press('Enter');
  await expect(page.getByText(/Question 1 \/ 5/)).toBeVisible();
  await expect(page.getByText('✓ 0')).toBeVisible();

  // A focused control keeps its own Enter: "Back to home" must go home, not restart.
  await finishQuiz();
  await page.getByRole('button', { name: 'Back to home' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Start quiz' })).toBeVisible();
  await expect(page.getByText(/Question 1 \/ 5/)).toBeHidden();
});
