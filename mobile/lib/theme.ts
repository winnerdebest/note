import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorScheme {
  background: string;
  surface: string;
  surfaceContainer: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  border: string;
  borderSubtle: string;
  danger: string;
  dangerSoft: string;
  success: string;
  warning: string;
  pin: string;
  overlay: string;
  glassBackground: string;
  glassBorder: string;
  tagBackground: string;
  tagText: string;
  searchBackground: string;
}

/**
 * Monochrome Paper & Ink Design System
 * Light Mode: Paper-dominant (#FFFFFF / #FAFAFA) with crisp #171717 Ink
 */
const lightColors: ColorScheme = {
  background: '#FFFFFF',
  surface: '#FAFAFA',
  surfaceContainer: '#F5F5F5',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  text: '#171717',
  textSecondary: '#525252',
  textMuted: '#737373',
  accent: '#171717',
  accentText: '#FFFFFF',
  accentSoft: '#F5F5F5',
  border: '#E5E5E5',
  borderSubtle: '#F0F0F0',
  danger: '#171717',
  dangerSoft: '#F5F5F5',
  success: '#171717',
  warning: '#525252',
  pin: '#171717',
  overlay: 'rgba(10, 10, 10, 0.4)',
  glassBackground: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(23, 23, 23, 0.1)',
  tagBackground: '#F5F5F5',
  tagText: '#404040',
  searchBackground: '#FAFAFA',
};

/**
 * Dark Mode: Ink-dominant (#0A0A0A / #141414) with crisp #FAFAFA Paper text
 */
const darkColors: ColorScheme = {
  background: '#0A0A0A',
  surface: '#121212',
  surfaceContainer: '#1F1F1F',
  card: '#161616',
  cardElevated: '#1C1C1C',
  text: '#FAFAFA',
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  accent: '#FAFAFA',
  accentText: '#0A0A0A',
  accentSoft: '#1F1F1F',
  border: '#262626',
  borderSubtle: '#1A1A1A',
  danger: '#FAFAFA',
  dangerSoft: '#1F1F1F',
  success: '#FAFAFA',
  warning: '#A3A3A3',
  pin: '#FAFAFA',
  overlay: 'rgba(0, 0, 0, 0.72)',
  glassBackground: 'rgba(16, 16, 16, 0.9)',
  glassBorder: 'rgba(250, 250, 250, 0.12)',
  tagBackground: '#1F1F1F',
  tagText: '#D4D4D4',
  searchBackground: '#141414',
};

export interface ThemeContextValue {
  colors: ColorScheme;
  isDark: boolean;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const getColors = (isDark: boolean) => (isDark ? darkColors : lightColors);
export { lightColors, darkColors };
