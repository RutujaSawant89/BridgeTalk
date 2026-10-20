import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadJSON, saveJSON } from './storage';

const KEY = 'bridgetalk:history';
export const MAX_HISTORY = 200;

// Newest first. Past the limit the oldest unstarred items go first, so saved ones are never lost.
export function trimHistory(items, max = MAX_HISTORY) {
  if (items.length <= max) return items;
  const keep = new Set();
  for (const item of items) if (item.starred) keep.add(item.id);
  for (const item of items) {
    if (keep.size >= max) break;
    keep.add(item.id);
  }
  return items.filter((item) => keep.has(item.id));
}

export function searchHistory(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    [item.original, item.translation, item.pronunciation, item.from, item.to].some((field) =>
      String(field ?? '').toLowerCase().includes(q)
    )
  );
}

const HistoryContext = createContext(null);

// Item: { id, kind: 'translate' | 'talk', original, translation, pronunciation, from, to, vibeId, starred, at }
export function HistoryProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const counter = useRef(0);

  useEffect(() => {
    loadJSON(KEY, []).then((saved) => {
      setItems(Array.isArray(saved) ? saved : []);
      setLoaded(true);
    });
  }, []);

  const commit = useCallback((change) => {
    setItems((current) => {
      const next = trimHistory(change(current));
      saveJSON(KEY, next);
      return next;
    });
  }, []);

  const add = useCallback(
    (entry) => {
      const id = `${Date.now()}-${counter.current++}`;
      commit((current) => [{ starred: false, ...entry, id, at: Date.now() }, ...current]);
      return id;
    },
    [commit]
  );

  const patch = useCallback(
    (id, changes) => commit((current) => current.map((item) => (item.id === id ? { ...item, ...changes } : item))),
    [commit]
  );
  const toggleStar = useCallback(
    (id, changes = {}) =>
      commit((current) => current.map((item) => (item.id === id ? { ...item, ...changes, starred: !item.starred } : item))),
    [commit]
  );
  const remove = useCallback((id) => commit((current) => current.filter((item) => item.id !== id)), [commit]);
  const clearUnstarred = useCallback(() => commit((current) => current.filter((item) => item.starred)), [commit]);

  const value = useMemo(
    () => ({ items, loaded, add, patch, toggleStar, remove, clearUnstarred }),
    [items, loaded, add, patch, toggleStar, remove, clearUnstarred]
  );
  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error('useHistory must be used inside HistoryProvider');
  return ctx;
}
