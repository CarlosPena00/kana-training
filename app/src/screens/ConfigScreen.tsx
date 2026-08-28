import { useMemo } from 'react';
import { SegmentedControl } from '../components/SegmentedControl';
import { GroupSection } from '../components/GroupSection';
import { CardCountPicker } from '../components/CardCountPicker';
import { useQuiz } from '../state/QuizContext';
import { buildPool, validateConfiguration } from '../engine/pool';
import { SECTION_LABELS, groupsForSection } from '../data';
import type { ConfigurationError, DirectionSetting, GroupId, Script } from '../models/types';
import './ConfigScreen.css';

const SCRIPT_OPTIONS = [
  { value: 'hiragana' as Script, label: 'Hiragana' },
  { value: 'katakana' as Script, label: 'Katakana' },
];

const DIRECTION_OPTIONS = [
  { value: 'both' as DirectionSetting, label: 'Both' },
  { value: 'kana-to-romaji' as DirectionSetting, label: 'Kana → Romaji' },
  { value: 'romaji-to-kana' as DirectionSetting, label: 'Romaji → Kana' },
];

function errorMessage(error: ConfigurationError, poolSize: number): string {
  switch (error) {
    case 'NO_KANA_SELECTED':
      return 'Select at least one kana group to practice.';
    case 'CARD_COUNT_EXCEEDS_POOL':
      return `Your selection has ${poolSize} kana, so the quiz can hold at most ${poolSize} cards.`;
    case 'CARD_COUNT_TOO_LOW':
      return 'A quiz needs at least one card.';
    case 'CARD_COUNT_NOT_INTEGER':
      return 'Enter a whole number of cards.';
  }
}

export function ConfigScreen() {
  const { state, dispatch, mistakes } = useQuiz();
  const { configuration } = state;

  const pool = useMemo(
    () => buildPool(configuration.script, configuration.selectedGroupIds),
    [configuration.script, configuration.selectedGroupIds],
  );
  const allKana = useMemo(
    () => buildPool(configuration.script, groupsForSection('main').map((g) => g.id)),
    [configuration.script],
  );
  const validation = validateConfiguration(configuration);

  const setSection = (groupIds: readonly GroupId[], selected: boolean) => {
    const remaining = configuration.selectedGroupIds.filter((id) => !groupIds.includes(id));
    dispatch({ type: 'set-groups', groupIds: selected ? [...remaining, ...groupIds] : remaining });
  };

  const fullPoolFor = (section: 'main' | 'dakuten' | 'combination') =>
    buildPool(configuration.script, groupsForSection(section).map((group) => group.id));

  return (
    <section className="config">
      <header className="config__header">
        <h1 className="config__title">Kana Flashcards</h1>
        <p className="muted">Practice Hiragana and Katakana. Everything works offline.</p>
      </header>

      <SegmentedControl
        legend="Script"
        options={SCRIPT_OPTIONS}
        value={configuration.script}
        onChange={(script) => dispatch({ type: 'set-script', script })}
      />

      <SegmentedControl
        legend="Quiz direction"
        options={DIRECTION_OPTIONS}
        value={configuration.direction}
        onChange={(direction) => dispatch({ type: 'set-direction', direction })}
      />
      <label className="config__attempts">
        <input
          type="checkbox"
          checked={configuration.attemptsAllowed === 3}
          onChange={(event) =>
            dispatch({ type: 'set-attempts', attemptsAllowed: event.target.checked ? 3 : 1 })
          }
        />
        <span className="config__attempts-text">
          <span className="config__attempts-title">Allow 3 attempts per card</span>
          <span className="muted">
            A wrong answer lets you try again instead of revealing the answer. Getting it on the
            second try is worth &frac12; a point, the third &#8531;.
          </span>
        </span>
      </label>

      {configuration.direction !== 'kana-to-romaji' && (
        <p className="muted config__ime-hint">
          Romaji → Kana cards need a Japanese keyboard on your device. Kana → Romaji needs no special
          keyboard.
        </p>
      )}

      {(['main', 'dakuten', 'combination'] as const).map((section) => (
        <GroupSection
          key={section}
          title={SECTION_LABELS[section]}
          selectAllLabel={`All ${SECTION_LABELS[section]}`}
          groups={groupsForSection(section)}
          script={configuration.script}
          pool={fullPoolFor(section)}
          selectedGroupIds={configuration.selectedGroupIds}
          onToggleGroup={(groupId) => dispatch({ type: 'toggle-group', groupId })}
          onSetSection={setSection}
        />
      ))}

      <p className="config__pool" aria-live="polite">
        <strong>{pool.length}</strong> unique kana selected
        {allKana.length > 0 && pool.length === 0 ? ' — nothing to practice yet' : ''}
      </p>

      <CardCountPicker
        value={configuration.cardCount}
        poolSize={pool.length}
        onChange={(cardCount) => dispatch({ type: 'set-card-count', cardCount })}
      />

      {state.error && (
        <p className="config__error" role="alert">
          {errorMessage(state.error, validation.poolSize)}
        </p>
      )}

      <button
        type="button"
        className="button button--primary button--large"
        onClick={() => dispatch({ type: 'start', now: performance.now() })}
        disabled={!validation.ok}
        aria-describedby={state.error ? 'config-error' : undefined}
      >
        Start quiz
      </button>

      {!validation.ok && !state.error && (
        <p className="muted config__hint" id="config-error">
          {errorMessage(validation.error, validation.poolSize)}
        </p>
      )}

      {/* Reachable without starting a quiz (003 FR-014). Always shown, so a learner with an empty
          list still learns the feature exists rather than discovering it only after a bad round. */}
      <button
        type="button"
        className="button config__history"
        onClick={() => dispatch({ type: 'open-history' })}
      >
        {mistakes.length > 0 ? `Your mistakes (${mistakes.length})` : 'Your mistakes'}
      </button>
    </section>
  );
}
