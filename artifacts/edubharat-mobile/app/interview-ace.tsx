import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { apiRequest, askAI, saveHistory } from '@/lib/api';
import { canUseBrowserSpeech, startBrowserSpeech, speakText, stopSpeaking } from '@/lib/speech';
import { getProfile, incrementProgress, type Profile } from '@/lib/storage';

const TYPES = ['General HR', 'BFSI', 'Technical', 'Sales & Customer Support'];
const COACHES = ['Priya Ma’am', 'Arjun Sir', 'Meera Ma’am', 'Rohan Sir'];

type Question = { question: string; answer: string; feedback?: string };

export default function InterviewAceScreen() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [type, setType] = useState(TYPES[0]);
  const [coach, setCoach] = useState(COACHES[0]);
  const [role, setRole] = useState('');
  const [phase, setPhase] = useState<'setup' | 'interview' | 'report'>('setup');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [transcript, setTranscript] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [report, setReport] = useState('');
  const speechRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { getProfile().then((p) => { setProfile(p); setRole(p.careerGoal); }); return () => { speechRef.current?.stop(); stopSpeaking(); }; }, []);
  useEffect(() => {
    if (phase !== 'interview') return;
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  const nextQuestion = async (first = false) => {
    setLoading(true);
    try {
      const context = transcript.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join('\n');
      const result = await askAI(
        first
          ? `Start a ${type} mock interview for the role "${role || profile?.careerGoal || 'entry-level professional'}". Ask the first question only.`
          : `Continue this ${type} mock interview for "${role}". Previous transcript:\n${context}\nAsk the next realistic question only. Do not give feedback yet.`,
        `You are ${coach}, a warm but realistic Indian interviewer. Keep questions concise and conversational.`,
        180,
      );
      setQuestion(result.replace(/^["']|["']$/g, ''));
      speakText(result, 1.03);
    } catch (error) { Alert.alert('Interview could not start', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };

  const start = async () => {
    setPhase('interview'); setSeconds(0); setTranscript([]); setAnswer('');
    await nextQuestion(true);
  };

  const submitAnswer = async (value = answer) => {
    if (!value.trim() || loading) return;
    const updated = [...transcript, { question, answer: value.trim() }];
    setTranscript(updated); setAnswer('');
    await nextQuestion();
  };

  const listen = () => {
    if (!canUseBrowserSpeech()) { Alert.alert('Voice input', 'Voice input is available in Expo Web browsers. You can always type your answer on native builds.'); return; }
    speechRef.current?.stop();
    speechRef.current = startBrowserSpeech((text) => { setAnswer(text); void submitAnswer(text); }, (message) => Alert.alert('Microphone', message));
  };

  const finish = async () => {
    speechRef.current?.stop(); stopSpeaking(); setLoading(true);
    try {
      const generated = await askAI(
        `Evaluate this mock interview for a ${role} role. Transcript:\n${transcript.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join('\n')}\nGive a concise report with strengths, improvements, and a score out of 100.`,
        'You are a supportive interview coach. Use plain text headings.',
        650,
      );
      setReport(generated); setPhase('report');
      try {
        await apiRequest('/sessions/interview', {
          method: 'POST',
          body: JSON.stringify({
            interviewType: type,
            role: role || profile?.careerGoal || 'Professional',
            experienceLevel: 'Fresher',
            durationSeconds: seconds,
            questionsData: JSON.stringify(transcript),
            feedbackJson: JSON.stringify({ summary: generated, coach }),
          }),
        });
      } catch {
        Alert.alert('Report saved locally', 'We could not sync this report right now. You can try again later.');
      }
      await incrementProgress('interviewCount');
    } catch (error) { Alert.alert('Could not create report', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };

  if (phase === 'report') {
    return <Screen><Header title="Interview report" subtitle={`${type} · ${Math.floor(seconds / 60)} min`} showBack /><ResultCard title="Your coach's feedback" content={report} onSave={() => void saveHistory('interview-ace', `Interview report: ${role}`, report).then(() => Alert.alert('Saved', 'Report added to history.'))} /><View style={styles.footer}><ActionButton title="Practice again" onPress={() => setPhase('setup')} /><ActionButton title="Back to tools" variant="outline" onPress={() => router.back()} /></View></Screen>;
  }
  if (phase === 'setup') {
    return <Screen><Header title="Interview Ace" subtitle="Practice, answer naturally, get a clear report" showBack /><View style={styles.form}><Text style={[styles.label, { color: colors.mutedForeground }]}>Target role</Text><TextInput value={role} onChangeText={setRole} placeholder="e.g. Customer Success Executive" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /><Text style={[styles.label, { color: colors.mutedForeground }]}>Interview type</Text><View style={styles.wrap}>{TYPES.map((item) => <TouchableOpacity key={item} onPress={() => setType(item)} style={[styles.chip, { backgroundColor: type === item ? colors.primary : colors.muted }]}><Text style={{ color: type === item ? colors.primaryForeground : colors.foreground }}>{item}</Text></TouchableOpacity>)}</View><Text style={[styles.label, { color: colors.mutedForeground }]}>Choose coach</Text><View style={styles.wrap}>{COACHES.map((item) => <TouchableOpacity key={item} onPress={() => setCoach(item)} style={[styles.chip, { backgroundColor: coach === item ? colors.secondary : colors.muted }]}><Text style={{ color: coach === item ? colors.secondaryForeground : colors.foreground }}>{item}</Text></TouchableOpacity>)}</View><ActionButton title="Start mock interview" onPress={() => void start()} loading={loading} /></View></Screen>;
  }
  return <Screen><Header title="Mock interview" subtitle={`${type} · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`} showBack /><Card style={{ marginHorizontal: 20 }}><Text style={[styles.question, { color: colors.foreground }]}>{question || 'Preparing your first question…'}</Text></Card><View style={styles.form}><TextInput value={answer} onChangeText={setAnswer} placeholder="Type your answer, or use the microphone" placeholderTextColor={colors.mutedForeground} multiline style={[styles.answer, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} /><View style={styles.row}><ActionButton title="Microphone" variant="outline" onPress={listen} /><ActionButton title="Submit answer" onPress={() => void submitAnswer()} loading={loading} disabled={!answer.trim()} /></View><ActionButton title="End & see report" variant="secondary" onPress={() => void finish()} disabled={transcript.length === 0} /></View>{transcript.length > 0 && <Text style={[styles.progress, { color: colors.mutedForeground }]}>{transcript.length} answer{transcript.length === 1 ? '' : 's'} completed</Text>}</Screen>;
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 20, gap: 12, marginTop: 12 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 4 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 15 },
  answer: { minHeight: 150, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, fontSize: 15, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 9, borderRadius: 20 },
  row: { flexDirection: 'row', gap: 10 },
  question: { fontFamily: 'Inter_600SemiBold', fontSize: 19, lineHeight: 28 },
  progress: { textAlign: 'center', marginTop: 16, fontFamily: 'Inter_400Regular', fontSize: 13 },
  footer: { padding: 20, gap: 10 },
});