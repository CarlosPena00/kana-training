import { buildQuestions, generateQuiz } from '../engine/generate';
import { checkAnswer } from '../engine/validate';
import { isBlank } from '../engine/normalize';
import { validateConfiguration, validateCorrectionRound } from '../engine/pool';
import { defaultRng, type Rng } from '../engine/rng';
import { ALL_MAIN_GROUP_IDS } from '../data';
import type {
  AnswerRecord,
  AttemptsAllowed,
  ConfigurationError,
  DirectionSetting,
  GroupId,
  Kana,
  QuizConfiguration,
  QuizSession,
  Script,
  SessionStatus,
} from '../models/types';

/**
 * The whole application state machine. Screen status and session status are kept separate:
 * a session only exists once a quiz has actually started (see data-model.md state transitions).
 */

export type AppStatus = 'configuring' | 'quizzing' | 'results' | 'history';

export interface QuizState {
  readonly status: AppStatus;
  readonly configuration: QuizConfiguration;
  readonly session: QuizSession | null;
  /** Why the last start attempt was refused, shown on the configuration screen. */
  readonly error: ConfigurationError | null;
}

export const DEFAULT_CONFIGURATION: QuizConfiguration = {
  script: 'hiragana',
  selectedGroupIds: ALL_MAIN_GROUP_IDS,
  cardCount: 10,
  direction: 'both',
  // One attempt by default: retries are opt-in, so the default quiz behaves as it always has.
  attemptsAllowed: 1,
};

export const initialState: QuizState = {
  status: 'configuring',
  configuration: DEFAULT_CONFIGURATION,
  session: null,
  error: null,
};

export type QuizAction =
  | { type: 'set-script'; script: Script }
  | { type: 'toggle-group'; groupId: GroupId }
  | { type: 'set-groups'; groupIds: readonly GroupId[] }
  | { type: 'set-card-count'; cardCount: number }
  | { type: 'set-direction'; direction: DirectionSetting }
  | { type: 'set-attempts'; attemptsAllowed: AttemptsAllowed }
  | { type: 'start'; rng?: Rng; now: number }
  | { type: 'start-correction'; pool: readonly Kana[]; cardCount: number; rng?: Rng; now: number }
  | { type: 'submit'; raw: string; now: number }
  | { type: 'continue' }
  | { type: 'practice-again'; rng?: Rng; now: number }
  | { type: 'go-home' }
  | { type: 'abandon' }
  | { type: 'open-history' }
  | { type: 'close-history' };

function reconfigure(state: QuizState, configuration: QuizConfiguration): QuizState {
  // Any change to the configuration clears a stale "you cannot start" message.
  return { ...state, configuration, error: null };
}

function startSession(state: QuizState, rng: Rng, now: number): QuizState {
  const validation = validateConfiguration(state.configuration);
  if (!validation.ok) {
    return { ...state, status: 'configuring', session: null, error: validation.error };
  }

  const session: QuizSession = {
    configuration: state.configuration,
    mode: 'standard',
    questions: generateQuiz(state.configuration, rng),
    currentIndex: 0,
    answers: [],
    status: 'active',
    // The clock starts here and is not shown again until the results screen.
    startedAt: now,
    completedAt: null,
  };
  return { ...state, status: 'quizzing', session, error: null };
}

function startCorrectionRound(
  state: QuizState,
  pool: readonly Kana[],
  cardCount: number,
  rng: Rng,
  now: number,
): QuizState {
  const validation = validateCorrectionRound(pool.length, cardCount);
  if (!validation.ok) {
    return { ...state, status: 'history', session: null, error: validation.error };
  }

  const session: QuizSession = {
    // Carried for direction and for the answer input; `script` is meaningless in this mode,
    // because the pool spans both and each card's script comes from its own kana (003 FR-020b).
    configuration: { ...state.configuration, cardCount },
    mode: 'correction',
    questions: buildQuestions(pool, cardCount, state.configuration.direction, rng),
    currentIndex: 0,
    answers: [],
    status: 'active',
    startedAt: now,
    completedAt: null,
  };
  return { ...state, status: 'quizzing', session, error: null };
}

/**
 * Moves off the current card, or ends the quiz if it was the last one.
 *
 * Shared by the two ways a card is finished — pressing continue after a correct answer, and
 * writing the answer a missed card is holding for — so neither can drift into a different idea of
 * what "the next card" means.
 */
function advanceCard(state: QuizState, session: QuizSession): QuizState {
  const nextIndex = session.currentIndex + 1;
  if (nextIndex >= session.questions.length) {
    return { ...state, status: 'results', session: { ...session, status: 'complete' } };
  }
  return { ...state, session: { ...session, currentIndex: nextIndex, status: 'active' } };
}

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case 'set-script':
      // The selection is shared across scripts, so only the script changes here (FR-009a).
      return reconfigure(state, { ...state.configuration, script: action.script });

    case 'toggle-group': {
      const selected = state.configuration.selectedGroupIds;
      const next = selected.includes(action.groupId)
        ? selected.filter((id) => id !== action.groupId)
        : [...selected, action.groupId];
      return reconfigure(state, { ...state.configuration, selectedGroupIds: next });
    }

    case 'set-groups':
      return reconfigure(state, { ...state.configuration, selectedGroupIds: [...action.groupIds] });

    case 'set-card-count':
      return reconfigure(state, { ...state.configuration, cardCount: action.cardCount });

    case 'set-direction':
      return reconfigure(state, { ...state.configuration, direction: action.direction });

    case 'set-attempts':
      return reconfigure(state, { ...state.configuration, attemptsAllowed: action.attemptsAllowed });

    case 'start':
      return startSession(state, action.rng ?? defaultRng, action.now);

    case 'start-correction':
      return startCorrectionRound(
        state,
        action.pool,
        action.cardCount,
        action.rng ?? defaultRng,
        action.now,
      );

    case 'submit': {
      const session = state.session;
      if (!session) return state;
      // A blank submission is not a transition at all: no advance, no record (FR-023).
      if (isBlank(action.raw)) return state;

      const question = session.questions[session.currentIndex];
      if (!question) return state;

      /**
       * Copying the revealed answer. The card was graded when its attempts ran out, and this
       * types what is already on screen — so it is not an attempt: nothing is recorded, no score
       * moves, and a miss cannot become a hit (the same guarantee 003 SC-004 needed). Anything
       * other than the answer simply leaves the card where it is.
       */
      if (session.status === 'awaiting-copy') {
        if (!checkAnswer(question, action.raw)) return state;
        // Writing the answer *is* the advance. Asking for a separate continue afterwards would
        // cost a missed card one more action than a correct one, for no decision in between.
        return advanceCard(state, session);
      }

      if (session.status !== 'active') return state;

      const existing = session.answers.find((record) => record.questionIndex === session.currentIndex);
      const submissions = [...(existing?.submissions ?? []), action.raw];
      const isCorrect = checkAnswer(question, action.raw);

      // Written on the first submission and carried forward untouched from then on. A later
      // retry — or the forced correction a correction round demands — must never revise it, or
      // the mistake list becomes clearable by answering wrong and copying the answer (003 SC-004).
      const firstSubmissionCorrect = existing ? existing.firstSubmissionCorrect : isCorrect;

      const record: AnswerRecord = {
        questionIndex: session.currentIndex,
        submissions,
        isCorrect,
        firstSubmissionCorrect,
      };
      const answers = existing
        ? session.answers.map((entry) => (entry === existing ? record : entry))
        : [...session.answers, record];

      // A wrong answer with attempts left keeps the card open and the answer hidden: the learner
      // retries rather than being shown the answer (FR-044).
      //
      // A correction round has no attempt limit (003 FR-026), so a wrong answer always leaves the
      // card open. It differs from a retry in what the learner sees: the correct answer is
      // revealed and stays on screen while they type it (003 FR-023, FR-023a). Keeping the card
      // `active` rather than routing through the feedback panel is what makes that possible — the
      // panel is replaced by the prompt on the way back, which would hide the answer at the exact
      // moment it is needed.
      const attemptsLeft =
        session.mode === 'correction'
          ? Number.POSITIVE_INFINITY
          : session.configuration.attemptsAllowed - submissions.length;

      /**
       * Out of attempts and still wrong: the answer is revealed and the card holds until the
       * learner writes it (`awaiting-copy`). A correct answer needs no such step, and a correction
       * round never reaches one — it holds the card `active` instead, keeping the prompt on screen.
       */
      const status: SessionStatus = isCorrect
        ? 'awaiting-continue'
        : attemptsLeft > 0
          ? 'active'
          : 'awaiting-copy';

      // The clock stops on the final answer, not when the learner leaves the feedback panel
      // (FR-048). Every other card's feedback dwell ends when the learner moves on; the last
      // card's has no upper bound, so counting it would let an abandoned screen inflate the total.
      const isFinalCard = session.currentIndex === session.questions.length - 1;
      // In a correction round the last card is not finished until it is right, so a wrong answer
      // on it must not stop the clock.
      // The clock stops when the card is decided, not when the learner finishes copying: the
      // answer was already known at this moment, and time spent writing it is not recall time.
      const cardIsFinished = session.mode === 'correction' ? isCorrect : status !== 'active';
      const completedAt = cardIsFinished && isFinalCard ? action.now : session.completedAt;

      return { ...state, session: { ...session, answers, status, completedAt } };
    }

    case 'continue': {
      const session = state.session;
      if (!session || session.status !== 'awaiting-continue') return state;
      return advanceCard(state, session);
    }

    case 'practice-again':
      return startSession(state, action.rng ?? defaultRng, action.now);

    case 'open-history':
      // Reachable from configuration without starting a quiz (FR-014), and where a correction
      // round returns to — both when it finishes and when the learner leaves one part-way
      // (003 FR-025). Any session is discarded on the way, never resumed in a partial state, and
      // a stale "you cannot start" message has nothing to do with this screen.
      return { ...state, status: 'history', session: null, error: null };

    case 'close-history':
      return { ...state, status: 'configuring', session: null, error: null };

    case 'go-home':
    case 'abandon':
      // An abandoned quiz is discarded, never resumed in a partial state (FR-038).
      return { ...state, status: 'configuring', session: null, error: null };

    default:
      return state;
  }
}
