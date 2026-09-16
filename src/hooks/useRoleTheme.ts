import { paletteForRole } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/context/ThemeContext';

/** Blue for Vendor, orange for Trainer — same app, role-aware accent. Composes
 *  with the light/dark theme axis (see ThemeContext) rather than being
 *  replaced by it. */
export function useRoleTheme() {
  const accountType = useAuthStore((s) => s.user?.accountType);
  const { colors } = useTheme();
  return paletteForRole(accountType, colors);
}
