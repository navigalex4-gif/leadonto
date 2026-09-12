import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

type Item = { id: number; tool: string; title: string; content: string; savedAt: string };
export default function HistoryScreen() {
  const colors = useColors();
  const [items, setItems] = useState<Item[] | null>(null);
  useFocusEffect(useCallback(() => { let mounted = true; apiRequest<{ items: Item[] }>('/history/items?limit=100').then((data) => { if (mounted) setItems(data.items); }).catch(() => { if (mounted) setItems([]); }); return () => { mounted = false; }; }, []));
  const remove = async (id: number) => { try { await apiRequest(`/history/items/${id}`, { method: 'DELETE' }); setItems((current) => current?.filter((item) => item.id !== id) || []); } catch (error) { Alert.alert('Could not delete', error instanceof Error ? error.message : 'Please try again.'); } };
  return <Screen><Header title="History" subtitle="Your saved practice, tools and reports" showBack />{items === null ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : items.length === 0 ? <EmptyState icon="clock" title="No saved items yet" subtitle="Save a result from English Guru, Tools Pro, Interview Ace or Learning Journey." /> : <View style={styles.list}>{items.map((item) => <View key={item.id}><ResultCard title={item.title} content={item.content} /><Text onPress={() => void remove(item.id)} style={[styles.delete, { color: colors.destructive }]}>Delete</Text></View>)}</View>}</Screen>;
}
const styles = StyleSheet.create({ list: { gap: 8 }, delete: { textAlign: 'right', marginHorizontal: 24, marginTop: 4, fontFamily: 'Inter_500Medium', fontSize: 12 } });