// Development-only logging. Release builds log nothing: messages can contain the user's own
// text (translations, model replies), which must not end up in device logs.
export function devWarn(...args) {
  if (__DEV__) console.warn(...args);
}

export function devError(...args) {
  if (__DEV__) console.error(...args);
}
