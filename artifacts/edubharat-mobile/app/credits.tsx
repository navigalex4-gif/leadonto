import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { useColors } from '@/hooks/useColors';
import { apiRequest } from '@/lib/api';

const MIN_CREDITS = 10;

type OrderResponse = {
  orderId: string;
  paymentSessionId: string;
  credits: number;
};

export default function CreditsScreen() {
  const colors = useColors();
  const [balance, setBalance] = useState<number | null>(null);
  const [credits, setCredits] = useState('10');
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const data = await apiRequest<{ balance: number | null }>('/credits/balance');
    setBalance(data.balance);
  };

  useEffect(() => { void refresh().catch(() => setBalance(null)); }, []);

  const buy = async () => {
    const amount = Math.floor(Number(credits));
    if (!Number.isFinite(amount) || amount < MIN_CREDITS || amount > 100000) {
      Alert.alert('Choose a valid amount', `Enter between ${MIN_CREDITS} and 100,000 credits.`);
      return;
    }
    setLoading(true);
    try {
      const order = await apiRequest<OrderResponse>('/credits/cashfree/order', {
        method: 'POST',
        body: JSON.stringify({ credits: amount }),
      });
      // Cashfree returns to the same canonical page used by web checkout.
      const checkoutUrl = `https://leadonto.com/credits?cashfreeOrder=${encodeURIComponent(order.orderId)}&cashfreeSession=${encodeURIComponent(order.paymentSessionId)}`;
      await WebBrowser.openBrowserAsync(checkoutUrl);

      // The webhook is authoritative. Reconcile for a short period after the
      // hosted browser returns so the mobile balance updates without a reload.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const status = await apiRequest<{ status: string }>('/credits/cashfree/status/' + encodeURIComponent(order.orderId));
        if (status.status === 'paid') {
          await refresh();
          Alert.alert('Payment successful', `${order.credits} credits were added.`);
          return;
        }
        if (['failed', 'cancelled', 'expired'].includes(status.status)) {
          Alert.alert('Payment not completed', 'No credits were added. You can try again.');
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      Alert.alert('Payment submitted', 'We are still confirming the payment. Your balance will update after Cashfree confirms it.');
    } catch (error) {
      Alert.alert('Could not start payment', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Credits" subtitle="Use credits for live practice and interviews" showBack />
      <Card style={styles.card}>
        <Text style={[styles.balance, { color: colors.primary }]}>{balance ?? '—'}</Text>
        <Text style={[styles.caption, { color: colors.mutedForeground }]}>available credits</Text>
      </Card>
      <Card style={styles.card}>
        <Text style={[styles.title, { color: colors.foreground }]}>Buy credits securely</Text>
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Pay with UPI, cards, or net banking through Cashfree. Credits are added only after payment confirmation.
        </Text>
        <TextInput
          value={credits}
          onChangeText={setCredits}
          keyboardType="number-pad"
          placeholder={`Credits (minimum ${MIN_CREDITS})`}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
        />
        <ActionButton title="Continue to secure checkout" onPress={() => void buy()} loading={loading} disabled={Number(credits) < MIN_CREDITS} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, gap: 10 },
  balance: { fontFamily: 'Inter_700Bold', fontSize: 48, textAlign: 'center' },
  caption: { fontFamily: 'Inter_400Regular', textAlign: 'center' },
  title: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 13, fontSize: 15 },
});