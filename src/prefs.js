import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

const KEY = 'bridgetalk:prefs';

const DEFAULTS = {
  onboarded: false,
  myLanguage: 'English', // "I speak"
  travelLanguage: 'Spanish', // "I'm travelling to"
  allergies: '',
  address: '',
  streak: { count: 0, last: null }, // last = 'YYYY-MM-DD' of the most recent visit
};

const PrefsContext = createContext(null);

export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// Consecutive days count up; missing a day starts the streak again at 1.
export function nextStreak(streak, today = new Date()) {
  const todayKey = dayKey(today);
  if (streak?.last === todayKey) return streak;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const count = streak?.last === dayKey(yesterday) ? (streak.count || 0) + 1 : 1;
  return { count, last: todayKey };
}

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON(KEY, {}).then((saved) => {
      setPrefs({ ...DEFAULTS, ...saved });
      setLoaded(true);
    });
  }, []);

  const update = useCallback((patch) => {
    setPrefs((current) => {
      const next = { ...current, ...(typeof patch === 'function' ? patch(current) : patch) };
      saveJSON(KEY, next);
      return next;
    });
  }, []);

  const recordVisit = useCallback(() => update((p) => ({ streak: nextStreak(p.streak) })), [update]);

  const value = useMemo(() => ({ prefs, loaded, update, recordVisit }), [prefs, loaded, update, recordVisit]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
}
