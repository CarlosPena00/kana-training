import { Flashcard } from '../components/Flashcard';
import { AnswerInput } from '../components/AnswerInput';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { RetryNotice } from '../components/RetryNotice';
import { ProgressBar } from '../components/ProgressBar';
import { useQuiz } from '../state/QuizContext';
import { scoreSession } from '../engine/score';
import './QuizScreen.css';

export function QuizScreen() {
  const { state, dispatch } = useQuiz();
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

  return (
    <section className="quiz">
      <ProgressBar
        current={session.currentIndex + 1}
        total={session.questions.length}
        correctCount={score.correctCount}
        incorrectCount={score.incorrectCount}
      />

      <Flashcard prompt={question.prompt} isKana={question.direction === 'kana-to-romaji'} />

      {awaitingContinue && record ? (
        <FeedbackPanel
          question={question}
          submitted={lastSubmission ?? ''}
          isCorrect={record.isCorrect}
          attemptsUsed={submissions.length}
          isLastCard={isLastCard}
          onContinue={() => dispatch({ type: 'continue' })}
        />
      ) : (
        <>
          {lastSubmission !== undefined && (
            <RetryNotice attemptsLeft={attemptsLeft} lastAnswer={lastSubmission} />
          )}
          <AnswerInput
            // A new card or a new attempt remounts the input, which clears and refocuses it
            // as part of the same render rather than afterwards.
            key={`${session.currentIndex}-${submissions.length}`}
            expectsKana={question.direction === 'romaji-to-kana'}
            disabled={false}
            onSubmit={(raw) => dispatch({ type: 'submit', raw })}
          />
        </>
      )}

      <button type="button" className="quiz__quit" onClick={() => dispatch({ type: 'abandon' })}>
        Quit quiz
      </button>
    </section>
  );
}
