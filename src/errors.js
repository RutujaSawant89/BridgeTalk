// Every failure the app can hit is an AppError with a `kind`. Screens show friendlyMessage(),
// never the raw API text; the technical detail only goes to the console.

export class AppError extends Error {
  constructor(kind, detail, extra = {}) {
    super(detail || kind);
    this.name = 'AppError';
    this.kind = kind;
    Object.assign(this, extra);
  }
}

const MESSAGES = {
  offline: "You're offline. Check your internet connection and try again.",
  warming: 'Warming up, try again in a few seconds.',
  rate_limit: 'Lots of people are using BridgeTalk right now. Please wait a few seconds and try again.',
  audio_too_large: 'That recording is too long. Try saying it in shorter parts.',
  audio_unclear: "Didn't catch that. Try speaking louder and closer to the phone.",
  unreadable_photo: "We couldn't read that photo. Try again with more light, hold the phone steady and fill the frame with the text.",
  empty_input: 'Type something to translate first.',
  generic: 'Something went wrong. Please try again.',
};

// Which message a given error kind shows, depending on the screen it happened on.
function messageKind(kind, context) {
  switch (kind) {
    case 'offline':
    case 'network':
      return 'offline';
    case 'timeout':
    case 'warming':
      return 'warming';
    case 'rate_limit':
      return 'rate_limit';
    case 'too_large':
      return context === 'talk' ? 'audio_too_large' : context === 'scan' ? 'unreadable_photo' : 'generic';
    case 'audio_unclear':
      return 'audio_unclear';
    case 'bad_response':
    case 'json_failed':
    case 'bad_request':
      return context === 'scan' ? 'unreadable_photo' : 'generic';
    case 'empty_input':
      return 'empty_input';
    default:
      return 'generic';
  }
}

export function friendlyMessage(error, context = 'app') {
  const kind = error?.kind ?? (error?.name === 'AbortError' ? 'timeout' : 'unknown');
  console.warn(`[BridgeTalk:${context}] ${kind}`, {
    message: error?.message,
    status: error?.status,
    code: error?.code,
  });
  return MESSAGES[messageKind(kind, context)];
}
