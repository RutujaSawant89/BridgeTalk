// BridgeTalk design tokens. Screens import from here; no raw colors, fonts or radii elsewhere.

export const colors = {
  bg: '#0E0D14', // app background
  surface: '#1A1824', // cards, inputs, tab bar
  raised: '#24212F', // buttons and chips sitting on a surface
  border: '#2E2B3B',
  text: '#F4F2FA',
  muted: '#A9A5BA',
  accent: '#7C5CFF',
  marigold: '#FFB547',
  onAccent: '#FFFFFF', // text on accent fills
  onVibe: '#0E0D14', // dark text on an active (vibe-coloured) chip
  error: '#FF6B72',
  success: '#3DD68C',
  scrim: 'rgba(8, 7, 12, 0.72)',
  // Text and lines on accent / gradient fills (share card, my chat bubbles)
  onAccentSoft: 'rgba(255, 255, 255, 0.82)',
  onAccentFaint: 'rgba(255, 255, 255, 0.3)',
  // Culture bite / warnings: marigold on a dark warm surface
  tipBg: '#2A2218',
  tipBorder: '#FFB547',
  tipText: '#FFE2B3',
};

export const vibeColors = {
  formal: '#6EA8FF',
  casual: '#3DD68C',
  local: '#FFB547',
  filmy: '#FF6FA8',
};

// "Show to local": dark ink on white paper for maximum contrast in sunlight
export const paper = { bg: '#FFFFFF', ink: '#0E0D14', inkSoft: '#4A4658', inkFaint: '#7D798C', button: '#ECEAF3' };

export const sos = { bg: '#B4232A', bgDark: '#7F181E', text: '#FFFFFF', soft: '#FFD9DB' };

export const gradient = ['#7C5CFF', '#6346E8'];

export const radius = {
  sm: 12, // small inner elements (badges, notes inside cards)
  md: 16, // inputs and buttons
  card: 20, // cards
  sheet: 28, // bottom sheets
  pill: 999, // chips
};

// Spacing scale; screens use lg/xl for page padding and md/lg between blocks.
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 };

// Minimum size of anything tappable.
export const touch = 44;

// Font families (loaded in src/fonts.js). Android needs one family per weight.
export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold', // titles
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
};

// Noto families for non-Latin scripts, by Unicode block. CJK and Hangul use the phone's
// built-in Noto CJK fonts (too large to bundle), so they map to null.
const SCRIPTS = [
  [/[ऀ-ॿ]/, 'NotoSansDevanagari'],
  [/[ঀ-৿]/, 'NotoSansBengali'],
  [/[਀-੿]/, 'NotoSansGurmukhi'],
  [/[઀-૿]/, 'NotoSansGujarati'],
  [/[଀-୿]/, 'NotoSansOriya'],
  [/[஀-௿]/, 'NotoSansTamil'],
  [/[ఀ-౿]/, 'NotoSansTelugu'],
  [/[ಀ-೿]/, 'NotoSansKannada'],
  [/[ഀ-ൿ]/, 'NotoSansMalayalam'],
  [/[฀-๿]/, 'NotoSansThai'],
  [/[֐-׿]/, 'NotoSansHebrew'],
  [/[؀-ۿݐ-ݿ]/, 'NotoSansArabic'],
  [/[Ͱ-ϿЀ-ӿ]/, 'NotoSans'], // Greek, Cyrillic
  [/[぀-ヿ㐀-鿿가-힯]/, null],
];

const isBold = (weight) => weight === 'semibold' || weight === 'bold' || weight === 'display';

// Font for a piece of content: Inter (or the display face) for Latin text, the matching
// Noto family for other scripts. Returns a style object to spread into a Text style.
export function scriptFont(text, weight = 'regular') {
  const value = String(text ?? '');
  for (const [pattern, family] of SCRIPTS) {
    if (pattern.test(value)) {
      if (!family) return { fontFamily: undefined, fontWeight: isBold(weight) ? '700' : '400' };
      return { fontFamily: `${family}_${isBold(weight) ? '700Bold' : '400Regular'}` };
    }
  }
  return { fontFamily: fonts[weight] ?? fonts.regular };
}

// Icon sizes for Feather icons
export const icon = { sm: 16, md: 20, lg: 24, xl: 32, hero: 56 };
