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

  const showRetry = !awaitingContinue && lastSubmission !== undefined;

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
          />
        )}
      </div>

      <AnswerInput
        value={answer}
        onChange={setAnswer}
        onSubmit={handleSubmit}
        expectsKana={question.direction === 'romaji-to-kana'}
        focusKey={`${session.currentIndex}-${submissions.length}-${awaitingContinue}`}
        actionLabel={awaitingContinue ? (isLastCard ? 'See results' : 'Next card') : 'Check'}
      />

      <button
        type="button"
        className="quiz__quit"
        onClick={() => dispatch({ type: 'abandon' })}
      >
        Quit quiz
      </button>
    </section>
  );
}
