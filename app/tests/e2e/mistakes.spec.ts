import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { HIRAGANA, KATAKANA } from '../../src/data';

/**
 * Feature 003, the parts that cannot be asserted headlessly: the forced-correction interaction,
 * the history screen's accessibility, and persistence across a reload.
 *
 * Each test starts from a clean store so one test's mistakes cannot leak into another's list.
 */

const MISTAKES_KEY = 'kana-training.mistakes';

const freshApp = async (page: Page) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), MISTAKES_KEY);
  await page.reload();
};

/** Answers `count` cards wrong from a freshly started default quiz, leaving the results screen. */
const missCards = async (page: Page, count: number) => {
  await page.getByRole('button', { name: 'Start quiz' }).click();
  for (let card = 1; card <= count; card += 1) {
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await page.getByRole('button', { name: card === count ? 'Quit quiz' : 'Next card' }).click();
  }
};

const openHistory = async (page: Page) => {
  await page.getByRole('button', { name: /Your mistakes/ }).click();
  await expect(page.getByRole('heading', { name: 'Your mistakes' })).toBeVisible();
};

test('a missed kana appears on the list with its reading (US1, FR-001, FR-015)', async ({ page }) => {
  await freshApp(page);
  await missCards(page, 2);
  await openHistory(page);

  await expect(page.getByText('2 still to work on')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  // Each row names its script, because ぬ and ヌ are separate entries (FR-016).
  await expect(page.getByText('Hiragana').first()).toBeVisible();
  await expect(page.getByText(/0 of 3 — 3 more in a row to clear/).first()).toBeVisible();
});

test('the list survives a reload (US1, FR-030)', async ({ page }) => {
  await freshApp(page);
  await missCards(page, 1);
  await openHistory(page);
  const row = (await page.getByRole('listitem').first().textContent()) ?? '';

  await page.reload();
  await openHistory(page);

  expect(await page.getByRole('listitem').first().textContent()).toBe(row);
});

test('an empty list explains itself rather than showing a bare zero (FR-018)', async ({ page }) => {
  await freshApp(page);
  await openHistory(page);

  await expect(page.getByText('Nothing here yet.')).toBeVisible();
  await expect(page.getByText(/correctly three times in a row/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete my history' })).toBeHidden();
});

test('the ordering is stated rather than left to be inferred (FR-017)', async ({ page }) => {
  await freshApp(page);
  await missCards(page, 2);
  await openHistory(page);

  await expect(page.getByText('Most missed first, then most recent.')).toBeVisible();
});

test('deleting the history asks first and keeps preferences (FR-038)', async ({ page }) => {
  await freshApp(page);
  await page.getByRole('radio', { name: 'Katakana' }).locator('..').click();
  await missCards(page, 1);
  await openHistory(page);

  await page.getByRole('button', { name: 'Delete my history' }).click();
  await expect(page.getByText(/cannot be undone/)).toBeVisible();

  await page.getByRole('button', { name: 'Keep it' }).click();
  await expect(page.getByRole('listitem')).toHaveCount(1);

  await page.getByRole('button', { name: 'Delete my history' }).click();
  await page.getByRole('button', { name: 'Delete everything' }).click();

  await expect(page.getByText('Nothing here yet.')).toBeVisible();
  // The script the learner chose is a preference, and must survive deleting the history.
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('radio', { name: 'Katakana' })).toBeChecked();
});

test('the list offers no way to delete a single entry (FR-013a)', async ({ page }) => {
  await freshApp(page);
  await missCards(page, 2);
  await openHistory(page);

  // An entry is earned onto the list and earned off it. A per-row delete would turn an honest
  // record of weakness into a list of what the learner is willing to admit to.
  const rowButtons = page.getByRole('listitem').getByRole('button');
  await expect(rowButtons).toHaveCount(0);
});

test('the history screen passes the WCAG 2.1 AA audit', async ({ page }) => {
  await freshApp(page);
  await missCards(page, 3);
  await openHistory(page);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

/** Seeds the list directly, so a correction-round test does not depend on quiz randomness. */
const seedMistakes = async (page: Page, entries: ReadonlyArray<{ script: string; kana: string }>) => {
  await page.goto('/');
  await page.evaluate(
    ({ key, entries }) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          entries: entries.map((e) => ({
            ...e,
            missCount: 3,
            streak: 0,
            lastMissedAt: '2026-08-01T10:00:00.000Z',
          })),
        }),
      ),
    { key: MISTAKES_KEY, entries: [...entries] },
  );
  await page.reload();
};

const startCorrection = async (page: Page) => {
  await openHistory(page);
  await page.getByRole('button', { name: 'Practise these' }).click();
  await expect(page.getByLabel(/Type the/)).toBeVisible();
};

test('round case 14: a wrong answer reveals the answer and keeps it visible (US2, FR-023a)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await startCorrection(page);

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();

  await expect(page.getByText('Not quite')).toBeVisible();
  await expect(page.getByText(/The answer is/)).toBeVisible();
  await expect(page.getByText(/Type it to continue/)).toBeVisible();
  // Still the same card — the round did not advance (FR-024).
  await expect(page.getByText(/Question 1 \/ 1/)).toBeVisible();

  // Wrong again: still held, answer still on screen, no "out of attempts" (FR-026).
  await page.getByLabel(/Type the/).fill('yyy');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/The answer is/)).toBeVisible();

  await page.getByLabel(/Type the/).fill('nu');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'See results' }).click();

  // Scored on the first submission: wrong on sight is wrong, however it ended (FR-029a, SC-005a).
  await expect(page.getByText('0 / 1 correct')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Back to your mistakes' })).toBeVisible();
});

test('round case 15: a romaji prompt names the script it wants (US2, FR-020c)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'katakana', kana: 'ヌ' }]);
  await page.getByRole('radio', { name: 'Romaji → Kana' }).locator('..').click();
  await startCorrection(page);

  await expect(page.getByText('write in')).toBeVisible();
  await expect(page.getByText('Katakana', { exact: true }).last()).toBeVisible();
  // The script is part of the prompt's accessible name, not a separate later announcement.
  await expect(page.getByLabel('nu — write in Katakana')).toBeVisible();

  // The right sound in the wrong script is wrong, not a near miss (FR-020d).
  await page.getByLabel(/Type the/).fill('ぬ');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/The answer is/)).toBeVisible();
});

test('a correction round mixes both scripts whatever is selected (US2, FR-020a)', async ({ page }) => {
  await seedMistakes(page, [
    { script: 'hiragana', kana: 'ぬ' },
    { script: 'katakana', kana: 'ヌ' },
  ]);
  // Selected script is Hiragana; the Katakana entry must still be drawn.
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await openHistory(page);
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Practise these' }).click();

  const seen: string[] = [];
  for (let card = 1; card <= 2; card += 1) {
    seen.push((await page.locator('.flashcard__prompt').textContent()) ?? '');
    await page.getByLabel(/Type the/).fill('nu');
    await page.getByRole('button', { name: 'Check' }).click();
    await page.getByRole('button', { name: card === 2 ? 'See results' : 'Next card' }).click();
  }
  expect(seen.sort()).toEqual(['ぬ', 'ヌ']);
});

test('round case 16: leaving is reachable from a held card (US2, FR-025)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await startCorrection(page);

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();

  const leave = page.getByRole('button', { name: 'Leave correction round' });
  await expect(leave).toBeVisible();
  await leave.click();
  await expect(page.getByRole('heading', { name: 'Your mistakes' })).toBeVisible();
});

test('the correction option is unavailable with an empty list (FR-021)', async ({ page }) => {
  await freshApp(page);
  await openHistory(page);
  await expect(page.getByRole('button', { name: 'Practise these' })).toBeHidden();
});

/** Reads the streak the app has stored for one entry, or null once it has been cleared. */
const readStreak = async (page: Page, kana: string) =>
  page.evaluate(
    ({ key, kana }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const entry = JSON.parse(raw).entries.find((e: { kana: string }) => e.kana === kana);
      return entry ? entry.streak : null;
    },
    { key: MISTAKES_KEY, kana },
  );

/** Waits for the stored streak to settle, since it is written from an effect after paint. */
const expectStreak = async (page: Page, kana: string, expected: number | null) => {
  await expect.poll(() => readStreak(page, kana), { timeout: 5000 }).toBe(expected);
};

test('a kana clears after three correct first answers in ordinary quizzes (US3, FR-009, FR-011)', async ({ page }) => {
  // Seeded with a single-kana selection so every card in the quiz is ぬ.
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('checkbox', { name: 'All Main Kana' }).uncheck();
  await page.getByRole('checkbox', { name: 'な 5 kana' }).locator('..').click();
  await page.getByRole('button', { name: '5', exact: true }).click();

  await expectStreak(page, 'ぬ', 0);

  // Every card is answered correctly, so only ぬ's streak moves and no new entry is created —
  // a correct answer on an untracked kana does nothing (FR-011).
  const NA_ROW: Record<string, string> = { な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no' };

  // Three correct first answers, in ordinary quizzes — no correction round involved (FR-011).
  for (let round = 1; round <= 3; round += 1) {
    await page.getByRole('button', { name: 'Start quiz' }).click();
    for (let card = 1; card <= 5; card += 1) {
      const prompt = (await page.locator('.flashcard__prompt').textContent()) ?? '';
      await page.getByLabel(/Type the/).fill(NA_ROW[prompt] ?? 'zzz');
      await page.getByRole('button', { name: 'Check' }).click();
      await page.getByRole('button', { name: card === 5 ? 'See results' : 'Next card' }).click();
    }
    await expectStreak(page, 'ぬ', round === 3 ? null : round);
    await page.getByRole('button', { name: 'Back to home' }).click();
  }

  await openHistory(page);
  await expect(page.getByText('Nothing here yet.')).toBeVisible();
});

test('a broken streak restarts from zero (US3, FR-008)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await startCorrection(page);

  await page.getByLabel(/Type the/).fill('nu');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'See results' }).click();
  await expectStreak(page, 'ぬ', 1);

  await page.getByRole('button', { name: 'Back to your mistakes' }).click();
  await page.getByRole('button', { name: 'Practise these' }).click();
  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/The answer is/)).toBeVisible();

  // Back to zero, not down to one — and the miss is counted.
  await expectStreak(page, 'ぬ', 0);
  await expect(page.getByText(/0 of 3 — 3 more in a row to clear/)).toBeHidden();
});

/**
 * SC-004, the regression this feature turns on. A correction round refuses to advance until the
 * card is right; if the forced correction counted, three rounds of wrong-then-copy would empty the
 * learner's whole list without them learning anything.
 */
test('wrong-then-copy never clears an entry (US3, SC-004)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();

  for (let round = 1; round <= 3; round += 1) {
    if (round === 1) await openHistory(page);
    await page.getByRole('button', { name: 'Practise these' }).click();

    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText(/The answer is/)).toBeVisible();
    // Copy the revealed answer, exactly as the round demands.
    await page.getByLabel(/Type the/).fill('nu');
    await page.getByRole('button', { name: 'Check' }).click();
    await page.getByRole('button', { name: 'See results' }).click();

    await expectStreak(page, 'ぬ', 0);
    await page.getByRole('button', { name: 'Back to your mistakes' }).click();
  }

  // Still there, three rounds later, with the misses counted rather than the copies.
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByText(/Missed 6 times/)).toBeVisible();
});

test('progress toward clearing is shown live on the row (US3, FR-015)', async ({ page }) => {
  await seedMistakes(page, [{ script: 'hiragana', kana: 'ぬ' }]);
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await startCorrection(page);

  await page.getByLabel(/Type the/).fill('nu');
  await page.getByRole('button', { name: 'Check' }).click();
  await page.getByRole('button', { name: 'See results' }).click();
  await page.getByRole('button', { name: 'Back to your mistakes' }).click();

  await expect(page.getByText(/1 of 3 — 2 more in a row to clear/)).toBeVisible();
});

test('round case 17: a worst-case list of 214 entries stays usable (SC-007)', async ({ page }) => {
  // Every kana in the dataset on the list at once — the largest it can ever be, since the list is
  // bounded by the dataset rather than by how long the app has been used.
  const all = [...HIRAGANA, ...KATAKANA].map((k) => ({ script: k.script, kana: k.kana }));
  expect(all).toHaveLength(214);
  await seedMistakes(page, all);

  const started = Date.now();
  await openHistory(page);
  await expect(page.getByText('214 still to work on')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(214);
  // Generous next to "indistinguishable from instant", but it fails loudly if the screen ever
  // acquires per-row work that does not scale.
  expect(Date.now() - started).toBeLessThan(3000);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);

  // Still startable at full size, and still refuses to pad beyond it (FR-027).
  await expect(page.getByRole('button', { name: 'Practise these' })).toBeEnabled();
});
