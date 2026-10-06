import { useCallback, useEffect, useRef, useState } from 'react';
import { House, Map as MapIcon, RefreshCw, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import filterIcon from '@/assets/filter-icon.png';
import { hyphenateGerman, splitLongGerman } from '@/lib/hyphenate';

const SPREADSHEET_ID = '1zuaMoA4jYBJGKa17xaarqBohnkRUijitywLKiHNERmM';
const SHEET_NAME = 'Tabellenblatt1';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Used only if the Google Sheet cannot be reached, so the sliders never
// stay stuck on the loading placeholders.
const FALLBACK_COLUMNS: string[][] = [
  ['Stadt', 'Land', 'Tier', 'Name', 'Beruf'],
  ['Fluss', 'Land', 'Lebensmittel', 'Getränk', 'Pflanze'],
  ['Film', 'Buch', 'Sportart', 'Hobby', 'Märchen'],
];
const SWIPE_THRESHOLD = 28;



// One color family per slider. Each of the five stacked cards picks a slightly
// different tone variant of that family, so swiping shifts the tone per slide
// while every card stays unmistakably in the same color story.
const FAMILY_GRADIENTS = [
  [
    'var(--quiz-setup-gradient-city-0)',
    'var(--quiz-setup-gradient-city-1)',
    'var(--quiz-setup-gradient-city-2)',
    'var(--quiz-setup-gradient-city-3)',
    'var(--quiz-setup-gradient-city-4)',
  ],
  [
    'var(--quiz-setup-gradient-country-0)',
    'var(--quiz-setup-gradient-country-1)',
    'var(--quiz-setup-gradient-country-2)',
    'var(--quiz-setup-gradient-country-3)',
    'var(--quiz-setup-gradient-country-4)',
  ],
  [
    'var(--quiz-setup-gradient-river-0)',
    'var(--quiz-setup-gradient-river-1)',
    'var(--quiz-setup-gradient-river-2)',
    'var(--quiz-setup-gradient-river-3)',
    'var(--quiz-setup-gradient-river-4)',
  ],
];

// Per-family grain, tinted to the darkest tone of each color story: dark olive
// (city), dark turquoise (country), dark plum (river). The noise is mapped to
// that exact color, then blended in overlay mode so speckle darkens in the
// family's own hue instead of neutral black.
const makeGrain = (r: number, g: number, b: number) => {
  const c = (v: number) => (v / 255).toFixed(4);
  const matrix = `${c(r)} 0 0 0 0 0 ${c(g)} 0 0 0 0 0 ${c(b)} 0 0 0 0 0 1 0`;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/><feColorMatrix type='matrix' values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='.62'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const FAMILY_GRAINS = [
  makeGrain(36, 43, 23), // dark olive
  makeGrain(20, 41, 41), // dark turquoise
  makeGrain(30, 23, 48), // dark plum
];

// Gradient blobs at the top of each card, tinted to each slider's own color
// story: rosa/lila (Stadt), turquoise (Land), red & yellow (Fluss). Each
// card seeds its own PRNG from the category name, so sizes and positions are
// random per card but stable across re-renders. The main blobs sit in three
// stacked lanes near the top and hug the horizontal center; a darker and a
// lighter accent tone each land fully at random, allowed to overlap slightly.
const FAMILY_BLOB_HUES = [
  // Stadt: rosa / lila tones + darker plum + lighter rosa accents
  ['338 95% 84%', '318 75% 79%', '298 42% 70%', '300 50% 46%', '345 90% 84%'],
  // Land: muted green-blues with a juicy green (drawn larger), a deep vivid blue
  // and a dark green-blue lila accent
  ['178 85% 85%', '158 100% 78%', '158 60% 42%', '148 100% 56%', '178 95% 50%', '224 95% 28%'],
  // Fluss: dark lila & vivid red-orange in the main lanes, deeper orange + soft bright yellow (larger, quiet) accents
  ['285 52% 76%', '8 95% 62%', '281 72% 68%', '28 100% 72%', '55 92% 85%'],
];
// Per-family scale factor for each of the three accent blobs (dark, light, extra).
// Per-family accent tuning: size and alpha multiplier for each of the three
// accent blobs (dark, light, extra). FAMILY_MAIN_STYLES tunes the three main
// lane blobs the same way.
const FAMILY_ACCENT_STYLES: Array<Array<{ size?: number; alpha?: number }>> = [
  [{}, {}, {}],
  [{ size: 1.35, alpha: 1.5 }, {}, { size: 5.7, alpha: 1.0 }], // Land: juicy green larger + more visible, blue-lila as a huge quiet bg glow
  [{}, { size: 0.6, alpha: 0.55 }, {}], // Fluss: bright yellow bigger and quieter
];
const FAMILY_MAIN_STYLES: Array<Array<{ alpha?: number } | undefined>> = [
  [undefined, undefined, undefined],
  [undefined, { alpha: 3.0 }, undefined], // Land: mint glow much more vivid
  [undefined, undefined, undefined],
];
// Per-slider blob strength: the first slider reads strongest, the others sit
// progressively quieter (0.4 × 0.85, 0.4 × 0.75 for their core alpha).
const FAMILY_BLOB_ALPHA = [0.312, 0.084, 0.231];
const BLOB_LANES: Array<[number, number]> = [[9, 17], [28, 38], [47, 57]]; // y-% of card height

interface CardBlob {
  x: number; // % of card width
  y: number; // % of card height
  size: number; // diameter, % of card width
  hue: string;
  alphaScale?: number; // multiplies the family blob alpha
}

const makeCardBlobs = (seed: string, familyIndex: number): CardBlob[] => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  const hues = FAMILY_BLOB_HUES[familyIndex] ?? FAMILY_BLOB_HUES[0];
  // Card is ~133px tall and ~281px wide: convert y-% of height to width-%
  // units so overlap distances can be compared in one space.
  const ASPECT = 0.48;
  const placed: Array<{ x: number; yW: number; r: number }> = [];
  const blobs: CardBlob[] = [];

  // Main color blobs stay in their lanes near the top, mostly centered.
  BLOB_LANES.forEach(([yMin, yMax], i) => {
    const x = 50 + (rand() - 0.5) * 26;
    const y = yMin + rand() * (yMax - yMin);
    const size = 31 + rand() * 22;
    placed.push({ x, yW: y * ASPECT, r: size / 2 });
    blobs.push({ x, y, size, hue: hues[i], alphaScale: FAMILY_MAIN_STYLES[familyIndex]?.[i]?.alpha });
  });

  // The darker and lighter accent tones each land fully at random, retrying
  // until their cores sit close to the other blobs — a bit of overlap is fine.
  const placeAccent = (hue: string | undefined, style: { size?: number; alpha?: number } = {}): void => {
    if (!hue) return;
    const size = (28 + rand() * 22) * (style.size ?? 1);
    let x = 50;
    let y = 40;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      x = 14 + rand() * 72;
      y = 6 + rand() * 74;
      const yW = y * ASPECT;
      const clear = placed.every(
        (p) => Math.hypot(x - p.x, yW - p.yW) >= (size / 2 + p.r) * 0.55,
      );
      if (clear) break;
    }
    placed.push({ x, yW: y * ASPECT, r: size / 2 });
    blobs.push({ x, y, size, hue, alphaScale: style.alpha });
  };
  const accentStyles = FAMILY_ACCENT_STYLES[familyIndex] ?? [];
  [hues[3], hues[4], hues[5]].forEach((hue, i) => placeAccent(hue, accentStyles[i]));
  return blobs;
};

// Etched satin rim: a 1px inner border in each family's own hue, sitting just
// inside the neutral white rim for a color-etched edge.
const FAMILY_RIMS = [
  'hsl(145 60% 60% / 0.1)',
  'hsl(178 60% 60% / 0.1)',
  'hsl(300 45% 60% / 0.1)',
];

// Soft color bloom around the card edge in the family's own hue — the halo
// look from the reference: the card color melts outward instead of a hard drop
// shadow.
const FAMILY_GLOWS = [
  'hsl(145 60% 60% / 0.04)',
  'hsl(178 60% 60% / 0.04)',
  'hsl(300 45% 60% / 0.04)',
];

// Card text color: a dark 900-tone of each slider's leading color, with the
// same per-slide variation as the gradients.
const FAMILY_INKS = [
  [
    'var(--quiz-setup-ink-city-0)',
    'var(--quiz-setup-ink-city-1)',
    'var(--quiz-setup-ink-city-2)',
    'var(--quiz-setup-ink-city-3)',
    'var(--quiz-setup-ink-city-4)',
  ],
  [
    'var(--quiz-setup-ink-country-0)',
    'var(--quiz-setup-ink-country-1)',
    'var(--quiz-setup-ink-country-2)',
    'var(--quiz-setup-ink-country-3)',
    'var(--quiz-setup-ink-country-4)',
  ],
  [
    'var(--quiz-setup-ink-river-0)',
    'var(--quiz-setup-ink-river-1)',
    'var(--quiz-setup-ink-river-2)',
    'var(--quiz-setup-ink-river-3)',
    'var(--quiz-setup-ink-river-4)',
  ],
];

interface GameSetupSlideProps {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onDragStart?: (clientX: number) => void;
  onDragMove?: (clientX: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  onOpenInfo: () => void;
}

interface CategorySliderProps {
  items: string[];
  style?: React.CSSProperties;
  /** Which of the three photo groups (0 = Stadt, 1 = Land, 2 = Fluss) this slider uses. */
  familyIndex: number;
  label: string;
  hint?: 'next' | 'prev';
  /** Reports the live drag progress (offset/spacing) and whether a finger is down — drives the title smiley rotation. */
  onRotateDrag?: (progress: number, dragging: boolean) => void;
  /** Called when a slide change commits, so the smiley can absorb the completed turn. */
  onRotateCommit?: (direction: number) => void;
}

const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
};

const CUSTOM_PREFIX = '\u0000custom:';

function CategorySlider({ items: sheetItems, familyIndex, label, hint, style, onRotateDrag, onRotateCommit }: CategorySliderProps) {
  const storageKey = `slf-slide-${familyIndex}`;
  const [index, setIndex] = useState(() => {
    const saved = Number(window.localStorage.getItem(storageKey));
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  });
  // Own categories: always one trailing empty slot; typing into it adds a new empty slot.
  // Input cards („Ergänze…“) stay hidden until this slider's sheet cards have
  // loaded — the custom slot only exists once real categories are there.
  const [customs, setCustoms] = useState<string[]>(['']);
  const [focusedCustom, setFocusedCustom] = useState<number | null>(null);
  const items = [...sheetItems, ...(sheetItems.length > 0 ? customs.map((_, i) => `${CUSTOM_PREFIX}${i}`) : [])];
  const updateCustom = (i: number, value: string) => {
    setCustoms((current) => {
      const next = [...current];
      next[i] = value;
      if (i === next.length - 1 && value.trim()) next.push('');
      return next;
    });
  };
  const startX = useRef<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  // The idle hint nudge plays exactly once, on load; after the first slide
  // change it must never come back (removing + re-adding the animation style
  // re-triggers it after every change).
  const hintDone = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [trackWidth, setTrackWidth] = useState(300);
  // Card travel distance. The card is drawn at 80% of its slot size (cards
  // scaled down 20%); neighbours render at 90% of that (0.9 × 0.8 = 0.72,
  // half-width 0.36 × card width). Gap and peek are coupled through the
  // slot inset, so the inset is derived per width: the gap is 36px and the
  // side cards peek 40% less than with the previous 48px inset / 24px gap
  // (peek was screenPad + 0.1 × trackWidth + 14.4px, now 60% of that).
  const CARD_SCALE = 0.8;
  const CARD_GAP = 36;
  const screenPad = Math.max(0, (window.innerWidth - trackWidth) / 2);
  const peekBefore = screenPad + 0.1 * trackWidth + 14.4;
  const slotInset = Math.max(0, (0.6 * peekBefore - screenPad - 0.1 * trackWidth + CARD_GAP) / 0.8);
  const spacing = (trackWidth / 2 - slotInset) * CARD_SCALE + CARD_GAP + 0.45 * CARD_SCALE * (trackWidth - 2 * slotInset);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setTrackWidth(containerRef.current.offsetWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Restore the saved position once the sheet cards load (clamped to the
  // available items); keep it across reloads instead of resetting to 0.
  useEffect(() => {
    if (sheetItems.length === 0) return;
    setIndex((current) => current % (sheetItems.length + 1));
  }, [sheetItems]);

  useEffect(() => {
    if (sheetItems.length === 0) return;
    window.localStorage.setItem(storageKey, String(index));
  }, [index, storageKey, sheetItems.length]);

  // Latest callback without re-subscribing the progress effect below.
  const rotateDragRef = useRef(onRotateDrag);
  useEffect(() => {
    rotateDragRef.current = onRotateDrag;
  });

  // Feed the title smiley: its rotation follows the drag continuously.
  useEffect(() => {
    rotateDragRef.current?.(offset / spacing, startX.current !== null);
  }, [offset, spacing]);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  const count = items.length;
  const currentItem = items[index] ?? items[0];
  const prevItem = count > 1 ? items[(index - 1 + count) % count] : null;
  const nextItem = count > 1 ? items[(index + 1) % count] : null;
  const prev2Item = count > 2 ? items[(index - 2 + count) % count] : null;
  const next2Item = count > 2 ? items[(index + 2) % count] : null;

  const beginDrag = (clientX: number) => {
    if (isAnimating) return;
    startX.current = clientX;
    setOffset(0);
  };

  const moveDrag = (clientX: number) => {
    if (startX.current === null || isAnimating) return;
    setOffset(clientX - startX.current);
  };

  const commitChange = (direction: number) => {
    const width = spacing;
    setIsAnimating(true);
    setOffset(direction > 0 ? -width : width);
    // Swap only after the 250ms ease-out has fully settled (the transition
    // starts a few ms after the style commit, so 250 + 30ms buffer): swapping
    // earlier leaves the outgoing side card a pixel or two inside the viewport
    // when it disappears — visible as a flicker at the card edges.
    timeoutRef.current = window.setTimeout(() => {
      hintDone.current = true;
      // Swap in the new index with no transition, then re-enable transitions
      setIndex((current) => (current + direction + count) % count);
      onRotateCommit?.(direction);
      setOffset(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsAnimating(false)));
    }, 280);
  };

  const endDrag = () => {
    if (count > 1 && offset < -SWIPE_THRESHOLD) commitChange(1);
    else if (count > 1 && offset > SWIPE_THRESHOLD) commitChange(-1);
    else setOffset(0);
    startX.current = null;
  };

  // Like the main carousel: no transition while dragging, ease-out on release;
  // the index swap happens with transitions suppressed so the new card doesn't slide in.
  const transition = isAnimating
    ? offset !== 0
      ? 'transform 250ms ease-out'
      : 'none'
    : startX.current === null
      ? 'transform 250ms ease-out'
      : 'none';

  const renderCard = (item: string | null, itemIndex: number, position: number) => {
    if (item === null) return null;
    const isCurrent = position === 0;
    const customIndex = item.startsWith(CUSTOM_PREFIX) ? Number(item.slice(CUSTOM_PREFIX.length)) : null;
    // Stable key by item identity (not by position): when the index swaps,
    // React reuses the existing elements for current↔prev/next instead of
    // unmounting and remounting all three — remounts repaint from scratch and
    // read as a flicker at the end of the slide transition.
    const cardKey = `${item}#${itemIndex}`;
    const itemRotation = ((item.split('').reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 97, 7) % 9) - 4) / 2;
    const distanceFromCenter = Math.min(Math.abs(position * spacing + offset) / spacing, 1);
    // Active card fills the space between the two neighbour slivers (40px
    // slivers, 16px gaps); it shrinks to the neighbour size (0.9) as it
    // travels to the side.
    const scale = (1 - distanceFromCenter * 0.1) * CARD_SCALE;
    // Rotation is a pure function of the card's visible position (clamped to
    // the side slots): side cards lean inwards, the lean fades smoothly to
    // zero as a card travels to the center. Because it depends only on the
    // visible position — not on which card is "current" — no card ever
    // snaps during drag, release animation, or the index swap.
    const clampedPosition = Math.max(-1, Math.min(1, (position * spacing + offset) / spacing));
    const leanRotation = -clampedPosition * 2;
    // Idle micro animation: nudge the current card toward the swipeable
    // direction; the neighbouring cards follow with a smaller nudge.
    const hintAnimation = hint && !hintDone.current && !isAnimating && startX.current === null
      ? `${hint === 'next' ? 'slf-hint-next' : 'slf-hint-prev'} 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 2s 1`
      : undefined;
    const words = item.trim().split(/(?:,\s*|\s+)/).filter(Boolean);
    return (
      <div
        key={cardKey}
        data-custom={customIndex !== null || undefined}
        className="pointer-events-none absolute inset-y-0 flex items-center justify-center overflow-hidden text-center font-rauschen text-[20px] uppercase leading-none md:text-[24px]"
        lang="de"
        style={{
          left: slotInset,
          right: slotInset,
          borderRadius: '16px',
          // Soft hyphens only: the words carry correct German break points
          // (see hyphenateGerman); the browser breaks them only when they
          // actually exceed the line width. Chrome skips dictionary
          // hyphenation on uppercase text, so the points are baked in.
          hyphens: 'manual',
          WebkitHyphens: 'manual',
          overflowWrap: 'break-word',
          wordBreak: 'normal',
          // Polished frosted glass card (reference look).
          color: 'hsl(0 0% 100%)',
          background: 'linear-gradient(hsl(0 0% 0% / 0.2), hsl(0 0% 0% / 0.2)), linear-gradient(165deg, hsl(0 0% 100% / 0.066), hsl(0 0% 100% / 0.042) 45%, hsl(0 0% 100% / 0.026))',
          backdropFilter: 'blur(64px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(64px) saturate(1.6)',
          boxShadow: 'inset 0 1px 1px hsl(0 0% 100% / 0.38), inset 0 -1px 1px hsl(0 0% 100% / 0.14), 0 0 5px 5px hsl(0 0% 0% / 0.024)',
          transform: `translateX(${position * spacing + offset}px) scale(${scale}) rotate(${leanRotation}deg)`,
          opacity: 1,
          transition,
          animation: [hintAnimation, 'slf-card-in 450ms ease-out both'].filter(Boolean).join(', '),
          zIndex: isCurrent ? 2 : 1,
        }}
        aria-hidden={!isCurrent}
      >
        {/* Gradient blobs: each slider's own color story (rosa/lila,
            turquoise, red/yellow, plus one darker accent tone) pooled as
            soft, subtle round glows near the top of the card, random per
            category (seeded by name), kept mostly centered and
            non-overlapping. Strength scales with the slider family. */}
        {makeCardBlobs(item, familyIndex).map((blob, blobIndex) => (
          <div
            key={blobIndex}
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              left: `${blob.x.toFixed(1)}%`,
              top: `${blob.y.toFixed(1)}%`,
              width: `${blob.size.toFixed(1)}%`,
              aspectRatio: '1',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              background: (() => {
                const base = FAMILY_BLOB_ALPHA[familyIndex] ?? 0.4;
                const core = Math.min(base * (blob.alphaScale ?? 1), 1);
                return `radial-gradient(circle, hsl(${blob.hue} / ${core.toFixed(3)}), hsl(${blob.hue} / ${(core * 0.325).toFixed(3)}) 55%, transparent 75%)`;
              })(),
              filter: 'blur(12px)',
              mixBlendMode: 'screen',
            }}
          />
        ))}
        {/* Gradient glass rim: a 1px beveled edge that runs bright along the top-left and relaxes toward the bottom-right. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 'inherit',
            padding: '1px',
            background: 'linear-gradient(155deg, hsl(0 0% 100% / 0.04), hsl(0 0% 100% / 0.0072) 38%, hsl(0 0% 100% / 0.0054) 62%, hsl(0 0% 100% / 0.018))',
            WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
        {/* Soft specular sheen so the glass reads deeper. */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ borderRadius: 'inherit', background: 'radial-gradient(120% 60% at 30% 0%, hsl(0 0% 100% / 0.15), transparent 62%)' }} />
        {/* Extra card grain: a dark speckle tinted to the family's own hue, so the texture reads colored instead of black. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: 'inherit',
            backgroundImage: FAMILY_GRAINS[familyIndex] ?? FAMILY_GRAINS[0],
            backgroundSize: '90px 90px',
            mixBlendMode: 'overlay',
            opacity: 0.53,
          }}
        />
        {customIndex !== null
          ? (() => {
            const value = customs[customIndex] ?? '';
            const showFake = !value && focusedCustom !== customIndex;
            return (
              <span className="relative block w-full px-6" style={{ minWidth: 0, overflowWrap: 'break-word', transform: `rotate(${itemRotation}deg)` }}>
                {showFake && (
                  <span className="pointer-events-none flex items-center justify-center">
                    <span className="italic" style={{ opacity: 0.22, borderBottom: '1.5px dashed currentColor', paddingBottom: '2px' }}>Deine Kategorie…</span>
                    <span className="ml-1 inline-block h-[0.9em] w-[2px] bg-current" style={{ animation: 'slf-caret-blink 1s step-end infinite' }} />
                  </span>
                )}
                <input
                  type="text"
                  value={value}
                  tabIndex={isCurrent ? 0 : -1}
                  placeholder="Deine Kategorie…"
                  aria-label={`${label}: eigene Kategorie`}
                  onChange={(event) => updateCustom(customIndex, event.target.value)}
                  onFocus={() => setFocusedCustom(customIndex)}
                  onBlur={() => setFocusedCustom(null)}
                  onKeyDown={(event) => { if (event.key === 'Enter') (event.target as HTMLInputElement).blur(); }}
                  className={`${isCurrent ? 'pointer-events-auto' : 'pointer-events-none'} ${showFake ? 'absolute inset-0 opacity-0' : ''} w-full bg-transparent text-center font-rauschen uppercase outline-none placeholder:italic placeholder:normal-case placeholder:text-current placeholder:opacity-[0.22] placeholder:underline placeholder:decoration-dashed placeholder:decoration-1 placeholder:underline-offset-4`}
                  style={{ caretColor: 'currentColor', fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}
                />
              </span>
            );
          })()
          : (() => {
              // Each text row gets its own slight rotation, seeded by the
              // category name (like the blobs), echoing the tilted title.
              const seed = item.trim().split('').reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) % 97, 7);
              const rowPool = [-1.2, 0.6, 1, -0.6, 1.2, -0.8];
              const rows: { key: string; className: string; text: string }[] = [];
              words.forEach((word, wordIndex) => {
                const fontClass = word === '&' || (words.length === 3 && wordIndex === 1) ? 'font-stringer' : 'font-rauschen';
                // Multi-word items already span 2-3 lines, so only break
                // noticeably longer words here than on single-line cards.
                const halves = splitLongGerman(word, 14);
                if (halves) {
                  rows.push({ key: `${wordIndex}-a`, className: fontClass, text: halves[0] });
                  rows.push({ key: `${wordIndex}-b`, className: fontClass, text: halves[1] });
                } else {
                  rows.push({ key: String(wordIndex), className: fontClass, text: hyphenateGerman(word) });
                }
              });
              return (
                <span className="block px-6" style={{ minWidth: 0, maxWidth: '100%', overflowWrap: 'break-word', transform: `rotate(${itemRotation}deg)` }}>
                  {rows.map((row, rowIndex) => (
                    <span key={row.key} className={`block ${row.className}`} style={{ transform: `rotate(${rowPool[(seed + rowIndex) % rowPool.length]}deg)` }}>{row.text}</span>
                  ))}
                </span>
              );
            })()}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-0 flex-1 cursor-grab items-center justify-center overflow-visible text-quiz-category-text active:cursor-grabbing"
      style={{ borderRadius: '16px', touchAction: 'pan-y', ...style }}
      aria-label={label}
      onTouchStart={(event) => {
        event.stopPropagation();
        beginDrag(event.touches[0].clientX);
      }}
      onTouchMove={(event) => {
        event.stopPropagation();
        moveDrag(event.touches[0].clientX);
      }}
      onTouchEnd={(event) => {
        event.stopPropagation();
        endDrag();
      }}
      onMouseDown={(event) => {
        event.stopPropagation();
        beginDrag(event.clientX);
      }}
      onMouseMove={(event) => {
        event.stopPropagation();
        moveDrag(event.clientX);
      }}
      onMouseUp={(event) => {
        event.stopPropagation();
        endDrag();
      }}
      onMouseLeave={(event) => {
        event.stopPropagation();
        endDrag();
      }}
    >
      {/* Hidden until loaded: nothing renders while the sheet content is
          still loading — the layout height stays reserved by the container,
          so there is no shift, but no placeholder cards are visible. */}
      {count > 0 && <>
          {renderCard(prev2Item, (index - 2 + count) % count, -2)}
          {renderCard(prevItem, (index - 1 + count) % count, -1)}
          {renderCard(currentItem, index, 0)}
          {renderCard(nextItem, (index + 1) % count, 1)}
          {renderCard(next2Item, (index + 2) % count, 2)}
        </>}
    </div>
  );
}

export function GameSetupSlide({
  onSwipeLeft,
  onSwipeRight,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging = false,
  onOpenInfo,
}: GameSetupSlideProps) {
  const [columns, setColumns] = useState<string[][]>([[], [], []]);
  const [displayLetter, setDisplayLetter] = useState(() => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]);
  // Smiley rotation is driven directly by the category drag: a full
  // card-width drag equals one full turn; committed turns are absorbed
  // into the base so the rotation never snaps back after a slide change.
  const [smileyBase, setSmileyBase] = useState(0);
  const [smileyProgress, setSmileyProgress] = useState(0);
  const [smileyDragging, setSmileyDragging] = useState(false);
  const handleRotateDrag = useCallback((progress: number, dragging: boolean) => {
    setSmileyProgress(progress);
    setSmileyDragging(dragging);
  }, []);
  const handleRotateCommit = useCallback((direction: number) => {
    setSmileyBase((base) => base - direction * 360);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadCategories = async () => {
      try {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&sheet=${SHEET_NAME}`;
        const response = await fetch(url, { cache: 'no-cache', signal: controller.signal });
        if (!response.ok) throw new Error(`Category sheet returned ${response.status}`);
        const rows = parseCsv(await response.text());
        setColumns([0, 1, 2].map((column) => rows.map((row) => row[column]?.trim()).filter(Boolean)));
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.error('Could not load Stadt Land Fluss categories:', error);
        // Fall back to built-in categories so the sliders never stay empty.
        setColumns(FALLBACK_COLUMNS);
      }
    };

    loadCategories();
    return () => controller.abort();
  }, []);

  const [isRolling, setIsRolling] = useState(false);
  const rollTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (rollTimeoutRef.current !== null) window.clearTimeout(rollTimeoutRef.current);
  }, []);

  const rollLetter = () => {
    if (isRolling) return;
    setIsRolling(true);
    const finalLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    // Long, decelerating browse: starts fast, eases out over ~2s while
    // flicking through ~25 letters, never repeating the previous one.
    let delay = 25;
    let last = displayLetter;
    const tick = () => {
      let next = last;
      while (next === last) next = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      last = next;
      setDisplayLetter(next);
      delay = Math.min(delay * 1.1, 200);
      rollTimeoutRef.current = window.setTimeout(() => {
        if (delay >= 200) {
          setDisplayLetter(finalLetter);
          setIsRolling(false);
        } else {
          tick();
        }
      }, delay);
    };
    tick();
  };

  return (
    <div
      className="mx-auto flex h-[calc(100%-8px)] max-h-[calc(100%-8px)] w-full max-w-[500px] select-none flex-col gap-8"
      style={{ touchAction: 'none' }}
    >
      <div className="relative flex shrink-0 flex-col items-center gap-[10px] overflow-visible rounded-[8px] px-2 pt-2 pb-2 text-quiz-setup-ink">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(event) => {
            event.stopPropagation();
            onOpenInfo();
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          className="absolute right-1 top-1 z-10 h-9 w-9 rounded-full bg-transparent p-2 hover:bg-transparent"
          aria-label="Beschreibung öffnen"
        >
          <img src={filterIcon} alt="" className="h-5 w-5 invert" />
        </Button>
        <h2 className="flex w-full flex-col items-start text-left leading-[0.8]" style={{ transform: 'scale(1.012)', transformOrigin: 'top left' }} aria-label="Stadt Land Fluss">
          <span style={{ rotate: '-3deg', translate: '-4px 0' }} className="font-rauschen text-[19px] uppercase [animation:slf-title-arrive_500ms_cubic-bezier(0.34,1.56,0.64,1)_both]">Stadt</span>
          <span style={{ rotate: '0deg', translate: '30px 0', marginTop: '1px' }} className="relative z-10 font-stringer text-[19px] leading-none [animation:slf-title-arrive_500ms_cubic-bezier(0.34,1.56,0.64,1)_80ms_both]">L<svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-px inline-block align-middle" style={{ width: '0.72em', height: '0.72em', transform: `translateY(-0.06em) rotate(${smileyBase + smileyProgress * 360}deg)`, transition: smileyDragging ? 'none' : 'transform 250ms ease-out' }} aria-hidden="true">
            <circle cx="9" cy="9" r="9" fill="#FFFF33" />
            <circle cx="6" cy="7" r="1" fill="black" />
            <circle cx="12" cy="7" r="1" fill="black" />
            <path d="M 6 11 Q 9 13 12 11" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round" />
          </svg>nd</span>
          <span className="font-rauschen text-[19px] uppercase [animation:slf-title-arrive_500ms_cubic-bezier(0.34,1.56,0.64,1)_160ms_both]" style={{ rotate: '2deg', translate: '14px 4px', marginTop: '0px' }}>Fluss</span>
        </h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0">
        <CategorySlider items={columns[0]} familyIndex={0} label="Stadt" hint="next" onRotateDrag={handleRotateDrag} onRotateCommit={handleRotateCommit} />
        <CategorySlider style={{ marginTop: '-8px' }} items={columns[1]} familyIndex={1} label="Land" hint="prev" onRotateDrag={handleRotateDrag} onRotateCommit={handleRotateCommit} />
        <CategorySlider style={{ marginTop: '-8px' }} items={columns[2]} familyIndex={2} label="Fluss" hint="next" onRotateDrag={handleRotateDrag} onRotateCommit={handleRotateCommit} />
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={isRolling ? undefined : rollLetter}
        className="relative h-auto shrink-0 rounded-[8px] bg-transparent px-2 pt-3 pb-3 text-quiz-setup-ink [-webkit-tap-highlight-color:transparent] hover:bg-transparent hover:text-quiz-setup-ink focus-visible:ring-0 focus-visible:ring-offset-0"
        aria-label="Zufälligen Buchstaben wählen"
      >
        <span className="relative flex w-full items-center justify-center">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 font-stringer text-[14px]" style={{ opacity: 0.8 }}>Mit</span>
          <span
            key={displayLetter}
            className="font-rauschen text-[56px] uppercase leading-none"
            style={{ animation: `slf-letter-flick ${isRolling ? 90 : 260}ms cubic-bezier(0.34, 1.4, 0.64, 1) both` }}
          >{displayLetter}</span>
          <RefreshCw className="absolute right-2 top-1/2 -translate-y-1/2" style={{ width: 20, height: 20, opacity: 0.8 }} />
        </span>
      </Button>
    </div>
  );
}