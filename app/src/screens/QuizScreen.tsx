import { useState } from 'react';
import { Flashcard } from '../components/Flashcard';
import { AnswerInput } from '../components/AnswerInput';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { ProgressBar } from '../components/ProgressBar';
import { useQuiz } from '../state/QuizContext';
import { scoreSession } from '../engine/score';
import './QuizScreen.css';

export function QuizScreen() {
  const { state, dispatch } = useQuiz();
  // The answer lives here rather than in the input, so it can be cleared in the same event that
  // advances the card instead of by an effect afterwards.
  const [answer, setAnswer] = useState('');

  const session = state.session;
  if (!session) return null;

  const question = session.questions[session.currentIndex];
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
