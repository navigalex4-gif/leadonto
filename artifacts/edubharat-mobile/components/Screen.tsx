import React from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';

export function Screen({ children, ...props }: ScrollViewProps) {
  const colors = useColors();
  const bottomPadding = useSafeBottomPadding();
  return (
    <ScrollView
      {...props}
      style={[styles.container, { backgroundColor: colors.background }, props.style]}
      contentContainerStyle={[{ paddingBottom: bottomPadding + 20 }, props.contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, padding: 16 },
});