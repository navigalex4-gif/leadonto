import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

export default function CreditsScreen() {
  const colors = useColors();
  const [balance, setBalance] = useState<number | null>(null);
  const [credits, setCredits] = useState('49');
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => { apiRequest<{ balance: number | null }>('/credits/balance').then((data) => setBalance(data.balance)).catch(() => setBalance(null)); }, []);
  const submit = async () => { setLoading(true); try { await apiRequest('/credits/upi/submit', { method: 'POST', body: JSON.stringify({ credits: Number(credits), utr }) }); Alert.alert('Submitted', 'Your UPI top-up is pending admin verification.'); setUtr(''); } catch (error) { Alert.alert('Could not submit', error instanceof Error ? error.message : 'Please try again.'); } finally { setLoading(false); } };
  return <Screen><Header title="Credits" subtitle="Use credits for live practice and interviews" showBack /><Card style={styles.card}><Text style={[styles.balance, { color: colors.primary }]}>{balance ?? '—'}</Text><Text style={[styles.caption, { color: colors.mutedForeground }]}>available credits</Text></Card><Card style={styles.card}><Text style={[styles.title, { color: colors.foreground }]}>Top up with UPI</Text><Text style={[styles.note, { color: colors.mutedForeground }]}>Send the matching amount to the EduBharat UPI shown by your administrator, then submit the UTR. Credits are granted only after verification.</Text><TextInput value={credits} onChangeText={setCredits} keyboardType="number-pad" placeholder="Credits (minimum 49)" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><TextInput value={utr} onChangeText={setUtr} autoCapitalize="characters" placeholder="UPI UTR / transaction reference" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]} /><ActionButton title="Submit payment reference" onPress={() => void submit()} loading={loading} disabled={!utr.trim() || Number(credits) < 49} /></Card></Screen>;
}
const styles = StyleSheet.create({ card: { marginHorizontal: 20, marginTop: 12, gap: 10 }, balance: { fontFamily: 'Inter_700Bold', fontSize: 48, textAlign: 'center' }, caption: { fontFamily: 'Inter_400Regular', textAlign: 'center' }, title: { fontFamily: 'Inter_700Bold', fontSize: 18 }, note: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 }, input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 13, fontSize: 15 } });