/**
 * The one place answers are cleaned. Applied to the learner's input and to the expected answer
 * alike, so the two sides can never drift apart (FR-025, FR-026, FR-028).
 */

export function normalizeAnswer(raw: string): string {
  // String.trim removes every Unicode space, including the full-width U+3000 a Japanese IME
  // produces (FR-026). NFC so a decomposed kana from an IME (か + combining dakuten) equals the
  // composed dataset kana. Lowercasing is safe for kana: it leaves Japanese characters untouched.
  return raw.trim().normalize('NFC').toLowerCase();
}

export function isBlank(raw: string): boolean {
  return normalizeAnswer(raw) === '';
}
