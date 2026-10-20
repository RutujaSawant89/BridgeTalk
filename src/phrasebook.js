import data from './data/phrasebook.json';

// Bundled with the app, so everything here works offline.
export const PHRASEBOOK_LANGUAGES = data.languages;
export const CATEGORIES = data.categories;
export const PHRASES = data.phrases;

export const hasPhrasebook = (language) => PHRASEBOOK_LANGUAGES.includes(language);

// { id, category, en, translation, pronunciation } for one language
export function phrasesFor(language) {
  if (!hasPhrasebook(language)) return [];
  return PHRASES.map(({ t, ...phrase }) => ({ ...phrase, translation: t[language][0], pronunciation: t[language][1] }));
}

// Same phrase for everyone on a given day; cycles through the whole book.
export function phraseOfTheDay(language, date = new Date()) {
  const day = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const phrase = PHRASES[day % PHRASES.length];
  const entry = hasPhrasebook(language) ? phrase.t[language] : null;
  return { ...phrase, language, translation: entry?.[0] ?? null, pronunciation: entry?.[1] ?? null };
}

export const SOS_LINES = ['help', 'ambulance', 'allergic', 'address'];
export const sosText = (language) => data.sos[language] ?? null;
