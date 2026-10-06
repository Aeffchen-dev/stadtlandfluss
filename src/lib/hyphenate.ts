import Hypher from 'hypher';
import german from 'hyphenation.de';

// German Knuth–Liang patterns: splits words at grammatically correct
// syllable boundaries so the browser can show a proper hyphen when a
// word has to break across lines.
const hypher = new Hypher(german);

/**
 * Inserts soft hyphens (\u00AD) into a word at correct German syllable
 * boundaries. With `hyphens: manual` the browser only breaks the word if
 * it actually exceeds the line width — shorter words stay untouched and
 * the soft hyphens stay invisible.
 */
export function hyphenateGerman(word: string): string {
  if (word.length < 6) return word;
  const parts = hypher.hyphenate(word);
  if (parts.length < 2) return word;
  return parts.join('\u00AD');
}

/**
 * Splits a long word into exactly two lines at the grammatically correct
 * syllable boundary closest to the middle. Returns null for short words
 * or words without break points — callers then fall back to
 * hyphenateGerman. The visible hyphen is rendered by the caller, not
 * baked into the text, so it can be styled independently.
 */
export function splitLongGerman(word: string, minLength = 10): [string, string] | null {
  if (word.length < minLength) return null;
  const parts = hypher.hyphenate(word);
  if (parts.length < 2) return null;
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 1; i < parts.length; i++) {
    const boundary = parts.slice(0, i).join('').length;
    const second = parts.slice(i).join('');
    // Keep the plural/fugen syllable "en" attached to the stem — "Frau- /
    // enname" reads wrong; the grammatically correct break is "Frauen-name".
    const distance = Math.abs(boundary - word.length / 2) + (second.startsWith('en') ? 2 : 0);
    if (distance <= bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  const first = parts.slice(0, bestIndex).join('');
  const second = parts.slice(bestIndex).join('');
  if (!first || !second) return null;
  return [first, second];
}
