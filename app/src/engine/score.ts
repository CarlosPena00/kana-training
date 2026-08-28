import type { AnswerRecord, Kana, QuizSession, SessionScore } from '../models/types';

/**
 * Credit falls off with each attempt: 1 point first try, 1/2 second, 1/3 third — a card is worth
 * 1 / (attempts used), and nothing if it was never answered correctly. A one-attempt quiz
 * therefore scores exactly as a plain correct/incorrect tally would.
 *
 * Derived from the answer records on demand — never a stored counter that can drift from them.
 */
export function pointsFor(record: AnswerRecord): number {
  if (!record.isCorrect || record.submissions.length === 0) return 0;
  return 1 / record.submissions.length;
}

/**
 * A card is still open while it was answered wrongly but has attempts left. Such a card counts
 * for nothing yet — neither right nor wrong — so the running tally does not call it a miss
 * before the learner has finished with it.
 */
export function isResolved(record: AnswerRecord, attemptsAllowed: number): boolean {
  return record.isCorrect || record.submissions.length >= attemptsAllowed;
}

export function scoreSession(session: QuizSession): SessionScore {
  /**
   * A correction round is scored on first submissions only (003 FR-029a). It refuses to advance
   * until the card is right, so every record ends `isCorrect` — scoring on that would report every
   * round as 100% and contradict the mistake list the learner sees seconds later.
   *
   * Ordinary quizzes are untouched and keep their partial credit (003 FR-029c, FR-041).
   */
  const isCorrection = session.mode === 'correction';
  const attemptsAllowed = isCorrection ? 1 : session.configuration.attemptsAllowed;

  // One predicate for "did this card count as right", so the tally, the accuracy, and the review
  // list cannot disagree about the same card.
  const wasRight = (record: AnswerRecord) =>
    isCorrection ? record.firstSubmissionCorrect : record.isCorrect;

  const answered = isCorrection
    ? session.answers
    : session.answers.filter((record) => isResolved(record, attemptsAllowed));
  const correct = answered.filter(wasRight);

  const points = isCorrection
    ? correct.length
    : answered.reduce((total, record) => total + pointsFor(record), 0);

  // Attempt breakdown is meaningless when every card is retried until right, so it is not
  // produced for a correction round.
  const byAttempt: number[] = [];
  if (!isCorrection) {
    for (const record of correct) {
      const index = record.submissions.length - 1;
      byAttempt[index] = (byAttempt[index] ?? 0) + 1;
    }
    for (let i = 0; i < byAttempt.length; i += 1) byAttempt[i] ??= 0;
  }

  const missedKana: Kana[] = answered
    .filter((record) => !wasRight(record))
    .map((record) => session.questions[record.questionIndex]?.kana)
    .filter((kana): kana is Kana => kana !== undefined);

  // Timing is only meaningful once the quiz is over — a part-finished session has no total.
  const elapsedMs =
    session.completedAt === null ? null : Math.max(session.completedAt - session.startedAt, 0);
  const msPerCard =
    elapsedMs === null || session.questions.length === 0 ? null : elapsedMs / session.questions.length;

  return {
    correctCount: correct.length,
    incorrectCount: answered.length - correct.length,
    points,
    accuracy: answered.length === 0 ? 0 : Math.round((points / answered.length) * 100),
    byAttempt,
    missedKana,
    elapsedMs,
    msPerCard,
  };
}
