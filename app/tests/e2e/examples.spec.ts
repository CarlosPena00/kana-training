import { expect, test, type Page } from '@playwright/test';

/**
 * The example word, in a rendered page: that it appears when a card is missed, that it never
 * appears while the answer is still withheld, and that it does not push the answer input down.
 *
 * The word itself is chosen at random from the candidates for that character, so nothing here
 * asserts *which* word appears — only that whatever appears really contains the missed kana.
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

/** Answers cards until `prompt` is the one showing, then submits `answer`. */
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
    await page.getByRole('button', { name: card === 5 ? 'See results' : 'Next card' }).click();
  }
  return false;
};

test('a missed card shows a word that really uses the character', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'な', 'Kana → Romaji');

  expect(await answerCardShowing(page, 'ね', 'zzz')).toBe(true);

  const example = page.locator('.word-example');
  await expect(example).toBeVisible();

  // Whichever word was drawn, ね is in it — and the highlight points at that character.
  await expect(example.locator('.word-example__word')).toContainText('ね');
  await expect(example.locator('.word-example__hit')).toHaveText('ね');

  // The reading and the meaning come with it; an unglossed word teaches half.
  await expect(example.locator('.word-example__gloss')).toContainText('—');
});

test('the example is announced as one sentence, not loose characters', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'な', 'Kana → Romaji');

  expect(await answerCardShowing(page, 'ね', 'zzz')).toBe(true);

  await expect(page.getByRole('status').filter({ hasText: /Seen in/ })).toHaveAttribute(
    'aria-label',
    /^Seen in .+, .+, meaning .+\.$/,
  );
});

test('no example while attempts remain: a word would give the answer away', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'な', 'Kana → Romaji', true);

  expect(await answerCardShowing(page, 'ね', 'zzz', 3)).toBe(true);

  // The card is still open with two attempts left.
  await expect(page.getByText(/2 attempts left/)).toBeVisible();
  await expect(page.locator('.word-example')).toHaveCount(0);

  // Spend the rest: once the answer is revealed, the example is allowed.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
  }
  await expect(page.locator('.word-example')).toBeVisible();
});

/**
 * The tallest panel there is: a confusion pair and an example together. The pair replaces the
 * answer detail rather than sitting above it, which is what keeps the two inside the stage.
 */
test('a confusion pair gets an example too, and nothing is clipped', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'ら', 'Kana → Romaji');

  expect(await answerCardShowing(page, 'ろ', 'ru')).toBe(true);

  await expect(page.locator('.answer-note--pair')).toBeVisible();
  await expect(page.locator('.word-example__hit')).toHaveText('ろ');

  // The pair says it instead: what was written, what was wanted, each with its reading. So the
  // line that would repeat that is gone — FR-031's three facts are still on screen, stated once.
  await expect(page.locator('.feedback__detail')).toHaveCount(0);
  await expect(page.getByText('You wrote', { exact: true })).toBeVisible();
  await expect(page.getByText('The answer', { exact: true })).toBeVisible();

  // The panel fits the stage: nothing is cut off at the bottom edge.
  const clipped = await page.evaluate(() => {
    const stage = document.querySelector('.quiz__stage')!;
    return stage.scrollHeight - stage.clientHeight;
  });
  expect(clipped).toBeLessThanOrEqual(0);
});

test('a correct answer gets no example', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'な', 'Kana → Romaji');

  expect(await answerCardShowing(page, 'ね', 'ne')).toBe(true);

  await expect(page.getByText('✓ Correct')).toBeVisible();
  await expect(page.locator('.word-example')).toHaveCount(0);
});

/**
 * The correction round is the other place a wrong answer is shown with the answer revealed. The
 * card stays open there, so the example is safe: it can give away nothing that is not already on
 * screen.
 */
test('a correction round shows the example on the open card', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(
    (key) =>
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          entries: [
            {
              script: 'hiragana',
              kana: 'ぬ',
              missCount: 3,
              streak: 0,
              lastMissedAt: '2026-08-01T10:00:00.000Z',
            },
          ],
        }),
      ),
    MISTAKES_KEY,
  );
  await page.reload();

  await page.getByRole('radio', { name: 'Kana → Romaji' }).locator('..').click();
  await page.getByRole('button', { name: /Your mistakes/ }).click();
  await page.getByRole('button', { name: 'Practise these' }).click();

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();

  await expect(page.getByText(/The answer is/)).toBeVisible();
  await expect(page.locator('.word-example__hit')).toHaveText('ぬ');
});

test('the example does not push the answer input down', async ({ page }) => {
  await freshApp(page);
  await quizOn(page, 'な', 'Kana → Romaji');

  const input = page.getByLabel(/Type the/);
  const before = await input.boundingBox();

  expect(await answerCardShowing(page, 'ね', 'zzz')).toBe(true);
  await expect(page.locator('.word-example')).toBeVisible();

  const after = await input.boundingBox();
  expect(after?.y).toBeCloseTo(before?.y ?? 0, 0);
});
