import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';
import { getProfile, type Profile } from '@/lib/storage';

type FeedItem = { title?: string; headline?: string; summary?: string; description?: string; link?: string; source?: string; category?: string };
export default function RozgarSamacharScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<'jobs' | 'feed' | 'saved'>('feed');
  const [items, setItems] = useState<FeedItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { getProfile().then(setProfile); apiRequest<{ items?: FeedItem[]; results?: FeedItem[] }>(`/rozgar/live?section=career&location=${encodeURIComponent('')}`).then((data) => setItems(data.items || data.results || [])).catch(() => setItems([])).finally(() => setLoading(false)); }, []);
  return <Screen><Header title="Rozgar Samachar" subtitle={profile?.location ? `Opportunities for ${profile.location}` : 'Jobs, career news and opportunities'} showBack /><View style={styles.tabs}>{(['jobs', 'feed', 'saved'] as const).map((item) => <TouchableOpacity key={item} onPress={() => setTab(item)} style={[styles.tab, { borderBottomColor: tab === item ? colors.tools.rozgar : 'transparent' }]}><Text style={{ color: tab === item ? colors.tools.rozgar : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>{item === 'feed' ? 'Career Feed' : item === 'jobs' ? 'Jobs' : 'Saved Jobs'}</Text></TouchableOpacity>)}</View>{tab === 'jobs' ? <Card style={styles.card}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Live job search</Text><Text style={{ color: colors.mutedForeground, lineHeight: 21 }}>Use the Jobs tab below to search by role, city and experience, save vacancies, and apply through the source site.</Text></Card> : tab === 'saved' ? <Card style={styles.card}><Text style={[styles.cardTitle, { color: colors.foreground }]}>Saved jobs</Text><Text style={{ color: colors.mutedForeground }}>Your saved vacancies are available in the Jobs tab.</Text></Card> : loading ? <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} /> : items.length === 0 ? <EmptyState icon="rss" title="Feed unavailable" subtitle="Try again when live career sources are reachable." /> : <View style={styles.list}>{items.map((item, index) => <TouchableOpacity key={`${item.title || item.headline}-${index}`} onPress={() => item.link && Linking.openURL(item.link)}><Card><Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title || item.headline || 'Career update'}</Text><Text style={[styles.summary, { color: colors.mutedForeground }]}>{item.summary || item.description || 'Read the latest career update.'}</Text><Text style={[styles.source, { color: colors.tools.rozgar }]}>{item.source || 'Live source'} · Read more</Text></Card></TouchableOpacity>)}</View>}</Screen>;
}
const styles = StyleSheet.create({ tabs: { flexDirection: 'row', marginHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ddd', marginBottom: 12 }, tab: { paddingVertical: 12, marginRight: 24, borderBottomWidth: 2 }, list: { paddingHorizontal: 20, gap: 10 }, card: { marginHorizontal: 20, marginTop: 8 }, cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, lineHeight: 22 }, summary: { fontFamily: 'Inter_400Regular', lineHeight: 21, marginTop: 8 }, source: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 12 } });