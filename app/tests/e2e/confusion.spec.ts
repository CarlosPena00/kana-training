import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { advance } from './copy-gate';

/**
 * Feature 004, the parts only a rendered page can prove: that the two characters are legible and
 * do not push the input, that the retry never leaks the answer, and that nothing is stored.
 *
 * Contract cases 25-31 in specs/004-confused-kana-feedback/contracts/answer-diagnosis.md.
 */

const MISTAKES_KEY = 'kana-training.mistakes';

const freshApp = async (page: Page) => {
  await page.goto('/');
  await page.evaluate((key) => window.localStorage.removeItem(key), MISTAKES_KEY);
  await page.reload();
};

/** Restricts the quiz to one row so the card that appears is predictable. */
const quizOn = async (page: Page, group: string, direction: string, attempts = false) => {
  await page.getByRole('radio', { name: direction }).locator('..').click();
  if (attempts) await page.getByRole('checkbox', { name: /Allow 3 attempts/ }).locator('..').click();
  await page.getByRole('checkbox', { name: 'All Main Kana' }).uncheck();
  await page.getByRole('checkbox', { name: new RegExp(`^${group} `) }).locator('..').click();
  await page.getByRole('button', { name: '5', exact: true }).click();
  await page.getByRole('button', { name: 'Start quiz' }).click();
};

/**
 * Answers cards until the wanted prompt shows, then submits `answer`.
 *
 * With three attempts enabled a wrong answer keeps the card open rather than advancing, so
 * skipping a card means answering it wrongly until its attempts are spent.
 */
const answerCardShowing = async (page: Page, prompt: string, answer: string, attempts = 1) => {
  for (let card = 1; card <= 5; card += 1) {
    const shown = (await page.locator('.flashcard__prompt').textContent())?.trim();
    if (shown === prompt) {
      await page.getByLabel(/Type the/).fill(answer);
      await page.getByRole('button', { name: 'Check' }).click();
      return true;
    }
    for (let try_ = 0; try_ < attempts; try_ += 1) {
      await page.getByLabel(/Type the/).fill('zzz');
      await page.getByRole('button', { name: 'Check' }).click();
    }
    await advance(page, card === 5 ? 'See results' : 'Next card');
  }
  return false;
};

test('case 25: a wrong reading names the kana it belongs to', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');

  expect(await answerCardShowing(page, 'ろ', 'ru')).toBe(true);

  await expect(page.getByText('You wrote', { exact: true })).toBeVisible();
  await expect(page.getByText('The answer', { exact: true })).toBeVisible();
  // Both characters, each with its reading.
  await expect(page.locator('.answer-note__kana').filter({ hasText: 'る' })).toBeVisible();
  await expect(page.locator('.answer-note__kana').filter({ hasText: 'ろ' })).toBeVisible();
  await expect(page.locator('.answer-note__romaji').filter({ hasText: 'ru' })).toBeVisible();
});

test('case 31: an answer that is not a reading gets no note at all', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();

  await expect(page.getByText('✕ Incorrect')).toBeVisible();
  await expect(page.locator('.answer-note')).toHaveCount(0);
  // The ordinary mapping line is still there when no confusion replaces it.
  await expect(page.locator('.feedback__mapping')).toBeVisible();
});

test('case 26: the note does not move the answer input', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');

  const input = page.getByLabel(/Type the/);
  const before = await input.boundingBox();

  expect(await answerCardShowing(page, 'ろ', 'ru')).toBe(true);
  await expect(page.locator('.answer-note')).toBeVisible();

  const after = await input.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  // Feature 001 fixed the card area precisely so the soft keyboard stays put; a note that grows
  // the stage would undo that (FR-013).
  expect(Math.abs(after!.y - before!.y)).toBeLessThanOrEqual(1);

  // Nothing clipped, no sideways scroll.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('case 30: the note is announced as one statement and passes the audit', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');
  expect(await answerCardShowing(page, 'ろ', 'ru')).toBe(true);

  const note = page.locator('.answer-note');
  await expect(note).toHaveAttribute('aria-label', /You mixed these up.*answer was ろ.*wrote る/);

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(results.violations).toEqual([]);
});

/**
 * The rule that would break the three-attempt mode silently if it regressed: nothing failing, just
 * the answer quietly handed over (FR-015a, SC-005a).
 */
test('case 27: a retry names what you wrote and never the answer', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji', true);

  expect(await answerCardShowing(page, 'ろ', 'ru', 3)).toBe(true);

  await expect(page.getByText(/You wrote/)).toBeVisible();
  await expect(page.locator('.answer-note__kana').filter({ hasText: 'る' })).toBeVisible();

  // The answer must be nowhere on screen. On a Kana -> Romaji card the answer is the reading
  // `ro`; the character ろ is the prompt itself and is legitimately visible.
  const body = (await page.locator('body').textContent()) ?? '';
  expect(body).not.toMatch(/\bro\b/);
  await expect(page.getByText('The answer', { exact: true })).toBeHidden();
  await expect(page.locator('.answer-note--pair')).toHaveCount(0);
});

test('case 28: a spelling note is withheld when it would state the answer', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'さ', 'Kana → Romaji', true);

  expect(await answerCardShowing(page, 'し', 'si', 3)).toBe(true);

  // "this app spells it shi" is the answer, so nothing may be said at all.
  await expect(page.locator('.answer-note')).toHaveCount(0);
  const body = (await page.locator('body').textContent()) ?? '';
  expect(body).not.toMatch(/\bshi\b/);
});

test('a spelling note does appear when it gives nothing away', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji', true);

  expect(await answerCardShowing(page, 'ろ', 'si', 3)).toBe(true);

  await expect(page.getByText(/this app spells it/)).toBeVisible();
  await expect(page.getByText('shi', { exact: true })).toBeVisible();
});

test('case 29: in a correction round the kana named belongs to the card', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (key) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          entries: [
            { script: 'katakana', kana: 'ロ', missCount: 3, streak: 0, lastMissedAt: '2026-08-01T10:00:00.000Z' },
          ],
        }),
      ),
    MISTAKES_KEY,
  );
  await page.reload();

  // Selected script is Hiragana; the card is Katakana, and the card must win (FR-002, FR-017).
  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('button', { name: /Your mistakes/ }).click();
  await page.getByRole('button', { name: 'Practise these' }).click();

  await page.getByLabel(/Type the/).fill('ru');
  await page.getByRole('button', { name: 'Check' }).click();

  await expect(page.locator('.answer-note__kana').filter({ hasText: 'ル' })).toBeVisible();
  await expect(page.locator('.answer-note__kana').filter({ hasText: 'る' })).toHaveCount(0);
});

test('the script note names the alphabet, and is still wrong', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Romaji → Kana');

  for (let card = 1; card <= 5; card += 1) {
    const prompt = (await page.locator('.flashcard__prompt').textContent())?.trim();
    if (prompt === 'ro') {
      await page.getByLabel(/Type the/).fill('ロ');
      await page.getByRole('button', { name: 'Check' }).click();
      await expect(page.getByText(/Right sound, wrong script/)).toBeVisible();
      await expect(page.getByText('✕ Incorrect')).toBeVisible();
      return;
    }
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await advance(page, card === 5 ? 'See results' : 'Next card');
  }
  throw new Error('the ro card never appeared');
});

test('this feature stores nothing (FR-022)', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');
  expect(await answerCardShowing(page, 'ろ', 'ru')).toBe(true);

  const keys = await page.evaluate(() => Object.keys(window.localStorage).sort());
  expect(keys.every((k) => k === 'kana-training.preferences' || k === 'kana-training.mistakes')).toBe(true);
});
