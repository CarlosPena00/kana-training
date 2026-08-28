import { useMemo, useState } from 'react';
import { MistakeRow } from '../components/MistakeRow';
import { CardCountPicker } from '../components/CardCountPicker';
import { useQuiz } from '../state/QuizContext';
import { sortEntries, toPool } from '../engine/mistakes';
import { validateCorrectionRound } from '../engine/pool';
import { findKana } from '../data';
import type { Kana, MistakeEntry } from '../models/types';
import './HistoryScreen.css';

/**
 * The mistake list (FR-014 - FR-019), and the place a correction round is started from.
 *
 * The fourth screen in an app whose constitution caps navigation at three, justified in
 * specs/003-mistake-history/plan.md: the list has to be readable without starting a quiz, and no
 * existing screen can hold up to 214 rows without becoming something else.
 */
export function HistoryScreen() {
  const { dispatch, mistakes, clearHistory } = useQuiz();
  const [confirmingClear, setConfirmingClear] = useState(false);

  // Entries whose kana no longer resolve are dropped on read, but resolving again here keeps the
  // screen honest if the dataset changes under a list already in memory (FR-037).
  const rows = useMemo(
    () =>
      sortEntries(mistakes)
        .map((entry) => ({ entry, kana: findKana(entry.script, entry.kana) }))
        .filter((row): row is { entry: MistakeEntry; kana: Kana } => row.kana !== undefined),
    [mistakes],
  );

  const pool = useMemo(() => toPool(mistakes), [mistakes]);
  const isEmpty = rows.length === 0;

  // Defaults to the whole list, capped at a round a learner will actually finish. Never padded
  // and never truncated behind their back (FR-027).
  const [cardCount, setCardCount] = useState(() => Math.min(pool.length, 10) || 1);
  const effectiveCount = Math.min(cardCount, pool.length);
  const validation = validateCorrectionRound(pool.length, effectiveCount);

  return (
    <section className="history">
      <header className="history__header">
        <h1 className="history__title">Your mistakes</h1>
        <button type="button" className="button history__back" onClick={() => dispatch({ type: 'close-history' })}>
          Back
        </button>
      </header>

      {isEmpty ? (
        /* An empty list is the normal state for a new learner, and also what a cleared or
           unavailable store looks like. It explains itself rather than showing a bare zero
           (FR-018, FR-034). */
        <div className="history__empty">
          <p className="history__empty-title">Nothing here yet.</p>
          <p className="muted">
            When you answer a kana wrong, it lands here so you can find it again. Answer it
            correctly three times in a row and it leaves the list on its own.
          </p>
        </div>
      ) : (
        <>
          <p className="history__count">
            <strong>{rows.length}</strong> still to work on
          </p>

          {/* The ordering is stated rather than left to be inferred (FR-017). */}
          <p className="history__ordering muted">Most missed first, then most recent.</p>

          <ul className="history__list">
            {rows.map(({ entry, kana }) => (
              <MistakeRow key={`${entry.script}:${entry.kana}`} entry={entry} kana={kana} />
            ))}
          </ul>

          <div className="history__practice">
            <CardCountPicker value={effectiveCount} poolSize={pool.length} onChange={setCardCount} />

            <button
              type="button"
              className="button button--primary button--large"
              disabled={!validation.ok}
              onClick={() =>
                dispatch({
                  type: 'start-correction',
                  pool,
                  cardCount: effectiveCount,
                  now: performance.now(),
                })
              }
            >
              Practise these
            </button>

            <p className="muted history__practice-note">
              Every card is drawn from this list, both scripts together. A card is not left behind
              until you have typed the right answer.
            </p>
          </div>
        </>
      )}

      <footer className="history__footer">
        {!isEmpty && (
          <>
            {confirmingClear ? (
              <div className="history__confirm" role="alertdialog" aria-label="Delete your history">
                <p className="history__confirm-text">
                  Delete all {rows.length} entries? This cannot be undone, and your progress toward
                  clearing them goes with it.
                </p>
                <div className="history__confirm-actions">
                  <button
                    type="button"
                    className="button button--danger"
                    onClick={() => {
                      clearHistory();
                      setConfirmingClear(false);
                    }}
                  >
                    Delete everything
                  </button>
                  <button type="button" className="button" onClick={() => setConfirmingClear(false)}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="button history__clear"
                onClick={() => setConfirmingClear(true)}
              >
                Delete my history
              </button>
            )}
          </>
        )}
        <p className="history__note muted">
          This list is kept on this device only. Clearing the app's data clears it too.
        </p>
      </footer>
    </section>
  );
}
