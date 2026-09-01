import { expect, type Page } from '@playwright/test';

/**
 * A missed card does not offer to advance until the learner writes the answer it just revealed.
 * Every flow that walks past a wrong answer therefore has to do what a learner does: read the
 * answer off the panel and type it back.
 *
 * Not a test double — it drives the real UI, and reads the answer only from what is on screen, so
 * a card that failed to reveal its answer fails these helpers too.
 */

/** The answer as the panel shows it, wherever the panel happens to be showing it. */
const revealedAnswer = async (page: Page): Promise<string> => {
  const plain = page.locator('.feedback__correct-answer');
  if ((await plain.count()) > 0) return ((await plain.textContent()) ?? '').trim();

  // A confusion pair replaces that line. The answer is the side the pair *labels* as the answer —
  // found by that label, never by position, because which side it sits on is a design decision
  // the note is free to change.
  const side = page.locator('.answer-note__side').filter({ hasText: 'The answer' });
  const kana = ((await side.locator('.answer-note__kana').textContent()) ?? '').trim();
  const romaji = ((await side.locator('.answer-note__romaji').textContent()) ?? '').trim();

  // Which half is the answer depends on the card's direction, which is what the input asks for.
  const wantsKana = (await page.getByLabel('Type the kana').count()) > 0;
  return wantsKana ? kana : romaji;
};

/**
 * Writes the answer a held card is waiting for, and reports whether there was one to write.
 * Doing so also finishes the card: writing the answer is the advance, so a missed card costs no
 * more actions than a correct one.
 */
export const clearCopyGate = async (page: Page): Promise<boolean> => {
  if ((await page.locator('.feedback__copy-prompt').count()) === 0) return false;

  const answer = await revealedAnswer(page);
  expect(answer, 'the panel must show the answer it is asking for').not.toBe('');

  await page.getByLabel(/Type the/).fill(answer);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.locator('.feedback__copy-prompt')).toHaveCount(0);
  return true;
};

/** Finishes the current card, whichever way this one has to be finished. */
export const advance = async (page: Page, label: string | RegExp = /Next card|See results/) => {
  if (await clearCopyGate(page)) return;
  await page.getByRole('button', { name: label }).click();
};
