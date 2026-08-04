import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Returns the bottom padding needed to avoid the tab bar overlapping content.
 *
 * iOS 26 with NativeTabs uses a system tab bar (liquid glass) that is not part
 * of the React Navigation bottom-tabs context, so useBottomTabBarHeight() is
 * only safe for the classic tab bar path. isLiquidGlassAvailable() is stable
 * for the app session, so this conditional hook call is safe.
 */
export function useSafeBottomPadding(): number {
  const insets = useSafeAreaInsets();
  if (isLiquidGlassAvailable()) {
    return insets.bottom + 24;
  }
  // Stack routes such as English Guru and Resume are outside the tab navigator.
  // React Navigation throws when the tab-bar context is absent, so keep a
  // small safe-area fallback for those screens while preserving the real tab
  // height inside the classic tab layout.
  let tabHeight = 0;
  try {
    tabHeight = useBottomTabBarHeight();
  } catch {
    tabHeight = 0;
  }
  return insets.bottom + tabHeight + 24;
}
