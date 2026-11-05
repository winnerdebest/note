import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../lib/theme';

export default function IndexScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
