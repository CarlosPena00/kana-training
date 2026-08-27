import { describe, expect, it } from 'vitest';
import { initialState, quizReducer, type QuizState } from '../../src/state/quizReducer';
import { mulberry32 } from '../../src/engine/rng';
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
  quizReducer(configured(over), { type: 'start', rng: mulberry32(3) });

const answerCurrent = (state: QuizState, correct: boolean): QuizState => {
  const question = state.session!.questions[state.session!.currentIndex]!;
  return quizReducer(state, { type: 'submit', raw: correct ? question.expectedAnswer : 'zzz' });
};

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
    const blocked = quizReducer(configured({ selectedGroupIds: [] }), { type: 'start' });
    expect(blocked.error).toBe('NO_KANA_SELECTED');
    const fixed = quizReducer(blocked, { type: 'toggle-group', groupId: 'main.ka' });
    expect(fixed.error).toBeNull();
  });
});

describe('starting a quiz', () => {
  it('refuses to start on an invalid configuration (FR-012, FR-013)', () => {
    const noKana = quizReducer(configured({ selectedGroupIds: [] }), { type: 'start' });
    expect(noKana.status).toBe('configuring');
    expect(noKana.session).toBeNull();
    expect(noKana.error).toBe('NO_KANA_SELECTED');

    const tooMany = quizReducer(configured({ cardCount: 99 }), { type: 'start' });
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
      const next = quizReducer(state, { type: 'submit', raw: blank });
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
    const state = quizReducer(started(), { type: 'submit', raw: '  Zz  ' });
    expect(state.session?.answers[0]?.submissions).toEqual(['  Zz  ']);
    expect(state.session?.answers[0]?.isCorrect).toBe(false);
  });

  it('does not let an answered card be answered again (FR-024)', () => {
    const answered = answerCurrent(started(), true);
    const again = quizReducer(answered, { type: 'submit', raw: 'anything' });
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
      state = quizReducer(answerCurrent(state, i % 2 === 0), { type: 'continue' });
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
    const again = quizReducer(done, { type: 'practice-again', rng: mulberry32(99) });
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
  });

  const wrong = (state: QuizState): QuizState => quizReducer(state, { type: 'submit', raw: 'zzz' });

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
    expect(state.session?.status).toBe('awaiting-continue');
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
    const state = quizReducer(afterOneMiss, { type: 'submit', raw: question.expectedAnswer });

    expect(state.session?.status).toBe('awaiting-continue');
    expect(state.session?.answers[0]?.isCorrect).toBe(true);
    expect(state.session?.answers[0]?.submissions).toHaveLength(2);
  });

  it('keeps one record per card rather than one per submission', () => {
    const state = wrong(wrong(threeTries()));
    expect(state.session?.answers).toHaveLength(1);
  });

  it('gives each new card its own fresh set of attempts', () => {
    const first = quizReducer(wrong(wrong(wrong(threeTries()))), { type: 'continue' });
    expect(first.session?.currentIndex).toBe(1);
    expect(first.session?.status).toBe('active');

    const second = wrong(first);
    expect(second.session?.status).toBe('active');
    expect(second.session?.answers).toHaveLength(2);
    expect(second.session?.answers[1]?.submissions).toEqual(['zzz']);
  });

  it('still ignores blank submissions without spending an attempt (FR-023)', () => {
    const state = threeTries();
    expect(quizReducer(state, { type: 'submit', raw: '   ' })).toBe(state);
  });
});
