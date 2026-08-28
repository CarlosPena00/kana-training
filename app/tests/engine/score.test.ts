import { describe, expect, it } from 'vitest';
import { pointsFor, scoreSession } from '../../src/engine/score';
import { generateQuiz } from '../../src/engine/generate';
import { mulberry32 } from '../../src/engine/rng';
import type { AnswerRecord, QuizConfiguration, QuizSession } from '../../src/models/types';

const configuration: QuizConfiguration = {
  script: 'hiragana',
  selectedGroupIds: ['main.ka', 'main.sa'],
  cardCount: 10,
  direction: 'both',
  attemptsAllowed: 1,
};

/** `true` means solved on the first try; a number means solved on that attempt; `false` means missed. */
type Outcome = boolean | number;

const sessionWith = (outcomes: readonly Outcome[]): QuizSession => {
  const questions = generateQuiz(configuration, mulberry32(5));
  const answers: AnswerRecord[] = outcomes.map((outcome, questionIndex) => {
    const expected = questions[questionIndex]!.expectedAnswer;
    if (outcome === false)
      return { questionIndex, submissions: ['zzz'], isCorrect: false, firstSubmissionCorrect: false };
    const attempt = outcome === true ? 1 : outcome;
    const submissions = [...Array<string>(attempt - 1).fill('zzz'), expected];
    return { questionIndex, submissions, isCorrect: true, firstSubmissionCorrect: outcome === true };
  });
  return {
    configuration,
    mode: 'standard',
    questions,
    currentIndex: outcomes.length - 1,
    answers,
    status: 'complete',
    startedAt: 0,
    completedAt: null,
  };
};

describe('scoreSession (FR-032, FR-033a)', () => {
  it('counts correct and incorrect answers', () => {
    const score = scoreSession(sessionWith([true, true, false, true, false]));
    expect(score.correctCount).toBe(3);
    expect(score.incorrectCount).toBe(2);
  });

  it('reports accuracy as a whole percent', () => {
    expect(scoreSession(sessionWith([true, true, true, true, false])).accuracy).toBe(80);
    expect(scoreSession(sessionWith([true, false, false])).accuracy).toBe(33);
    expect(scoreSession(sessionWith([true, true])).accuracy).toBe(100);
    expect(scoreSession(sessionWith([false, false])).accuracy).toBe(0);
  });

  it('reports zero accuracy when nothing has been answered yet', () => {
    const score = scoreSession(sessionWith([]));
    expect(score).toMatchObject({ correctCount: 0, incorrectCount: 0, accuracy: 0, points: 0 });
    expect(score.missedKana).toEqual([]);
  });

  it('lists the missed kana in the order they appeared', () => {
    const session = sessionWith([true, false, true, false]);
    const score = scoreSession(session);
    expect(score.missedKana).toEqual([session.questions[1]!.kana, session.questions[3]!.kana]);
  });

  it('returns an empty missed list on a perfect run, so the results screen can omit it', () => {
    expect(scoreSession(sessionWith([true, true, true])).missedKana).toEqual([]);
  });
});

describe('partial credit for later attempts', () => {
  it('awards 1 point on the first try, 1/2 on the second, 1/3 on the third', () => {
    expect(pointsFor({ questionIndex: 0, submissions: ['a'], isCorrect: true, firstSubmissionCorrect: true })).toBe(1);
    expect(
      pointsFor({ questionIndex: 0, submissions: ['x', 'a'], isCorrect: true, firstSubmissionCorrect: false }),
    ).toBeCloseTo(1 / 2);
    expect(
      pointsFor({ questionIndex: 0, submissions: ['x', 'y', 'a'], isCorrect: true, firstSubmissionCorrect: false }),
    ).toBeCloseTo(1 / 3);
  });

  it('awards nothing for a card never answered correctly', () => {
    expect(
      pointsFor({ questionIndex: 0, submissions: ['x', 'y', 'z'], isCorrect: false, firstSubmissionCorrect: false }),
    ).toBe(0);
  });

  it('still counts a late answer as correct', () => {
    const score = scoreSession(sessionWith([1, 2, 3]));
    expect(score.correctCount).toBe(3);
    expect(score.incorrectCount).toBe(0);
    expect(score.missedKana).toEqual([]);
  });

  it('sums partial credit into the accuracy percentage', () => {
    // 1 + 1/2 + 1/3 = 1.833… over 3 cards = 61%
    const score = scoreSession(sessionWith([1, 2, 3]));
    expect(score.points).toBeCloseTo(1 + 1 / 2 + 1 / 3);
    expect(score.accuracy).toBe(61);
  });

  it('scores a one-attempt quiz exactly as a plain correct/incorrect tally', () => {
    const score = scoreSession(sessionWith([true, true, true, true, false]));
    expect(score.points).toBe(4);
    expect(score.accuracy).toBe(80);
  });

  it('breaks the correct answers down by the attempt that got there', () => {
    const score = scoreSession(sessionWith([1, 1, 2, 3, false]));
    expect(score.byAttempt).toEqual([2, 1, 1]);
  });

  it('leaves the breakdown empty when nothing was answered correctly', () => {
    expect(scoreSession(sessionWith([false, false])).byAttempt).toEqual([]);
  });
});

describe('a card still open for retries', () => {
  const threeAttempts = { ...configuration, attemptsAllowed: 3 } as const;

  const sessionWithPending = (): QuizSession => {
    const questions = generateQuiz(configuration, mulberry32(5));
    const answers: AnswerRecord[] = [
      { questionIndex: 0, submissions: [questions[0]!.expectedAnswer], isCorrect: true, firstSubmissionCorrect: true },
      // Wrong once, two attempts still to go — not a miss yet.
      { questionIndex: 1, submissions: ['zzz'], isCorrect: false, firstSubmissionCorrect: false },
    ];
    return {
      configuration: threeAttempts,
      mode: 'standard',
      questions,
      currentIndex: 1,
      answers,
      status: 'active',
      startedAt: 0,
      completedAt: null,
    };
  };

  it('is not counted as incorrect while attempts remain', () => {
    const score = scoreSession(sessionWithPending());
    expect(score.correctCount).toBe(1);
    expect(score.incorrectCount).toBe(0);
    expect(score.missedKana).toEqual([]);
  });

  it('is left out of the accuracy denominator until it resolves', () => {
    expect(scoreSession(sessionWithPending()).accuracy).toBe(100);
  });

  it('becomes a miss once the final attempt is spent', () => {
    const pending = sessionWithPending();
    const session: QuizSession = {
      ...pending,
      answers: [
        pending.answers[0]!,
        { questionIndex: 1, submissions: ['z', 'z', 'z'], isCorrect: false, firstSubmissionCorrect: false },
      ],
    };
    const score = scoreSession(session);
    expect(score.incorrectCount).toBe(1);
    expect(score.missedKana).toHaveLength(1);
    expect(score.accuracy).toBe(50);
  });
});

describe('quiz timing', () => {
  const timed = (startedAt: number, completedAt: number | null, cards = 4): QuizSession => {
    const questions = generateQuiz({ ...configuration, cardCount: cards }, mulberry32(5));
    return {
      configuration: { ...configuration, cardCount: cards },
      mode: 'standard',
      questions,
      currentIndex: cards - 1,
      answers: questions.map((q, questionIndex) => ({
        questionIndex,
        submissions: [q.expectedAnswer],
        isCorrect: true,
        firstSubmissionCorrect: true,
      })),
      status: completedAt === null ? 'active' : 'complete',
      startedAt,
      completedAt,
    };
  };

  it('reports the wall-clock time from start to finish', () => {
    expect(scoreSession(timed(1_000, 61_000)).elapsedMs).toBe(60_000);
  });

  it('averages that across every card in the quiz', () => {
    expect(scoreSession(timed(0, 60_000, 4)).msPerCard).toBe(15_000);
  });

  it('has no timing until the quiz is complete', () => {
    const score = scoreSession(timed(1_000, null));
    expect(score.elapsedMs).toBeNull();
    expect(score.msPerCard).toBeNull();
  });

  it('never reports a negative duration if the clock jumps backwards', () => {
    expect(scoreSession(timed(10_000, 5_000)).elapsedMs).toBe(0);
  });
});

describe('correction-round scoring (003 FR-029a, FR-029c, SC-005a)', () => {
  /**
   * A correction round refuses to advance until the card is right, so every record ends
   * `isCorrect`. Scoring on that would report every round as perfect and contradict the mistake
   * list the learner sees seconds later.
   */
  const correctionSession = (firstAnswers: readonly boolean[]): QuizSession => {
    const questions = generateQuiz({ ...configuration, cardCount: firstAnswers.length }, mulberry32(5));
    return {
      configuration: { ...configuration, cardCount: firstAnswers.length },
      mode: 'correction',
      questions,
      currentIndex: firstAnswers.length - 1,
      answers: firstAnswers.map((firstSubmissionCorrect, questionIndex) => ({
        questionIndex,
        submissions: firstSubmissionCorrect
          ? [questions[questionIndex]!.expectedAnswer]
          : ['zzz', questions[questionIndex]!.expectedAnswer],
        // Forced correction means every card ends correct, without exception.
        isCorrect: true,
        firstSubmissionCorrect,
      })),
      status: 'complete',
      startedAt: 0,
      completedAt: 1000,
    };
  };

  it('round case 10: reports six wrong first answers as 4 of 10, not 10 of 10', () => {
    const score = scoreSession(correctionSession([true, true, true, true, false, false, false, false, false, false]));
    expect(score.correctCount).toBe(4);
    expect(score.incorrectCount).toBe(6);
    expect(score.accuracy).toBe(40);
  });

  it('gives no partial credit for a corrected card', () => {
    const score = scoreSession(correctionSession([false, false]));
    expect(score.points).toBe(0);
    expect(score.correctCount).toBe(0);
  });

  it('reports 100% only when every card was right on sight', () => {
    const score = scoreSession(correctionSession([true, true, true]));
    expect(score.accuracy).toBe(100);
    expect(score.correctCount).toBe(3);
  });

  it('lists the kana whose first answer was wrong', () => {
    const score = scoreSession(correctionSession([true, false, false]));
    expect(score.missedKana).toHaveLength(2);
  });

  it('round case 11: leaves standard-mode partial credit untouched (FR-029c)', () => {
    // The same outcomes in a standard session still earn 1/2 for a second-attempt solve.
    const score = scoreSession(sessionWith([true, 2]));
    expect(score.correctCount).toBe(2);
    expect(score.points).toBeCloseTo(1.5);
  });
});
