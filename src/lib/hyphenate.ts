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
 * syllable boundary closest to the middle. The first half carries a
 * visible hyphen. Returns null for short words or words without break
 * points — callers then fall back to hyphenateGerman.
 */
export function splitLongGerman(word: string, minLength = 10): [string, string] | null {
  if (word.length < minLength) return null;
  const parts = hypher.hyphenate(word);
  if (parts.length < 2) return null;
  let bestIndex = -1;
  let bestDistance = Infinity;
  for (let i = 1; i < parts.length; i++) {
    const boundary = parts.slice(0, i).join('').length;
    const distance = Math.abs(boundary - word.length / 2);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  const first = parts.slice(0, bestIndex).join('');
  const second = parts.slice(bestIndex).join('');
  if (!first || !second) return null;
  return [`${first}-`, second];
}
