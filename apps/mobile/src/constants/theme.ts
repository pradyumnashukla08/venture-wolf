export const theme = {
  colors: {
    // Brand Accents
    primary: '#38BDF8', // Sky Blue
    secondary: '#FACC15', // Gold
    
    // Light Mode (Founder App)
    lightBackground: '#FFFFFF', // Pure white for backgrounds
    lightSurface: '#F8FAFC', // Very light slate for cards
    lightText: '#0F172A', // Dark Slate for text
    lightTextMuted: '#64748B',
    lightBorder: '#E2E8F0', // Clean grey border
    
    // Dark Mode (Investor App & Onboarding)
    darkBackground: '#081225', // Deep Navy
    darkSurface: '#1E293B',    // Slate
    darkText: '#FFFFFF',
    darkTextMuted: '#94A3B8',
    darkBorder: 'rgba(255,255,255,0.08)',
  },
  typography: {
    fontFamily: 'System', // Fallback to system font if Inter is not loaded yet
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    inner: 8,
    card: 16,
  },
  shadows: {
    premiumLight: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 2,
    },
  },
  borders: {
    premiumDark: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.05)',
    },
  },
};
