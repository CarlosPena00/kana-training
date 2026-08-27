# Phase 0 Research: Kana Flashcards

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Date**: 2026-08-27

Every unknown in the plan's Technical Context is resolved below. Package versions were read from the
npm registry on 2026-08-27; the local toolchain is Node 24.19.0 with npm 11.17.0.

---

## D1. Cross-platform framework

**Decision**: A web-first codebase — TypeScript + React 19 + Vite 8 — wrapped by Capacitor 8 for
Android and iOS, and shipped on the web as an installable PWA.

**Rationale**:

- **The whole product is text input and text display.** There is no camera, no maps, no gesture-heavy
  canvas — nothing that needs a native rendering pipeline. A DOM app is a complete implementation of
  this product, not a compromise on one.
- **Native IME input works because the input is a real DOM input.** FR-021 has learners typing kana
  with their own Japanese keyboard. A platform `<input>` inside a WebView gets the system IME with
  correct composition behavior on both Android and iOS for free. This is the single riskiest
  requirement in the spec and it is the one where this choice is strongest.
- **FR-035a is satisfied by the same artifact that runs natively.** The web build already has to be an
  offline-capable installable PWA; Capacitor then loads those exact built assets from the app bundle.
  One build output serves all three targets, which is Principle II stated as a build pipeline rather
  than as an intention.
- **The engine stays trivially testable.** Pure TypeScript modules run under Vitest in milliseconds
  with no renderer, no simulator, and no device — which is what Principle IV requires.
- **Small dependency surface.** Four runtime dependencies (`react`, `react-dom`, `@capacitor/core`,
  and the platform packages) plus Vite. Nothing else ships.

**Alternatives considered**:

| Option | Why rejected |
|--------|--------------|
| **Flutter** | Genuinely excellent for Android and iOS and a strong single-codebase story. Rejected on the web target: Flutter Web renders text into a canvas, so IME composition, text selection, screen-reader semantics, and browser autofill are re-implementations rather than the platform's own — precisely the areas FR-021, FR-040, and FR-041 depend on. The CanvasKit payload also fights the ≤ 300 KB budget, and Dart adds a second toolchain to a repo that is otherwise TypeScript. |
| **React Native + react-native-web (Expo)** | Real native views on mobile and shared components with the web. Rejected because the web target is the weaker half of the story here: `react-native-web` maps components onto the DOM with its own layout and accessibility translation layer, and Expo's static web export no longer ships offline/PWA support out of the box — so FR-035a would be hand-built anyway. That is more machinery than a DOM app for a product with no native-UI requirement. |
| **Kotlin Multiplatform + Compose** | Strong shared-logic story and true native Android. Rejected for the same web reason as Flutter (Compose for Web/WASM canvas rendering), plus the heaviest toolchain of the four for a three-screen app. |
| **Three separate native apps** | Directly violates Principle II and triples the surface where the quiz rules can drift apart. |

**Risk accepted**: On iOS, Capacitor apps run in `WKWebView`, so the app is subject to Apple's review
guidelines around web-wrapper apps. The app has real bundled content and full offline functionality
rather than being a website shortcut, which is the distinction that matters in practice. If App Store
distribution is ever refused, the web PWA and the Android build remain unaffected.

---

## D2. Offline delivery and installability on the web

**Decision**: `vite-plugin-pwa` 1.3 in `generateSW` mode. It precaches every build asset (JS, CSS,
HTML, the font subset, icons) and emits `manifest.webmanifest` with `display: standalone`.

**Rationale**: FR-035a requires the web build to survive a browser restart offline and to be
installable. Since there is no runtime data fetching, the correct caching strategy is the simplest
one: precache everything at install, serve cache-first, and never consult the network. The app also
gets a straightforward update path — a new deployment installs a new service worker and takes effect
on the next launch.

**Alternatives considered**: A hand-written service worker (rejected — see Complexity Tracking in the
plan: the precache manifest and cache-versioning are the parts that quietly break); no service worker
at all (rejected — fails FR-035a and SC-006 outright).

**Note for the native targets**: Capacitor serves the same assets from the app bundle over its local
scheme, so no service worker is needed there. Registration is skipped when running under Capacitor.

---

## D3. Japanese font strategy

**Decision**: Commit a self-hosted subset of **Noto Sans JP** at
`app/src/assets/fonts/noto-sans-jp-kana.woff2`, containing only Hiragana (U+3040–309F), Katakana
(U+30A0–30FF), the prolonged sound mark, and Basic Latin. It is loaded with `font-display: swap` and a
fallback stack, and referenced by `@font-face` in `tokens.css`.

**Rationale**: FR-006 forbids relying on the user's installed fonts, and Principle I forbids runtime
network requests — which rules out Google Fonts and any CDN. A full Japanese font is several megabytes;
the kana ranges alone subset to 93 KB in WOFF2 — more than the 20 KB first estimated, because Noto's
kana outlines are detailed, but still comfortably inside the 300 KB budget at 46% of the payload. Committing the subset as a binary asset keeps the build a plain `vite build` with no font
tooling in the dependency graph.

**Alternatives considered**: `@fontsource/noto-sans-jp` (rejected — it ships ~120 unicode-range-split
files, and precaching all of them for offline use pulls in the entire CJK inventory the app never
displays); subsetting during the build with `fonttools` (rejected — adds a Python step to a Node build
for an asset that changes approximately never). Regeneration is a one-off script,
`app/scripts/fetch-font.py`, which requests exactly the characters the datasets contain.

---

## D4. Canonical romanization, and the ambiguity it has to resolve

**Decision**: Modified Hepburn as the spec's Assumptions section already fixes it — `shi`, `chi`,
`tsu`, `fu`, `ja`, `ju`, `jo`, and `dya`/`dyu`/`dyo` for the ぢゃ family — **plus** `di` for ぢ, `du`
for づ, and `wo` for を.

**Rationale**: Romaji → Kana cards require the mapping to be invertible. Strict Hepburn romanizes ぢ as
`ji` and づ as `zu`, colliding with じ and ず; a learner shown the prompt `ji` would have two correct
kana and no way to know which is wanted. Spelling the ぢ/づ row with `d-` removes the collision and is
consistent with the `dya`/`dyu`/`dyo` the source description already specified for that same row.
`wo` for を likewise keeps it distinct from お (`o`). With these three choices the kana↔romaji mapping
is one-to-one across the entire dataset, so every card in every direction has exactly one correct
answer — which is what the spec's "each card has exactly one correct answer" assumption depends on.

**Enforced by**: a dataset test asserting that romaji values are unique within a script, and that the
kana→romaji map inverts cleanly (see [contracts/kana-dataset.md](./contracts/kana-dataset.md)).

**Alternatives considered**: Accepting a set of alternative spellings per kana (rejected — FR-005
forbids silently accepting other romanization systems, and it would make Romaji → Kana ambiguous);
excluding ぢ and づ from the dataset (rejected — they are standard kana a learner will meet).

---

## D5. Randomness and determinism

**Decision**: The engine takes an `rng: () => number` parameter defaulting to `Math.random`. Shuffling
is Fisher–Yates over a copy of the pool, then `slice(0, n)`. Tests inject a seeded `mulberry32`
generator implemented in ~6 lines in `app/src/engine/rng.ts`.

**Rationale**: Principle IV requires injectable randomness, and FR-016/FR-017 require sampling without
replacement rather than retry loops. Fisher–Yates over the pool makes "no repetition" a structural
property that cannot fail rather than a probabilistic one that usually holds — the property SC-002
verifies over 1,000 generated quizzes.

**Alternatives considered**: A seeded-RNG dependency such as `seedrandom` (rejected — six lines of
well-known arithmetic does not justify a dependency under Principle V); `Math.random` with no
injection point (rejected — makes the generator untestable and violates Principle IV).

---

## D6. State management and navigation

**Decision**: `useReducer` with a single `quizReducer` behind a context provider. No router: `App.tsx`
switches on the session status (`configuring | active | complete`) and pushes one History API entry
when a quiz starts, listening for `popstate` to leave the quiz.

**Rationale**: The state is one configuration object plus one session; Principle V calls for the
simplest mechanism that holds it, and a reducer makes the transitions explicit and unit-testable
alongside the engine. The single history entry is what makes FR-038 work identically for the browser
back button and the Android back gesture — Capacitor routes the hardware back through the same
`popstate`, so one ~15-line handler covers both platforms with no per-platform fork.

**Alternatives considered**: React Router (rejected — a routing table for three screens that have no
URLs worth deep-linking, and it would still need custom handling to block mid-quiz navigation);
Redux/Zustand (rejected — no cross-tree state sharing problem exists here); lifting state into
`App.tsx` with `useState` (rejected — the session transitions are exactly what a reducer documents).

---

## D7. Testing approach

**Decision**: Vitest 4 for `tests/engine/` and `tests/data/`; Playwright with
`@axe-core/playwright` for a single `tests/e2e/` spec that runs the web build.

**Rationale**: The spec's testing requirements are almost entirely engine-level, which Vitest covers
with no DOM. Three success criteria are not engine-level and cannot be asserted any other way:
SC-005 (nothing unreachable at 320 px with the keyboard open), SC-009 (automated WCAG 2.1 AA audit,
full keyboard operation). One Playwright spec covers all three, runs in CI against the built PWA, and
ships nothing to users.

**Deliberately not tested automatically**: SC-007 (95% of learners in usability testing interpret
wrong-answer feedback correctly) requires human participants. It is carried as a design review
criterion, not a build gate — flagged as Outstanding during `/speckit-clarify` and unchanged here.

---

## D8. Preference persistence

**Decision**: One `localStorage` key, `kana-training.preferences`, holding a versioned JSON object.
Every read is wrapped in `try/catch` and validated against the current dataset before use; anything
unparseable, unversioned, or referencing an unknown group id is discarded in favor of defaults.

**Rationale**: FR-037 makes persistence optional and requires the app to work when it is missing or
corrupt. Private browsing, cleared site data, and storage-blocking settings all make the accessor
throw rather than return null, so the guard must be a `try/catch` and not a null check. Validating
group ids against the dataset means a future dataset change cannot resurrect a selection that no
longer exists.

**Alternatives considered**: Capacitor Preferences plugin (rejected — a second storage API and a
platform fork for data `localStorage` already holds identically in all three targets);
IndexedDB (rejected — no volume or query needs whatsoever).

---

## Resolved unknowns summary

| Unknown from Technical Context | Resolution |
|---|---|
| Cross-platform framework (Constitution II requires justification) | D1 — React + Vite + Capacitor |
| How the web build meets FR-035a offline + installable | D2 — `vite-plugin-pwa`, precache everything |
| How kana render without depending on system fonts (FR-006) | D3 — committed Noto Sans JP kana subset |
| Which romanization, and how to keep Romaji → Kana unambiguous | D4 — Hepburn plus `di`/`du`/`wo` |
| Deterministic testable randomness (Principle IV) | D5 — injected `rng`, Fisher–Yates, seeded in tests |
| State and navigation approach, incl. FR-038 back handling | D6 — `useReducer` + History API, no router |
| Test tooling for engine and for SC-005/SC-009 | D7 — Vitest, plus one Playwright + axe spec |
| Where preferences live and how failure is handled | D8 — guarded, validated `localStorage` |

No NEEDS CLARIFICATION items remain.
