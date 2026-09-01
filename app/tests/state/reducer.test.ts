import { describe, expect, it } from 'vitest';
import { initialState, quizReducer, type QuizState } from '../../src/state/quizReducer';
import { mulberry32 } from '../../src/engine/rng';
import { findKana } from '../../src/data';
import { scoreSession } from '../../src/engine/score';
import type { QuizConfiguration } from '../../src/models/types';

const configuration: QuizConfiguration = {
  script: 'hiragana',
  selectedGroupIds: ['main.ka', 'main.sa'],
  cardCount: 4,
  direction: 'kana-to-romaji',
  attemptsAllowed: 1,
};

const configured = (over: Partial<QuizConfiguration> = {}): QuizState => ({
  ...initialState,
  configuration: { ...configuration, ...over },
});

const started = (over: Partial<QuizConfiguration> = {}): QuizState =>
  quizReducer(configured(over), { type: 'start', rng: mulberry32(3), now: 0 });

const answerCurrent = (state: QuizState, correct: boolean): QuizState => {
  const question = state.session!.questions[state.session!.currentIndex]!;
  return quizReducer(state, { type: 'submit', raw: correct ? question.expectedAnswer : 'zzz', now: 0 });
};

/** Types the revealed answer, which is what a missed card now waits for before it will advance. */
const copyAnswer = (state: QuizState): QuizState => {
  const question = state.session!.questions[state.session!.currentIndex]!;
  return quizReducer(state, { type: 'submit', raw: question.expectedAnswer, now: 0 });
};

/**
 * Finishes the current card whatever happened on it. A missed card is finished by writing the
 * answer, which advances on its own — so a `continue` after this one is a no-op rather than a
 * second step, and callers can treat both paths alike.
 */
const clearCard = (state: QuizState): QuizState =>
  state.session?.status === 'awaiting-copy' ? copyAnswer(state) : state;

describe('configuration actions', () => {
  it('switches script while keeping the group selection (FR-009a)', () => {
    const next = quizReducer(configured(), { type: 'set-script', script: 'katakana' });
    expect(next.configuration.script).toBe('katakana');
    expect(next.configuration.selectedGroupIds).toEqual(['main.ka', 'main.sa']);
  });

  it('toggles a group on and off', () => {
    const added = quizReducer(configured(), { type: 'toggle-group', groupId: 'main.a' });
    expect(added.configuration.selectedGroupIds).toContain('main.a');
    const removed = quizReducer(added, { type: 'toggle-group', groupId: 'main.a' });
    expect(removed.configuration.selectedGroupIds).not.toContain('main.a');
  });

  it('sets a whole section at once', () => {
    const cleared = quizReducer(configured(), { type: 'set-groups', groupIds: [] });
    expect(cleared.configuration.selectedGroupIds).toEqual([]);
  });

  it('clears a pending error when the configuration changes', () => {
    const blocked = quizReducer(configured({ selectedGroupIds: [] }), { type: 'start', now: 0 });
    expect(blocked.error).toBe('NO_KANA_SELECTED');
    const fixed = quizReducer(blocked, { type: 'toggle-group', groupId: 'main.ka' });
    expect(fixed.error).toBeNull();
  });
});

describe('starting a quiz', () => {
  it('refuses to start on an invalid configuration (FR-012, FR-013)', () => {
    const noKana = quizReducer(configured({ selectedGroupIds: [] }), { type: 'start', now: 0 });
    expect(noKana.status).toBe('configuring');
    expect(noKana.session).toBeNull();
    expect(noKana.error).toBe('NO_KANA_SELECTED');

    const tooMany = quizReducer(configured({ cardCount: 99 }), { type: 'start', now: 0 });
    expect(tooMany.status).toBe('configuring');
    expect(tooMany.error).toBe('CARD_COUNT_EXCEEDS_POOL');
  });

  it('creates an active session with the requested number of questions', () => {
    const state = started();
    expect(state.status).toBe('quizzing');
    expect(state.session?.status).toBe('active');
    expect(state.session?.questions).toHaveLength(4);
    expect(state.session?.currentIndex).toBe(0);
    expect(state.error).toBeNull();
  });
});

describe('answering', () => {
  it('ignores a blank submission entirely (FR-023)', () => {
    const state = started();
    for (const blank of ['', '   ', '　']) {
      const next = quizReducer(state, { type: 'submit', raw: blank, now: 0 });
      expect(next).toBe(state);
    }
  });

  it('records an answer and waits for the learner to continue (FR-031)', () => {
    const state = answerCurrent(started(), true);
    expect(state.session?.status).toBe('awaiting-continue');
    expect(state.session?.answers).toHaveLength(1);
    expect(state.session?.answers[0]).toMatchObject({ questionIndex: 0, isCorrect: true });
  });

  it('keeps the learner answer exactly as typed', () => {
    const state = quizReducer(started(), { type: 'submit', raw: '  Zz  ', now: 0 });
    expect(state.session?.answers[0]?.submissions).toEqual(['  Zz  ']);
    expect(state.session?.answers[0]?.isCorrect).toBe(false);
  });

  it('does not let an answered card be answered again (FR-024)', () => {
    const answered = answerCurrent(started(), true);
    const again = quizReducer(answered, { type: 'submit', raw: 'anything', now: 0 });
    expect(again).toBe(answered);
    expect(again.session?.answers).toHaveLength(1);
  });

  it('advances to the next card on continue', () => {
    const next = quizReducer(answerCurrent(started(), true), { type: 'continue' });
    expect(next.session?.currentIndex).toBe(1);
    expect(next.session?.status).toBe('active');
  });

  it('completes after the final card and shows results', () => {
    let state = started();
    for (let i = 0; i < 4; i += 1) {
      state = quizReducer(clearCard(answerCurrent(state, i % 2 === 0)), { type: 'continue' });
    }
    expect(state.status).toBe('results');
    expect(state.session?.status).toBe('complete');
    expect(state.session?.answers).toHaveLength(4);
  });

  it('ignores continue while a card is still unanswered', () => {
    const state = started();
    expect(quizReducer(state, { type: 'continue' })).toBe(state);
  });
});

describe('finishing and leaving', () => {
  const complete = (): QuizState => {
    let state = started();
    for (let i = 0; i < 4; i += 1) state = quizReducer(answerCurrent(state, true), { type: 'continue' });
    return state;
  };

  it('reruns with the same configuration and a fresh set of questions (FR-034)', () => {
    const done = complete();
    const again = quizReducer(done, { type: 'practice-again', rng: mulberry32(99), now: 0 });
    expect(again.status).toBe('quizzing');
    expect(again.configuration).toEqual(done.configuration);
    expect(again.session?.answers).toEqual([]);
    expect(again.session?.currentIndex).toBe(0);
  });

  it('returns home from the results screen', () => {
    const home = quizReducer(complete(), { type: 'go-home' });
    expect(home.status).toBe('configuring');
    expect(home.session).toBeNull();
  });

  it('discards an in-progress quiz when the learner navigates back (FR-038)', () => {
    const abandoned = quizReducer(answerCurrent(started(), true), { type: 'abandon' });
    expect(abandoned.status).toBe('configuring');
    expect(abandoned.session).toBeNull();
    expect(abandoned.configuration).toEqual(configuration);
  });
});

describe('three attempts per card', () => {
  const threeTries = (): QuizState => quizReducer(configured({ attemptsAllowed: 3 }), {
    type: 'start',
    rng: mulberry32(3),
    now: 0,
  });

  const wrong = (state: QuizState): QuizState => quizReducer(state, { type: 'submit', raw: 'zzz', now: 0 });

  it('keeps the card open and the answer hidden while attempts remain (FR-044)', () => {
    let state = wrong(threeTries());
    expect(state.session?.status).toBe('active');
    expect(state.session?.currentIndex).toBe(0);
    expect(state.session?.answers[0]?.submissions).toEqual(['zzz']);

    state = wrong(state);
    expect(state.session?.status).toBe('active');
    expect(state.session?.answers[0]?.submissions).toEqual(['zzz', 'zzz']);
  });

  it('reveals the answer once the third attempt is wrong', () => {
    const state = wrong(wrong(wrong(threeTries())));
    expect(state.session?.status).toBe('awaiting-copy');
    expect(state.session?.answers[0]?.submissions).toHaveLength(3);
    expect(state.session?.answers[0]?.isCorrect).toBe(false);
  });

  it('accepts nothing further once the attempts are spent', () => {
    const spent = wrong(wrong(wrong(threeTries())));
    expect(wrong(spent)).toBe(spent);
  });

  it('stops early when the learner gets it right on a later attempt', () => {
    const afterOneMiss = wrong(threeTries());
    const question = afterOneMiss.session!.questions[0]!;
    const state = quizReducer(afterOneMiss, { type: 'submit', raw: question.expectedAnswer, now: 0 });

    expect(state.session?.status).toBe('awaiting-continue');
    expect(state.session?.answers[0]?.isCorrect).toBe(true);
    expect(state.session?.answers[0]?.submissions).toHaveLength(2);
  });

  it('keeps one record per card rather than one per submission', () => {
    const state = wrong(wrong(threeTries()));
    expect(state.session?.answers).toHaveLength(1);
  });

  it('gives each new card its own fresh set of attempts', () => {
    const first = quizReducer(copyAnswer(wrong(wrong(wrong(threeTries())))), { type: 'continue' });
    expect(first.session?.currentIndex).toBe(1);
    expect(first.session?.status).toBe('active');

    const second = wrong(first);
    expect(second.session?.status).toBe('active');
    expect(second.session?.answers).toHaveLength(2);
    expect(second.session?.answers[1]?.submissions).toEqual(['zzz']);
  });

  it('still ignores blank submissions without spending an attempt (FR-023)', () => {
    const state = threeTries();
    expect(quizReducer(state, { type: 'submit', raw: '   ', now: 0 })).toBe(state);
  });
});

describe('a missed card is held until the answer is written', () => {
  const missed = (over = {}): QuizState => answerCurrent(started(over), false);

  it('holds the card instead of offering to advance', () => {
    const state = missed();
    expect(state.session?.status).toBe('awaiting-copy');
    // `continue` only acts on `awaiting-continue`, so the gate is structural rather than a
    // disabled button the UI has to remember to disable.
    expect(quizReducer(state, { type: 'continue' })).toBe(state);
    expect(state.session?.currentIndex).toBe(0);
  });

  /** Writing the answer is the advance: a missed card must not cost an action a correct one does not. */
  it('moves to the next card as soon as the answer is typed', () => {
    const state = copyAnswer(missed());
    expect(state.session?.currentIndex).toBe(1);
    expect(state.session?.status).toBe('active');
  });

  it('ends the quiz when the answer written is the last card\'s', () => {
    let state = started();
    for (let i = 0; i < 3; i += 1) {
      state = quizReducer(clearCard(answerCurrent(state, true)), { type: 'continue' });
    }
    const finished = copyAnswer(answerCurrent(state, false));
    expect(finished.status).toBe('results');
    expect(finished.session?.status).toBe('complete');
  });

  it('keeps holding on anything that is not the answer', () => {
    const state = missed();
    expect(quizReducer(state, { type: 'submit', raw: 'yyy', now: 0 })).toBe(state);
    expect(quizReducer(state, { type: 'submit', raw: '   ', now: 0 })).toBe(state);
  });

  /**
   * The point of the whole feature: copying the answer must not undo the miss. If it did, a
   * learner would score full marks on a card they failed, and the mistake list — which is fed by
   * `firstSubmissionCorrect` — would clear itself the same way (003 SC-004).
   */
  it('records nothing and changes no score', () => {
    const before = missed();
    const after = copyAnswer(before);

    expect(after.session?.answers).toEqual(before.session?.answers);
    expect(after.session?.answers[0]?.submissions).toEqual(['zzz']);
    expect(after.session?.answers[0]?.isCorrect).toBe(false);
    expect(after.session?.answers[0]?.firstSubmissionCorrect).toBe(false);
    expect(scoreSession(after.session!).correctCount).toBe(0);
    expect(scoreSession(after.session!).points).toBe(0);
  });

  it('does not hold a card that was answered correctly', () => {
    expect(answerCurrent(started(), true).session?.status).toBe('awaiting-continue');
  });

  it('holds only after the last attempt, never while attempts remain', () => {
    const state = answerCurrent(started({ attemptsAllowed: 3 }), false);
    expect(state.session?.status).toBe('active');
  });

  /** The clock stops when the card is decided; writing the answer afterwards is not recall time. */
  it('stops the clock on the final card before the copying, not after', () => {
    let state = started();
    for (let i = 0; i < 3; i += 1) {
      state = quizReducer(clearCard(answerCurrent(state, true)), { type: 'continue' });
    }
    const question = state.session!.questions[3]!;
    const missedFinal = quizReducer(state, { type: 'submit', raw: 'zzz', now: 500 });
    expect(missedFinal.session?.completedAt).toBe(500);

    const copied = quizReducer(missedFinal, { type: 'submit', raw: question.expectedAnswer, now: 900 });
    expect(copied.session?.completedAt).toBe(500);
  });
});

describe('quiz timing', () => {
  const answerAt = (state: QuizState, now: number): QuizState => {
    const question = state.session!.questions[state.session!.currentIndex]!;
    return quizReducer(state, { type: 'submit', raw: question.expectedAnswer, now });
  };

  const runToEnd = (startNow: number, lastAnswerNow: number): QuizState => {
    let state = quizReducer(configured(), { type: 'start', rng: mulberry32(3), now: startNow });
    for (let i = 0; i < 4; i += 1) {
      const last = i === 3;
      state = quizReducer(answerAt(state, last ? lastAnswerNow : startNow + i), { type: 'continue' });
    }
    return state;
  };

  it('stamps the start of the quiz and leaves the end open', () => {
    const state = quizReducer(configured(), { type: 'start', rng: mulberry32(3), now: 5_000 });
    expect(state.session?.startedAt).toBe(5_000);
    expect(state.session?.completedAt).toBeNull();
  });

  it('stops the clock when the final card is answered, not when feedback is dismissed', () => {
    let state = quizReducer(configured(), { type: 'start', rng: mulberry32(3), now: 1_000 });
    for (let i = 0; i < 3; i += 1) {
      state = quizReducer(answerAt(state, 1_000 + i), { type: 'continue' });
    }
    // Final card answered at 91s.
    state = answerAt(state, 91_000);
    expect(state.session?.completedAt).toBe(91_000);

    // The learner then leaves the feedback panel open for a long time before continuing.
    state = quizReducer(state, { type: 'continue' });
    expect(state.session?.completedAt).toBe(91_000);
    expect(state.status).toBe('results');
  });

  it('leaves completedAt null part-way through', () => {
    let state = quizReducer(configured(), { type: 'start', rng: mulberry32(3), now: 1_000 });
    state = quizReducer(answerAt(state, 2_000), { type: 'continue' });
    expect(state.session?.completedAt).toBeNull();
  });

  it('does not stamp a finish while a card still has attempts left', () => {
    let state = quizReducer(configured({ attemptsAllowed: 3, cardCount: 1 }), {
      type: 'start', rng: mulberry32(3), now: 0,
    });
    state = quizReducer(state, { type: 'submit', raw: 'zzz', now: 500 });
    expect(state.session?.completedAt).toBeNull();
    state = quizReducer(state, { type: 'submit', raw: 'zzz', now: 900 });
    expect(state.session?.completedAt).toBeNull();
    state = quizReducer(state, { type: 'submit', raw: 'zzz', now: 1_500 });
    expect(state.session?.completedAt).toBe(1_500);
  });

  it('restarts the clock for a fresh run rather than carrying it over', () => {
    const done = runToEnd(1_000, 91_000);
    const again = quizReducer(done, { type: 'practice-again', rng: mulberry32(9), now: 500_000 });
    expect(again.session?.startedAt).toBe(500_000);
    expect(again.session?.completedAt).toBeNull();
  });
});

describe('firstSubmissionCorrect (003 FR-006, FR-012)', () => {
  it('is true when the first answer is right', () => {
    const state = answerCurrent(started(), true);
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(true);
  });

  it('is false when the first answer is wrong', () => {
    const state = answerCurrent(started(), false);
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(false);
  });

  /**
   * The one that matters. `isCorrect` tracks the latest submission and flips to true on a retry;
   * `firstSubmissionCorrect` must not. If these ever move together, a correction round — which
   * refuses to advance until the answer is typed — would clear the learner's whole mistake list
   * without them learning anything (003 SC-004).
   */
  it('stays false through any number of later correct retries, while isCorrect flips', () => {
    let state = started({ attemptsAllowed: 3 });
    const question = state.session!.questions[0]!;

    state = quizReducer(state, { type: 'submit', raw: 'zzz', now: 0 });
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(false);
    expect(state.session?.answers[0]?.isCorrect).toBe(false);

    state = quizReducer(state, { type: 'submit', raw: question.expectedAnswer, now: 0 });
    expect(state.session?.answers[0]?.isCorrect).toBe(true);
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(false);
  });

  it('stays true when a correct first answer is followed by nothing else', () => {
    let state = started({ attemptsAllowed: 3 });
    const question = state.session!.questions[0]!;
    state = quizReducer(state, { type: 'submit', raw: question.expectedAnswer, now: 0 });
    state = quizReducer(state, { type: 'submit', raw: 'zzz', now: 0 });
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(true);
  });
});

describe('correction rounds (003 FR-024, FR-026)', () => {
  const POOL = [
    findKana('hiragana', 'ぬ')!,
    findKana('katakana', 'ヌ')!,
    findKana('hiragana', 'ね')!,
  ];

  const correcting = (over: Partial<QuizConfiguration> = {}): QuizState =>
    quizReducer(configured({ direction: 'kana-to-romaji', ...over }), {
      type: 'start-correction',
      pool: POOL,
      cardCount: 3,
      rng: mulberry32(3),
      now: 0,
    });

  it('starts a round in correction mode drawn only from the given pool', () => {
    const state = correcting();
    expect(state.status).toBe('quizzing');
    expect(state.session?.mode).toBe('correction');
    expect(state.session?.questions).toHaveLength(3);
    for (const question of state.session!.questions) {
      expect(POOL.some((k) => k.kana === question.kana.kana && k.script === question.kana.script)).toBe(true);
    }
  });

  it('refuses to start on an empty pool (FR-021)', () => {
    const state = quizReducer(configured(), {
      type: 'start-correction',
      pool: [],
      cardCount: 3,
      now: 0,
    });
    // Refused rounds leave the learner on the screen they started from, with the reason shown
    // there. FR-021 makes this path unreachable through the UI; it is a guard, not a flow.
    expect(state.status).toBe('history');
    expect(state.error).toBe('NO_KANA_SELECTED');
  });

  it('refuses more cards than the pool holds (FR-027)', () => {
    const state = quizReducer(configured(), {
      type: 'start-correction',
      pool: POOL,
      cardCount: 9,
      now: 0,
    });
    expect(state.error).toBe('CARD_COUNT_EXCEEDS_POOL');
  });

  it('round case 7: a wrong answer leaves the card open instead of advancing', () => {
    // The card stays `active` rather than passing through the feedback panel, which is what lets
    // the revealed answer stay on screen while the learner types it (003 FR-023a).
    const state = answerCurrent(correcting(), false);
    expect(state.session?.status).toBe('active');
    expect(state.session?.currentIndex).toBe(0);
  });

  it('round case 8: five wrong answers then a correct one is still one card and one record', () => {
    let state = correcting();
    for (let i = 0; i < 5; i += 1) {
      state = answerCurrent(state, false);
      expect(state.session?.currentIndex).toBe(0);
      expect(state.session?.status).toBe('active');
    }
    state = answerCurrent(state, true);
    state = quizReducer(state, { type: 'continue' });

    expect(state.session?.currentIndex).toBe(1);
    expect(state.session?.answers).toHaveLength(1);
    expect(state.session?.answers[0]?.submissions).toHaveLength(6);
    // The forced correction must not rewrite the fact that the first answer was wrong (FR-012).
    expect(state.session?.answers[0]?.firstSubmissionCorrect).toBe(false);
  });

  it('round case 9: the per-card attempt limit does not apply (FR-026)', () => {
    // attemptsAllowed of 1 would end an ordinary card immediately; a correction round ignores it.
    let state = correcting({ attemptsAllowed: 1 });
    state = answerCurrent(state, false);
    expect(state.session?.status).toBe('active');

    state = answerCurrent(state, false);
    expect(state.session?.status).toBe('active');
    expect(state.session?.currentIndex).toBe(0);
    expect(state.session?.answers[0]?.submissions).toHaveLength(2);
  });

  it('round case 12: abandoning a held card keeps the answers already given', () => {
    let state = correcting();
    state = answerCurrent(state, true);
    state = quizReducer(state, { type: 'continue' });
    state = answerCurrent(state, false);

    const recorded = state.session?.answers.map((a) => a.firstSubmissionCorrect);
    expect(recorded).toEqual([true, false]);

    state = quizReducer(state, { type: 'abandon' });
    expect(state.status).toBe('configuring');
    expect(state.session).toBeNull();
  });

  it('advances normally once the card is answered correctly', () => {
    let state = correcting();
    state = answerCurrent(state, true);
    state = quizReducer(state, { type: 'continue' });
    expect(state.session?.currentIndex).toBe(1);
  });

  it('reaches results after the last card is corrected', () => {
    let state = correcting();
    for (let card = 0; card < 3; card += 1) {
      state = answerCurrent(state, false);
      state = answerCurrent(state, true);
      state = quizReducer(state, { type: 'continue' });
    }
    expect(state.status).toBe('results');
    expect(state.session?.status).toBe('complete');
  });

  it('an ordinary quiz still advances past a wrong answer (FR-041)', () => {
    let state = copyAnswer(answerCurrent(started(), false));
    state = quizReducer(state, { type: 'continue' });
    expect(state.session?.currentIndex).toBe(1);
  });
});
