// Design System Constants
export const LIGHT_COLORS = {
  // Primary Colors (Keep yellow/orange tones)
  primary: '#F59E0B', // Orange/Gold from the design
  primaryLight: '#FEF3C7',
  primaryDark: '#D97706',
  primaryDarker: '#B45309',
  
  // Background Colors
  background: '#F8FAFC',
  cardBackground: '#ffffff',
  
  // Text Colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  
  // Gray Scale
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',
  
  // Status Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  successDarker: '#047857',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorDark: '#DC2626',
  errorDarker: '#B91C1C',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  warningDarker: '#B45309',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',
  infoDarker: '#1E40AF',
  
  // Chart Colors
  chartPrimary: '#F59E0B',
  chartSecondary: '#FEF3C7',
  
  // Border Colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
}

export const DARK_COLORS = {
  // Primary Colors (Keep yellow/orange tones)
  primary: '#F59E0B', // Same orange/gold
  primaryLight: '#92400E', // Darker version for dark mode
  primaryDark: '#FBBF24', // Lighter version for dark mode
  primaryDarker: '#FDE047', // Even lighter for dark mode
  
  // Background Colors (Based on #2d3137ff)
  background: '#2d3137',
  cardBackground: '#3a404a',
  
  // Text Colors (Light colors for dark background)
  textPrimary: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textLight: '#9CA3AF',
  
  // Gray Scale (Inverted and adapted for dark mode)
  gray50: '#1a1d21',
  gray100: '#252a30',
  gray200: '#3a404a',
  gray300: '#4f5663',
  gray400: '#6b737f',
  gray500: '#9ca3af',
  gray600: '#d1d5db',
  gray700: '#e5e7eb',
  gray800: '#f3f4f6',
  gray900: '#f9fafb',
  
  // Status Colors (Slightly adjusted for dark mode)
  success: '#10B981',
  successLight: '#064E3B',
  successDark: '#34D399',
  successDarker: '#6EE7B7',
  error: '#EF4444',
  errorLight: '#7F1D1D',
  errorDark: '#F87171',
  errorDarker: '#FCA5A5',
  warning: '#F59E0B',
  warningLight: '#92400E',
  warningDark: '#FBBF24',
  warningDarker: '#FDE047',
  info: '#3B82F6',
  infoLight: '#1E3A8A',
  infoDark: '#60A5FA',
  infoDarker: '#93C5FD',
  
  // Chart Colors
  chartPrimary: '#F59E0B',
  chartSecondary: '#92400E',
  
  // Border Colors
  border: '#4f5663',
  borderLight: '#3a404a',
}

// Default to light colors for backward compatibility
export const COLORS = LIGHT_COLORS

export const TYPOGRAPHY = {
  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  
  // Font Weights - React Native compatible types
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
}

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
}

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
}

export const FLAG_EMOJIS = {
  'en': '🇺🇸',
  'es': '🇪🇸', 
  'fr': '🇫🇷',
  'de': '🇩🇪',
  'it': '🇮🇹',
  'pt': '🇵🇹',
  'ru': '🇷🇺',
  'ja': '🇯🇵',
  'ko': '🇰🇷',
  'zh': '🇨🇳',
  'ar': '🇸🇦',
  'hi': '🇮🇳',
  'tr': '🇹🇷',
  'pl': '🇵🇱',
  'nl': '🇳🇱',
}