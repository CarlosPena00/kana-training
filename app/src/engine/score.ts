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
  const attemptsAllowed = session.configuration.attemptsAllowed;
  const answered = session.answers.filter((record) => isResolved(record, attemptsAllowed));
  const correct = answered.filter((record) => record.isCorrect);

  const points = answered.reduce((total, record) => total + pointsFor(record), 0);

  const byAttempt: number[] = [];
  for (const record of correct) {
    const index = record.submissions.length - 1;
    byAttempt[index] = (byAttempt[index] ?? 0) + 1;
  }
  for (let i = 0; i < byAttempt.length; i += 1) byAttempt[i] ??= 0;

  const missedKana: Kana[] = answered
    .filter((record) => !record.isCorrect)
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
