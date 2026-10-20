jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { nextStreak, dayKey } from '../prefs';
import { trimHistory, searchHistory, MAX_HISTORY } from '../history';
import { phraseOfTheDay, phrasesFor, hasPhrasebook, sosText, PHRASES, PHRASEBOOK_LANGUAGES, CATEGORIES } from '../phrasebook';
import { LANGUAGES } from '../languages';

describe('streak', () => {
  const day = (s) => new Date(`${s}T10:00:00`);

  it('starts at 1 on the first visit', () => {
    expect(nextStreak({ count: 0, last: null }, day('2026-10-20'))).toEqual({ count: 1, last: '2026-10-20' });
  });
  it('counts up on consecutive days, including across a month end', () => {
    expect(nextStreak({ count: 4, last: '2026-10-31' }, day('2026-11-01'))).toEqual({ count: 5, last: '2026-11-01' });
  });
  it('does not change on a second visit the same day', () => {
    const streak = { count: 3, last: '2026-10-20' };
    expect(nextStreak(streak, day('2026-10-20'))).toBe(streak);
  });
  it('resets after a missed day', () => {
    expect(nextStreak({ count: 9, last: '2026-10-17' }, day('2026-10-20'))).toEqual({ count: 1, last: '2026-10-20' });
  });
  it('formats day keys with padding', () => {
    expect(dayKey(day('2026-03-05'))).toBe('2026-03-05');
  });
});

describe('history', () => {
  const make = (n, starredEvery = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: String(i), original: `text ${i}`, starred: starredEvery ? i % starredEvery === 0 : false }));

  it('keeps everything under the limit', () => {
    const items = make(10);
    expect(trimHistory(items)).toBe(items);
  });
  it(`caps at ${MAX_HISTORY}, dropping the oldest`, () => {
    const trimmed = trimHistory(make(250));
    expect(trimmed).toHaveLength(MAX_HISTORY);
    expect(trimmed[0].id).toBe('0'); // newest kept
    expect(trimmed.at(-1).id).toBe(String(MAX_HISTORY - 1));
  });
  it('never drops starred items, even old ones', () => {
    const items = make(250);
    items[249].starred = true; // the oldest one
    const trimmed = trimHistory(items);
    expect(trimmed).toHaveLength(MAX_HISTORY);
    expect(trimmed.some((i) => i.id === '249')).toBe(true);
  });
  it('searches original, translation and languages, case-insensitively', () => {
    const items = [
      { id: '1', original: 'Where is the station?', translation: '¿Dónde está la estación?', from: 'English', to: 'Spanish' },
      { id: '2', original: 'Thank you', translation: 'ありがとう', from: 'English', to: 'Japanese' },
    ];
    expect(searchHistory(items, 'STATION').map((i) => i.id)).toEqual(['1']);
    expect(searchHistory(items, 'ありがとう').map((i) => i.id)).toEqual(['2']);
    expect(searchHistory(items, 'japanese').map((i) => i.id)).toEqual(['2']);
    expect(searchHistory(items, '  ')).toBe(items);
  });
});

describe('phrasebook', () => {
  it('has 40 phrases across 6 categories for 12 languages', () => {
    expect(PHRASES).toHaveLength(40);
    expect(CATEGORIES).toHaveLength(6);
    expect(PHRASEBOOK_LANGUAGES).toHaveLength(12);
  });
  it('only uses languages the app knows', () => {
    for (const name of PHRASEBOOK_LANGUAGES) expect(LANGUAGES.find((l) => l.name === name)).toBeTruthy();
  });
  it('returns translated phrases for a phrasebook language and none otherwise', () => {
    const thai = phrasesFor('Thai');
    expect(thai).toHaveLength(40);
    expect(thai.find((p) => p.id === 'thank_you')).toMatchObject({ en: 'Thank you', translation: 'ขอบคุณครับ/ค่ะ' });
    expect(hasPhrasebook('Swahili')).toBe(false);
    expect(phrasesFor('Swahili')).toEqual([]);
  });
  it('picks the same phrase all day and a different one tomorrow', () => {
    const a = phraseOfTheDay('Spanish', new Date('2026-10-20T08:00:00'));
    const b = phraseOfTheDay('Spanish', new Date('2026-10-20T22:00:00'));
    const c = phraseOfTheDay('Spanish', new Date('2026-10-21T08:00:00'));
    expect(a.id).toBe(b.id);
    expect(c.id).not.toBe(a.id);
    expect(a.translation).toBeTruthy();
  });
  it('falls back to English only for languages without a phrasebook', () => {
    const p = phraseOfTheDay('Swahili', new Date('2026-10-20T08:00:00'));
    expect(p.en).toBeTruthy();
    expect(p.translation).toBeNull();
  });
  it('has SOS text for English and every phrasebook language', () => {
    for (const name of ['English', ...PHRASEBOOK_LANGUAGES]) {
      expect(sosText(name)).toEqual(
        expect.objectContaining({ help: expect.any(String), ambulance: expect.any(String), allergic: expect.any(String), address: expect.any(String) })
      );
    }
  });
});

describe('languages', () => {
  it.each([
    ['Thai', 'th', 'th-TH'],
    ['Vietnamese', 'vi', 'vi-VN'],
    ['Indonesian', 'id', 'id-ID'],
    ['Dutch', 'nl', 'nl-NL'],
    ['Greek', 'el', 'el-GR'],
    ['Polish', 'pl', 'pl-PL'],
    ['Swahili', 'sw', 'sw-KE'],
    ['Hebrew', 'he', 'he-IL'],
    ['Malay', 'ms', 'ms-MY'],
    ['Filipino', 'tl', 'fil-PH'],
  ])('%s has whisper %s and tts %s', (name, whisper, tts) => {
    expect(LANGUAGES.find((l) => l.name === name)).toMatchObject({ whisper, tts });
  });
  it('has no duplicate names', () => {
    const names = LANGUAGES.map((l) => l.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('scriptFont', () => {
  const { scriptFont, fonts } = require('../theme');
  it.each([
    ['Hello', 'regular', fonts.regular],
    ['Hello', 'bold', fonts.bold],
    ['नमस्ते', 'regular', 'NotoSansDevanagari_400Regular'],
    ['नमस्ते', 'semibold', 'NotoSansDevanagari_700Bold'],
    ['வணக்கம்', 'bold', 'NotoSansTamil_700Bold'],
    ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'regular', 'NotoSansGurmukhi_400Regular'],
    ['ଓଡ଼ିଆ', 'regular', 'NotoSansOriya_400Regular'],
    ['مرحبا', 'regular', 'NotoSansArabic_400Regular'],
    ['שלום', 'regular', 'NotoSansHebrew_400Regular'],
    ['สวัสดี', 'bold', 'NotoSansThai_700Bold'],
    ['Привет', 'regular', 'NotoSans_400Regular'],
    ['Γειά σου', 'bold', 'NotoSans_700Bold'],
  ])('%s (%s) uses %s', (text, weight, family) => {
    expect(scriptFont(text, weight).fontFamily).toBe(family);
  });
  it.each(['你好', 'こんにちは', '안녕하세요'])('%s falls back to the system CJK font', (text) => {
    expect(scriptFont(text, 'bold')).toEqual({ fontFamily: undefined, fontWeight: '700' });
  });
  it('picks the script of mixed text like Hinglish in Devanagari', () => {
    expect(scriptFont('यार, मैं बहुत hungry हूँ').fontFamily).toBe('NotoSansDevanagari_400Regular');
  });
});
