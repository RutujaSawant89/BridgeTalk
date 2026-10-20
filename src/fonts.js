import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { NotoSans_400Regular } from '@expo-google-fonts/noto-sans/400Regular';
import { NotoSans_700Bold } from '@expo-google-fonts/noto-sans/700Bold';
import { NotoSansDevanagari_400Regular } from '@expo-google-fonts/noto-sans-devanagari/400Regular';
import { NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari/700Bold';
import { NotoSansBengali_400Regular } from '@expo-google-fonts/noto-sans-bengali/400Regular';
import { NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali/700Bold';
import { NotoSansGujarati_400Regular } from '@expo-google-fonts/noto-sans-gujarati/400Regular';
import { NotoSansGujarati_700Bold } from '@expo-google-fonts/noto-sans-gujarati/700Bold';
import { NotoSansGurmukhi_400Regular } from '@expo-google-fonts/noto-sans-gurmukhi/400Regular';
import { NotoSansGurmukhi_700Bold } from '@expo-google-fonts/noto-sans-gurmukhi/700Bold';
import { NotoSansTamil_400Regular } from '@expo-google-fonts/noto-sans-tamil/400Regular';
import { NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil/700Bold';
import { NotoSansTelugu_400Regular } from '@expo-google-fonts/noto-sans-telugu/400Regular';
import { NotoSansTelugu_700Bold } from '@expo-google-fonts/noto-sans-telugu/700Bold';
import { NotoSansKannada_400Regular } from '@expo-google-fonts/noto-sans-kannada/400Regular';
import { NotoSansKannada_700Bold } from '@expo-google-fonts/noto-sans-kannada/700Bold';
import { NotoSansMalayalam_400Regular } from '@expo-google-fonts/noto-sans-malayalam/400Regular';
import { NotoSansMalayalam_700Bold } from '@expo-google-fonts/noto-sans-malayalam/700Bold';
import { NotoSansOriya_400Regular } from '@expo-google-fonts/noto-sans-oriya/400Regular';
import { NotoSansOriya_700Bold } from '@expo-google-fonts/noto-sans-oriya/700Bold';
import { NotoSansArabic_400Regular } from '@expo-google-fonts/noto-sans-arabic/400Regular';
import { NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic/700Bold';
import { NotoSansHebrew_400Regular } from '@expo-google-fonts/noto-sans-hebrew/400Regular';
import { NotoSansHebrew_700Bold } from '@expo-google-fonts/noto-sans-hebrew/700Bold';
import { NotoSansThai_400Regular } from '@expo-google-fonts/noto-sans-thai/400Regular';
import { NotoSansThai_700Bold } from '@expo-google-fonts/noto-sans-thai/700Bold';
import { devWarn } from './log';

// Every family referenced by fonts / scriptFont in theme.js, plus the Feather icon font.
// Each weight is imported from its own subpath: the package index would bundle every weight
// and italic of every family (~180 font files).
export function useAppFonts() {
  const [loaded, error] = useFonts({
    ...Feather.font,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    NotoSans_400Regular,
    NotoSans_700Bold,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_700Bold,
    NotoSansBengali_400Regular,
    NotoSansBengali_700Bold,
    NotoSansGujarati_400Regular,
    NotoSansGujarati_700Bold,
    NotoSansGurmukhi_400Regular,
    NotoSansGurmukhi_700Bold,
    NotoSansTamil_400Regular,
    NotoSansTamil_700Bold,
    NotoSansTelugu_400Regular,
    NotoSansTelugu_700Bold,
    NotoSansKannada_400Regular,
    NotoSansKannada_700Bold,
    NotoSansMalayalam_400Regular,
    NotoSansMalayalam_700Bold,
    NotoSansOriya_400Regular,
    NotoSansOriya_700Bold,
    NotoSansArabic_400Regular,
    NotoSansArabic_700Bold,
    NotoSansHebrew_400Regular,
    NotoSansHebrew_700Bold,
    NotoSansThai_400Regular,
    NotoSansThai_700Bold,
  });
  // If a font fails to load, carry on with system fonts rather than blocking the app.
  if (error) devWarn('[BridgeTalk] font loading failed, using system fonts', error);
  return loaded || Boolean(error);
}
