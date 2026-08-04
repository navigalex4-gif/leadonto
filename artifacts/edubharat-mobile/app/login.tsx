import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { useColors } from '@/hooks/useColors';
import { apiRequest, openApiUrl } from '@/lib/api';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => { apiRequest<{ googleConfigured?: boolean }>('/auth/config').then((data) => setGoogleReady(Boolean(data.googleConfigured))).catch(() => undefined); }, []);

  const sendCode = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ dev?: string }>('/auth/otp/send', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      setDevCode(data.dev || '');
      setSent(true);
    } catch (error) { Alert.alert('Could not send code', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };
  const verify = async () => {
    setLoading(true);
    try {
      await apiRequest('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email: email.trim(), code: code.trim() }) });
      router.replace('/(tabs)' as never);
    } catch (error) { Alert.alert('Invalid code', error instanceof Error ? error.message : 'Please request a new code.'); }
    finally { setLoading(false); }
  };
  const google = () => Linking.openURL(`${openApiUrl('/auth/google')}?guestId=mobile`);

  return <Screen><Header title="Welcome to EduBharat" subtitle="Sign in to sync progress, history, credits and reports" showBack /><Card style={styles.card}><Text style={[styles.label, { color: colors.mutedForeground }]}>Email address</Text><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />{sent ? <><Text style={[styles.label, { color: colors.mutedForeground }]}>6-digit code</Text><TextInput value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="Enter the code from your email" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]} />{devCode ? <Text style={[styles.devCode, { color: colors.primary }]}>Development code: {devCode}</Text> : null}<ActionButton title="Verify and sign in" onPress={() => void verify()} loading={loading} disabled={code.length < 6} /><ActionButton title="Send a new code" variant="outline" onPress={() => void sendCode()} /></> : <ActionButton title="Send email code" onPress={() => void sendCode()} loading={loading} disabled={!email.includes('@')} />}{googleReady ? <View style={styles.google}><ActionButton title="Continue with Google" variant="secondary" onPress={google} /></View> : null}<Text style={[styles.note, { color: colors.mutedForeground }]}>You can keep using learning tools as a guest. Sign in when you want your data synced across devices.</Text></Card></Screen>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, gap: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 15 },
  devCode: { fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  google: { marginTop: 4 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
});