import { useColorScheme } from 'react-native';
import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ColorScheme {
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
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

const lightColors: ColorScheme = {
  background: '#F8F6F2',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardElevated: '#FEFEFE',
  text: '#1A1A2E',
  textSecondary: '#4A4A68',
  textMuted: '#9898B0',
  accent: '#6C63FF',
  accentSoft: '#EDE9FF',
  border: '#E8E6F0',
  borderSubtle: '#F0EEF8',
  danger: '#FF4757',
  dangerSoft: '#FFEBEE',
  success: '#2ECC71',
  warning: '#F39C12',
  pin: '#F4A261',
  overlay: 'rgba(26, 26, 46, 0.5)',
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(108, 99, 255, 0.15)',
  tagBackground: '#EDE9FF',
  tagText: '#6C63FF',
  searchBackground: '#F0EEF8',
};

const darkColors: ColorScheme = {
  background: '#0D0D1A',
  surface: '#16162A',
  card: '#1E1E35',
  cardElevated: '#252540',
  text: '#F0EEFF',
  textSecondary: '#A8A8C8',
  textMuted: '#5A5A7A',
  accent: '#8B7FFF',
  accentSoft: '#2A2850',
  border: '#2A2A45',
  borderSubtle: '#1E1E35',
  danger: '#FF6B7A',
  dangerSoft: '#3D1A1F',
  success: '#48D68A',
  warning: '#FFB347',
  pin: '#F4A261',
  overlay: 'rgba(0, 0, 0, 0.7)',
  glassBackground: 'rgba(22, 22, 42, 0.9)',
  glassBorder: 'rgba(139, 127, 255, 0.2)',
  tagBackground: '#2A2850',
  tagText: '#8B7FFF',
  searchBackground: '#1E1E35',
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

export const getColors = (isDark: boolean) => isDark ? darkColors : lightColors;
export { lightColors, darkColors };
