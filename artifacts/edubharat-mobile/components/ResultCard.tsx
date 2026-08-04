import React from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Card } from '@/components/Screen';

export function ResultCard({
  title,
  content,
  onSave,
}: {
  title: string;
  content: string;
  onSave?: () => void;
}) {
  const colors = useColors();
  const share = () => Share.share({ message: content, title });
  return (
    <Card style={{ marginHorizontal: 20, marginTop: 18, backgroundColor: colors.accent }}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        <View style={styles.actions}>
          <TouchableOpacity onPress={share} accessibilityRole="button" accessibilityLabel="Share result">
            <Feather name="share-2" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
          {onSave && (
            <TouchableOpacity onPress={onSave} accessibilityRole="button" accessibilityLabel="Save result">
              <Feather name="bookmark" size={18} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={[styles.body, { color: colors.accentForeground }]}>{content}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  actions: { flexDirection: 'row', gap: 18 },
  title: { flex: 1, fontFamily: 'Inter_700Bold', fontSize: 16 },
  body: { marginTop: 12, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22 },
});