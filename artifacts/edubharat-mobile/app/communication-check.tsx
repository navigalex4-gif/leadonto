import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { apiRequest, getSession, saveHistory } from '@/lib/api';
import { getProfile } from '@/lib/storage';

type Feedback = {
  overallScore: number;
  communicationScore: number;
  confidenceScore: number;
  clarityScore: number;
  headline: string;
  strengths: string[];
  oneNextStep: string;
  summary: string;
  personalizedPlan: string[];
};

const PROMPTS = [
  'Tell me about yourself and what kind of opportunity you are looking for.',
  'Describe one problem you solved recently and what you learned from it.',
];

function formatFeedback(feedback: Feedback): string {
  return [
    `Overall score: ${feedback.overallScore}/100`,
    `Communication: ${feedback.communicationScore}/100 · Confidence: ${feedback.confidenceScore}/100 · Clarity: ${feedback.clarityScore}/100`,
    `\n${feedback.headline}`,
    feedback.summary ? `\n${feedback.summary}` : '',
    feedback.strengths?.length ? `\nStrengths:\n${feedback.strengths.map((item) => `• ${item}`).join('\n')}` : '',
    feedback.oneNextStep ? `\nNext step:\n${feedback.oneNextStep}` : '',
    feedback.personalizedPlan?.length ? `\nPractice plan:\n${feedback.personalizedPlan.map((item) => `• ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export default function CommunicationCheckScreen() {
  const colors = useColors();
  const [answers, setAnswers] = useState(['', '']);
  const [candidate, setCandidate] = useState({ name: '', email: '', targetRole: '' });
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const complete = useMemo(() => answers.some((answer) => answer.trim().length > 0), [answers]);

  const submit = async () => {
    if (!complete) return;
    setLoading(true);
    try {
      const profile = await getProfile();
      const session = await getSession().catch(() => null);
      const result = await apiRequest<{ feedback: Feedback }>('/communication-checks', {
        method: 'POST',
        body: JSON.stringify({
          name: candidate.name.trim() || session?.name || profile.name,
          ...(candidate.email.trim() || session?.email ? { email: candidate.email.trim() || session?.email } : {}),
          targetRole: candidate.targetRole.trim() || profile.careerGoal,
          experienceLevel: 'Fresher',
          location: profile.location,
          anonymousId: `mobile-${Date.now()}`,
          answers: answers.map((answer, index) => ({ question: PROMPTS[index], answer: answer.trim() })),
          durationSeconds: 90,
        }),
      });
      setFeedback(result.feedback);
    } catch (error) {
      Alert.alert('Could not score your check', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (feedback) {
    const content = formatFeedback(feedback);
    return <Screen><Header title="Your communication check" subtitle="A short, indicative coaching report" showBack /><Card style={styles.scoreCard}><Text style={[styles.score, { color: colors.primary }]}>{feedback.overallScore}</Text><Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>out of 100</Text></Card><ResultCard title="Your feedback" content={content} onSave={() => void saveHistory('communication-check', 'Communication Check', content).then(() => Alert.alert('Saved', 'Your result was added to history.'))} /><View style={styles.action}><ActionButton title="Try again" variant="outline" onPress={() => { setFeedback(null); setAnswers(['', '']); }} /></View></Screen>;
  }

  return <Screen><Header title="Free Communication Check" subtitle="Answer two prompts and get practical feedback in about 90 seconds" showBack /><Card style={styles.intro}><Text style={[styles.introText, { color: colors.mutedForeground }]}>Type your answers on native mobile. Voice input remains available when your device or mobile browser exposes speech recognition.</Text></Card><View style={styles.form}>{PROMPTS.map((prompt, index) => <View key={prompt} style={styles.field}><Text style={[styles.prompt, { color: colors.foreground }]}>{index + 1}. {prompt}</Text><TextInput value={answers[index]} onChangeText={(text) => setAnswers((current) => current.map((item, itemIndex) => itemIndex === index ? text : item))} multiline placeholder="Write how you would say it aloud…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /></View>)}<TextInput value={candidate.name} onChangeText={(name) => setCandidate((current) => ({ ...current, name }))} placeholder="Name (optional — needed to receive a saved lead report)" placeholderTextColor={colors.mutedForeground} style={[styles.singleInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /><TextInput value={candidate.email} onChangeText={(email) => setCandidate((current) => ({ ...current, email }))} autoCapitalize="none" keyboardType="email-address" placeholder="Email (optional)" placeholderTextColor={colors.mutedForeground} style={[styles.singleInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /><ActionButton title="Get my feedback" onPress={() => void submit()} loading={loading} disabled={!complete} /></View></Screen>;
}

const styles = StyleSheet.create({
  intro: { marginHorizontal: 20, marginTop: 4 },
  introText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  form: { paddingHorizontal: 20, gap: 14, marginTop: 16 },
  field: { gap: 8 },
  prompt: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 22 },
  input: { minHeight: 130, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 15, textAlignVertical: 'top' },
  singleInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 14 },
  scoreCard: { marginHorizontal: 20, alignItems: 'center', paddingVertical: 22 },
  score: { fontFamily: 'Inter_700Bold', fontSize: 50 },
  scoreLabel: { fontFamily: 'Inter_400Regular' },
  action: { paddingHorizontal: 20, marginTop: 10 },
});