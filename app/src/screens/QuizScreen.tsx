import { useMemo, useState } from 'react';
import { Flashcard } from '../components/Flashcard';
import { AnswerInput } from '../components/AnswerInput';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { ProgressBar } from '../components/ProgressBar';
import { useQuiz } from '../state/QuizContext';
import { scoreSession } from '../engine/score';
import { diagnoseAnswer } from '../engine/diagnose';
import { pickExample } from '../engine/examples';
import './QuizScreen.css';

export function QuizScreen() {
  const { state, dispatch } = useQuiz();
  // The answer lives here rather than in the input, so it can be cleared in the same event that
  // advances the card instead of by an effect afterwards.
  const [answer, setAnswer] = useState('');

  const session = state.session;
  const question = session?.questions[session.currentIndex];

  /**
   * One example word per card, drawn once and kept: re-rolling it on every keystroke would make
   * the panel flicker through the word list while the learner reads it. Keyed on the character
   * rather than the card index so a correction round, which asks the same kana again later, still
   * gets a fresh word.
   *
   * Computed before the guards below because a hook cannot sit after an early return.
   */
  const kana = question?.kana;
  const example = useMemo(() => (kana ? pickExample(kana) : null), [kana]);

  if (!session) return null;
  if (!question) return null;

  const awaitingContinue = session.status === 'awaiting-continue';
  const isCorrection = session.mode === 'correction';
  const record = session.answers.find((entry) => entry.questionIndex === session.currentIndex);
  const submissions = record?.submissions ?? [];
  const lastSubmission = submissions[submissions.length - 1];
  const attemptsLeft = session.configuration.attemptsAllowed - submissions.length;
  const score = scoreSession(session);
  const isLastCard = session.currentIndex === session.questions.length - 1;

  const handleSubmit = () => {
    if (awaitingContinue) {
      dispatch({ type: 'continue' });
    } else {
      dispatch({ type: 'submit', raw: answer, now: performance.now() });
    }
    setAnswer('');
  };

  // In a correction round the answer is revealed instead of the attempt counter, and the card
  // stays open until it is typed correctly.
  /**
   * The answer is on screen once the attempts are spent, and always in a correction round, which
   * reveals it inline. Diagnosis needs to know, because a note that would state a withheld answer
   * has to be suppressed rather than merely hidden (FR-015a, FR-020b, FR-008c).
   */
  const answerRevealed = awaitingContinue || isCorrection;
  const note =
    lastSubmission === undefined ? null : diagnoseAnswer(question, lastSubmission, answerRevealed);

  const showRetry = !awaitingContinue && lastSubmission !== undefined && !isCorrection;
  const showCorrection = !awaitingContinue && lastSubmission !== undefined && isCorrection;

  /**
   * A correction round holds the learner on a card until they type the right answer (003 FR-024),
   * so the card must still name which script it wants — a mixed round makes "nu" ambiguous
   * between ぬ and ヌ (003 FR-020c). A kana prompt is unambiguous on its own (003 FR-020e), and an
   * ordinary quiz is never labelled at all (003 FR-041).
   */
  const scriptLabel =
    isCorrection && question.direction === 'romaji-to-kana'
      ? question.kana.script === 'hiragana'
        ? 'Hiragana'
        : 'Katakana'
      : undefined;

  const continueLabel = isLastCard ? 'See results' : 'Next card';

  return (
    <section className="quiz">
      <ProgressBar
        current={session.currentIndex + 1}
        total={session.questions.length}
        correctCount={score.correctCount}
        incorrectCount={score.incorrectCount}
      />

      {/*
        One fixed-height stage showing either the prompt or the result. Swapping the contents
        rather than the layout is what keeps the input and button below from moving, which is what
        keeps the soft keyboard from closing between cards.
      */}
      <div className="quiz__stage">
        {awaitingContinue && record ? (
          <FeedbackPanel
            question={question}
            submitted={lastSubmission ?? ''}
            isCorrect={record.isCorrect}
            attemptsUsed={submissions.length}
            showAttemptCredit={!isCorrection}
            note={note}
            example={example}
          />
        ) : (
          <Flashcard
            prompt={question.prompt}
            isKana={question.direction === 'kana-to-romaji'}
            retry={showRetry ? { attemptsLeft, lastAnswer: lastSubmission ?? '' } : undefined}
            correction={
              showCorrection
                ? { lastAnswer: lastSubmission ?? '', correctAnswer: question.expectedAnswer }
                : undefined
            }
            scriptLabel={scriptLabel}
            note={note}
            answerRevealed={answerRevealed}
            /* Only once the answer is revealed — which on an open card means a correction round.
               While attempts remain, a word containing the answer would give it away. */
            example={showCorrection ? example : null}
          />
        )}
      </div>

      <AnswerInput
        value={answer}
        onChange={setAnswer}
        onSubmit={handleSubmit}
        expectsKana={question.direction === 'romaji-to-kana'}
        focusKey={`${session.currentIndex}-${submissions.length}-${awaitingContinue}`}
        actionLabel={awaitingContinue ? continueLabel : 'Check'}
      />

      <button
        type="button"
        className="quiz__quit"
        onClick={() => dispatch({ type: isCorrection ? 'open-history' : 'abandon' })}
      >
        {isCorrection ? 'Leave correction round' : 'Quit quiz'}
      </button>
    </section>
  );
}
