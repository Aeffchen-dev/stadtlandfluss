import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'de' | 'en';

const STRINGS = {
  howItWorks: { de: 'So funktioniert’s', en: 'How it works' },
  modalDescription: { de: 'Beschreibung des Spiels', en: 'Description of the game' },
  closeDescription: { de: 'Beschreibung schließen', en: 'Close description' },
  openDescription: { de: 'Beschreibung öffnen', en: 'Open description' },
  intro: {
    de: 'Drei Kategorien, ein Buchstabe – was fällt dir ein? Spielt abwechselnd und entdeckt, welche Wörter der andere im Kopf hat.',
    en: 'Three categories, one letter – what comes to mind? Take turns and discover which words are on the other person’s mind.',
  },
  step1: { de: 'Wählt durch Wischen drei Kategorien aus.', en: 'Swipe to choose three categories.' },
  step2: {
    de: 'Wer beginnt, klickt auf den Buchstaben unten und findet dazu ein Wort pro Kategorie – zum Beispiel Panda, Paris und Pizza bei „P“.',
    en: 'Whoever starts taps the letter at the bottom and finds one word per category – for example Panda, Paris and Pizza for “P”.',
  },
  step3: {
    de: 'Dann ist der andere dran: neuen Buchstaben generieren und drei passende Wörter finden.',
    en: 'Then it’s the other person’s turn: generate a new letter and find three matching words.',
  },
  step4: {
    de: 'Nachdem ihr beide zweimal dran wart, wählt ihr neue Kategorien und spielt weiter.',
    en: 'Once you’ve both had two turns, choose new categories and keep playing.',
  },
  outro: { de: 'Wenn ihr mögt, könnt ihr auch eigene Kategorien ergänzen.', en: 'If you like, you can also add your own categories.' },
  customWord1: { de: 'Eigene', en: 'Own' },
  customWord2: { de: 'Kategorie…', en: 'Category…' },
  customPlaceholder: { de: 'Eigene Kategorie…', en: 'Own category…' },
  customAria: { de: 'eigene Kategorie', en: 'own category' },
  with: { de: 'Mit', en: 'With' },
  rollLetter: { de: 'Zufälligen Buchstaben wählen', en: 'Pick a random letter' },
  switchLanguage: { de: 'Switch to English', en: 'Auf Deutsch wechseln' },
} as const;

export type StringKey = keyof typeof STRINGS;

const CATEGORY_EN: Record<string, string> = {
  'Liebe, Sex, Partnerschaft': 'Love, Sex, Relationship',
  Stadt: 'City',
  'Lebensmittel & Gerichte': 'Food & Dishes',
  Lebensmittel: 'Food',
  Beruf: 'Job',
  Land: 'Country',
  Getränk: 'Drink',
  Tier: 'Animal',
  Gewässer: 'Sea, River or Lake',
  'Gesundheit & Körper': 'Health & Body',
  Frauenname: 'Female Name',
  'Pflanzen & Bäume': 'Plants & Trees',
  Pflanze: 'Plant',
  'Stars & VIPs': 'Celebrity',
  Männername: 'Male Name',
  Sehenswürdigkeit: 'Landmark',
  Literatur: 'Literature',
  Schimpfwort: 'Swear Word',
  Politik: 'Politics',
  Kunst: 'Art',
  Hobby: 'Hobby',
  'Zeichentrick & Animation': 'Cartoons & Animation',
  'Musik & Tanz': 'Music & Dance',
  Sport: 'Sport',
  Sportart: 'Sport',
  Technik: 'Technology',
  Kleidung: 'Clothing',
  Marke: 'Brand',
  'Transport & Verkehr': 'Transport & Traffic',
  'Film & Fernsehen': 'Movies & TV',
  Farbe: 'Color',
  Eigenschaft: 'Characteristic',
  Gegenstand: 'Object',
  Fluss: 'River',
  Name: 'Name',
  Film: 'Film',
  Buch: 'Book',
  Märchen: 'Fairy Tale',
};

export const translateCategory = (value: string, lang: Lang) =>
  lang === 'en' ? CATEGORY_EN[value.trim()] ?? value : value;

interface LangContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: StringKey) => string;
}

const LangContext = createContext<LangContextValue | null>(null);
const STORAGE_KEY = 'slf-lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'de';
    } catch {
      return 'de';
    }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const toggleLang = useCallback(() => setLang((l) => (l === 'de' ? 'en' : 'de')), []);
  const t = useCallback((key: StringKey) => STRINGS[key][lang], [lang]);

  return <LangContext.Provider value={{ lang, toggleLang, t }}>{children}</LangContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}

// Categories missing from the built-in dictionary are translated
// automatically (free MyMemory service) and cached on the device.
const AUTO_CACHE_KEY = 'slf-auto-translations';
const readAutoCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(AUTO_CACHE_KEY) || '{}'); } catch { return {}; }
};

async function autoTranslate(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=de|en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const out: unknown = data?.responseData?.translatedText;
    if (typeof out !== 'string' || !out.trim() || data?.quotaFinished) return null;
    if (/MYMEMORY|QUERY LENGTH/i.test(out)) return null;
    return out.trim().replace(/\b\p{Ll}/gu, (c) => c.toUpperCase());
  } catch {
    return null;
  }
}

export function useTranslatedCategories(columns: string[][], lang: Lang): string[][] {
  const [auto, setAuto] = useState<Record<string, string>>(readAutoCache);

  useEffect(() => {
    if (lang !== 'en') return;
    const missing = Array.from(new Set(columns.flat().map((v) => v.trim())))
      .filter((v) => v && !CATEGORY_EN[v] && !auto[v]);
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const found: Record<string, string> = {};
      for (const word of missing) {
        const translated = await autoTranslate(word);
        if (translated) found[word] = translated;
      }
      if (cancelled || Object.keys(found).length === 0) return;
      setAuto((prev) => {
        const next = { ...prev, ...found };
        try { localStorage.setItem(AUTO_CACHE_KEY, JSON.stringify(next)); } catch { /* quota */ }
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, [columns, lang, auto]);

  return useMemo(
    () => columns.map((column) => column.map((item) =>
      lang === 'en' ? CATEGORY_EN[item.trim()] ?? auto[item.trim()] ?? item : item)),
    [columns, lang, auto],
  );
}
