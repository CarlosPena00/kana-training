import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { advance } from './copy-gate';

/**
 * Covers the acceptance criteria that cannot be asserted headlessly:
 * SC-005 (nothing unreachable at 320px), SC-009 (WCAG 2.1 AA audit, full keyboard operation).
 */

const startQuiz = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await expect(page.getByText(/Question 1 \/ 10/)).toBeVisible();
};

test('the default configuration starts a quiz and reaches results', async ({ page }) => {
  await startQuiz(page);

  for (let card = 1; card <= 10; card += 1) {
    await expect(page.getByText(new RegExp(`Question ${card} / 10`))).toBeVisible();
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('✕ Incorrect')).toBeVisible();
    await advance(page, card === 10 ? 'See results' : 'Next card');
  }

  await expect(page.getByRole('heading', { name: 'Quiz complete' })).toBeVisible();
  await expect(page.getByText('0 / 10 correct')).toBeVisible();
  // Every answer was wrong, so the review list must be there (FR-033a).
  await expect(page.getByRole('heading', { name: 'Kana to review' })).toBeVisible();
});

test('the config screen shows the build version', async ({ page }) => {
  const { version } = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  await page.goto('/');
  // The commit is part of the line: the release number alone only moves when bumped by hand, so
  // without a SHA a cached build and a fresh one look identical on screen.
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(
    page.getByText(new RegExp(`^Version ${escaped} \\((?:[0-9a-f]{7}|dev)\\)$`)),
  ).toBeVisible();
});

test('an empty answer does not advance the quiz (FR-023)', async ({ page }) => {
  await startQuiz(page);
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText(/Question 1 \/ 10/)).toBeVisible();
  await expect(page.getByText('✕ Incorrect')).toBeHidden();
});

test('Enter submits the answer (FR-022)', async ({ page }) => {
  await startQuiz(page);
  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByLabel(/Type the/).press('Enter');
  await expect(page.getByText('✕ Incorrect')).toBeVisible();
});

test('an invalid configuration cannot start a quiz (FR-012, FR-013, SC-008)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'All Main Kana' }).uncheck();
  await expect(page.getByText('0 unique kana selected')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start quiz' })).toBeDisabled();
});

test('the group selection survives a script switch (FR-009a)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'All Main Kana' }).uncheck();
  // The group checkbox is visually hidden inside its label (the standard accessible pattern),
  // so drive it the way a person does: by the label.
  await page.getByRole('checkbox', { name: 'か 5 kana' }).locator('..').click();
  await page.getByRole('radio', { name: 'Katakana' }).locator('..').click();
  await expect(page.getByRole('checkbox', { name: 'カ 5 kana' })).toBeChecked();
  await expect(page.getByText('5 unique kana selected')).toBeVisible();
});

test('the prompt, input and submit stay reachable at 320px', async ({ page }) => {
  await startQuiz(page);
  for (const locator of [page.locator('.flashcard__prompt'), page.getByLabel(/Type the/), page.getByRole('button', { name: 'Check' })]) {
    await expect(locator).toBeInViewport();
  }
  // The page itself must never scroll sideways (FR-039).
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('a whole quiz can be completed with the keyboard alone (SC-009)', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  let guard = 0;
  while (guard < 60) {
    const focused = await page.evaluate(() => document.activeElement?.textContent ?? '');
    if (focused.includes('Start quiz')) break;
    await page.keyboard.press('Tab');
    guard += 1;
  }
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Question 1 \/ 10/)).toBeVisible();

  await page.keyboard.type('zzz');
  await page.keyboard.press('Enter');
  await expect(page.getByText('✕ Incorrect')).toBeVisible();

  // A missed card holds until the answer is written, so Enter alone goes nowhere...
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Question 2 \/ 10/)).toBeHidden();

  // ...and writing it is possible with the keyboard alone, like everything else here. Writing it
  // is also the advance: no second press, so a missed card costs no more than a correct one.
  const answer = ((await page.locator('.feedback__correct-answer').textContent()) ?? '').trim();
  await page.keyboard.type(answer);
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Question 2 \/ 10/)).toBeVisible();
});

test('no critical accessibility violations on any screen (SC-009)', async ({ page }) => {
  await page.goto('/');
  const config = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(config.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);

  await page.getByRole('button', { name: 'Start quiz' }).click();
  const quiz = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(quiz.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')).toEqual([]);
});

test('makes no network request beyond its own assets (Constitution Principle I, FR-035)', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://localhost:4173') external.push(request.url());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Start quiz' }).click();
  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByRole('button', { name: 'Check' }).click();
  await advance(page, 'Next card');

  expect(external).toEqual([]);
});

test('every interactive control meets the 44px touch target (FR-042)', async ({ page }) => {
  await page.goto('/');
  // Measure what a finger actually hits: a control inside a <label> is activated by the whole
  // label, so the label is the target — measuring the bare checkbox would report false failures.
  const undersized = await page.evaluate(() => {
    const bad: string[] = [];
    for (const el of document.querySelectorAll('button, input, label, a')) {
      if (el.classList.contains('visually-hidden')) continue;
      const own = el.getBoundingClientRect();
      if (!own.width || !own.height) continue;
      const target = (el.closest('label') ?? el).getBoundingClientRect();
      if (target.width < 44 || target.height < 44) {
        bad.push(`${el.tagName}.${el.className || '(none)'} ${Math.round(target.width)}x${Math.round(target.height)}`);
      }
    }
    return bad;
  });
  expect(undersized).toEqual([]);
});

test('the answer field survives the whole quiz without being remounted (keyboard stability)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start quiz' }).click();

  // Tag the actual DOM node. If React ever unmounts or re-keys the input, the tag goes with it —
  // and on Android that is exactly what tears the soft keyboard down and reflows the layout
  // between every card.
  await page.evaluate(() => {
    (document.getElementById('answer-input') as HTMLElement & { dataset: DOMStringMap }).dataset['persisted'] = 'yes';
  });

  const stillTagged = () =>
    page.evaluate(() => document.getElementById('answer-input')?.dataset['persisted'] === 'yes');

  for (let card = 1; card <= 3; card += 1) {
    await page.getByLabel(/Type the/).fill('zzz');
    await page.getByLabel(/Type the/).press('Enter');

    // Present, untouched, and still holding focus while feedback is showing — losing focus to the
    // button is what drops the Android keyboard and reflows the layout.
    expect(await stillTagged(), `input was remounted showing feedback on card ${card}`).toBe(true);
    await expect(page.locator('#answer-input')).toBeFocused();

    await advance(page, 'Next card');
    expect(await stillTagged(), `input was remounted advancing to card ${card + 1}`).toBe(true);
  }

  // Still focused and cleared, ready for the next answer.
  await expect(page.locator('#answer-input')).toBeFocused();
  await expect(page.getByLabel(/Type the/)).toHaveValue('');
});

test('the card area keeps a constant height from question to feedback (no reflow)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start quiz' }).click();

  const stageBox = async () => (await page.locator('.quiz__stage').boundingBox())!;
  const inputBox = async () => (await page.locator('#answer-input').boundingBox())!;

  const stageBefore = await stageBox();
  const inputBefore = await inputBox();

  await page.getByLabel(/Type the/).fill('zzz');
  await page.getByLabel(/Type the/).press('Enter');
  await expect(page.getByText('✕ Incorrect')).toBeVisible();

  const stageAfter = await stageBox();
  const inputAfter = await inputBox();

  expect(stageAfter.height).toBe(stageBefore.height);
  // The input must not move a single pixel when feedback appears.
  expect(inputAfter.y).toBe(inputBefore.y);
});
