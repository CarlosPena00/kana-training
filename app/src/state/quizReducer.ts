import { generateQuiz } from '../engine/generate';
import { checkAnswer } from '../engine/validate';
import { isBlank } from '../engine/normalize';
import { validateConfiguration } from '../engine/pool';
import { defaultRng, type Rng } from '../engine/rng';
import { ALL_MAIN_GROUP_IDS } from '../data';
import type {
  AnswerRecord,
  AttemptsAllowed,
  ConfigurationError,
  DirectionSetting,
  GroupId,
  QuizConfiguration,
  QuizSession,
  Script,
} from '../models/types';

/**
 * The whole application state machine. Screen status and session status are kept separate:
 * a session only exists once a quiz has actually started (see data-model.md state transitions).
 */

export type AppStatus = 'configuring' | 'quizzing' | 'results';

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
  | { type: 'submit'; raw: string; now: number }
  | { type: 'continue' }
  | { type: 'practice-again'; rng?: Rng; now: number }
  | { type: 'go-home' }
  | { type: 'abandon' };

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

    case 'submit': {
      const session = state.session;
      if (!session || session.status !== 'active') return state;
      // A blank submission is not a transition at all: no advance, no record (FR-023).
      if (isBlank(action.raw)) return state;

      const question = session.questions[session.currentIndex];
      if (!question) return state;

      const existing = session.answers.find((record) => record.questionIndex === session.currentIndex);
      const submissions = [...(existing?.submissions ?? []), action.raw];
      const isCorrect = checkAnswer(question, action.raw);

      const record: AnswerRecord = { questionIndex: session.currentIndex, submissions, isCorrect };
      const answers = existing
        ? session.answers.map((entry) => (entry === existing ? record : entry))
        : [...session.answers, record];

      // A wrong answer with attempts left keeps the card open and the answer hidden: the learner
      // retries rather than being shown the answer (FR-044).
      const attemptsLeft = session.configuration.attemptsAllowed - submissions.length;
      const status = !isCorrect && attemptsLeft > 0 ? 'active' : 'awaiting-continue';

      // The clock stops on the final answer, not when the learner leaves the feedback panel
      // (FR-048). Every other card's feedback dwell ends when the learner moves on; the last
      // card's has no upper bound, so counting it would let an abandoned screen inflate the total.
      const isFinalCard = session.currentIndex === session.questions.length - 1;
      const completedAt =
        status === 'awaiting-continue' && isFinalCard ? action.now : session.completedAt;

      return { ...state, session: { ...session, answers, status, completedAt } };
    }

    case 'continue': {
      const session = state.session;
      if (!session || session.status !== 'awaiting-continue') return state;

      const nextIndex = session.currentIndex + 1;
      if (nextIndex >= session.questions.length) {
        return { ...state, status: 'results', session: { ...session, status: 'complete' } };
      }
      return { ...state, session: { ...session, currentIndex: nextIndex, status: 'active' } };
    }

    case 'practice-again':
      return startSession(state, action.rng ?? defaultRng, action.now);

    case 'go-home':
    case 'abandon':
      // An abandoned quiz is discarded, never resumed in a partial state (FR-038).
      return { ...state, status: 'configuring', session: null, error: null };

    default:
      return state;
  }
}
