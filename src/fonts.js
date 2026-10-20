import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { NotoSans_400Regular, NotoSans_700Bold } from '@expo-google-fonts/noto-sans';
import { NotoSansDevanagari_400Regular, NotoSansDevanagari_700Bold } from '@expo-google-fonts/noto-sans-devanagari';
import { NotoSansBengali_400Regular, NotoSansBengali_700Bold } from '@expo-google-fonts/noto-sans-bengali';
import { NotoSansGujarati_400Regular, NotoSansGujarati_700Bold } from '@expo-google-fonts/noto-sans-gujarati';
import { NotoSansGurmukhi_400Regular, NotoSansGurmukhi_700Bold } from '@expo-google-fonts/noto-sans-gurmukhi';
import { NotoSansTamil_400Regular, NotoSansTamil_700Bold } from '@expo-google-fonts/noto-sans-tamil';
import { NotoSansTelugu_400Regular, NotoSansTelugu_700Bold } from '@expo-google-fonts/noto-sans-telugu';
import { NotoSansKannada_400Regular, NotoSansKannada_700Bold } from '@expo-google-fonts/noto-sans-kannada';
import { NotoSansMalayalam_400Regular, NotoSansMalayalam_700Bold } from '@expo-google-fonts/noto-sans-malayalam';
import { NotoSansOriya_400Regular, NotoSansOriya_700Bold } from '@expo-google-fonts/noto-sans-oriya';
import { NotoSansArabic_400Regular, NotoSansArabic_700Bold } from '@expo-google-fonts/noto-sans-arabic';
import { NotoSansHebrew_400Regular, NotoSansHebrew_700Bold } from '@expo-google-fonts/noto-sans-hebrew';
import { NotoSansThai_400Regular, NotoSansThai_700Bold } from '@expo-google-fonts/noto-sans-thai';

// Every family referenced by fonts / scriptFont in theme.js, plus the Feather icon font.
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
  if (error) console.warn('[BridgeTalk] font loading failed, using system fonts', error);
  return loaded || Boolean(error);
}
