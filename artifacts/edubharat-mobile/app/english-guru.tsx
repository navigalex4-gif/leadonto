import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Header } from '@/components/Header';
import { Screen, Card } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { apiRequest, askAI, saveHistory } from '@/lib/api';
import { canUseBrowserSpeech, speakText, startBrowserSpeech, stopSpeaking } from '@/lib/speech';
import { getProfile, type Profile } from '@/lib/storage';

const TUTORS = [
  { id: 'priya', name: 'Priya Ma’am', style: 'warm, encouraging and conversational' },
  { id: 'arjun', name: 'Arjun Sir', style: 'clear, practical and confidence-building' },
  { id: 'meera', name: 'Meera Ma’am', style: 'patient and focused on everyday English' },
  { id: 'rohan', name: 'Rohan Sir', style: 'energetic and interview-oriented' },
  { id: 'ananya', name: 'Ananya Ma’am', style: 'friendly and expressive' },
  { id: 'vikram', name: 'Vikram Sir', style: 'direct and professional' },
];

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'];

export default function EnglishGuruScreen() {
  const colors = useColors();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tutor, setTutor] = useState(TUTORS[0]);
  const [language, setLanguage] = useState('English');
  const [level, setLevel] = useState('Intermediate');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const speechRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => { getProfile().then(setProfile); return () => { speechRef.current?.stop(); stopSpeaking(); }; }, []);

  const send = async (text = input) => {
    const phrase = text.trim();
    if (!phrase || loading || paused) return;
    setInput('');
    setActive(true);
    setLoading(true);
    setMessages((current) => [...current, { role: 'user', text: phrase }]);
    try {
      const reply = await askAI(
        `Student said: "${phrase}". Reply as ${tutor.name}, a warm English coach. Keep the conversation natural, short, and useful for an Indian ${level} learner. Preserve natural expressions like “oh”, “yeah”, and “right”. Give one gentle correction only when helpful. Reply in English, with a small ${language} hint only if needed.`,
        `You are ${tutor.name}. Your style is ${tutor.style}. Student name: ${profile?.name || 'learner'}.`,
        280,
      );
      setMessages((current) => [...current, { role: 'assistant', text: reply }]);
      speakText(reply, 1.08);
    } catch (error) {
      Alert.alert('Could not reply', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const listen = () => {
    setVoiceError('');
    if (!canUseBrowserSpeech()) {
      setVoiceError('Voice input is available in Expo Web browsers. On native, use the text box or install a device speech module in your build profile.');
      return;
    }
    speechRef.current?.stop();
    speechRef.current = startBrowserSpeech((text) => { setInput(text); void send(text); }, setVoiceError, language === 'English' ? 'en-IN' : 'en-IN');
  };

  const saveChat = async () => {
    if (messages.length === 0) return;
    try {
      await saveHistory(
        'english-guru',
        `${tutor.name} chat`,
        messages.map((item) => `${item.role === 'user' ? 'You' : tutor.name}: ${item.text}`).join('\n\n'),
      );
      Alert.alert('Chat saved', 'The complete conversation was added to your history.');
    } catch (error) {
      Alert.alert('Could not save chat', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const clearChat = () => {
    Alert.alert('Clear chat?', 'This removes the current conversation from the screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          speechRef.current?.stop();
          speechRef.current = null;
          stopSpeaking();
          setInput('');
          setMessages([]);
          setActive(false);
          setPaused(false);
        },
      },
    ]);
  };

  const end = () => {
    speechRef.current?.stop();
    speechRef.current = null;
    stopSpeaking();
    setActive(false);
    setPaused(false);
    setMessages([]);
  };

  return (
    <Screen>
      <Header title="English Guru" subtitle="A live practice room with your AI tutor" showBack />
      <Card style={{ marginHorizontal: 20 }}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Choose your tutor</Text>
        <View style={styles.wrap}>
          {TUTORS.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => setTutor(item)} style={[styles.chip, { backgroundColor: tutor.id === item.id ? colors.primary : colors.muted }]}>
              <Text style={{ color: tutor.id === item.id ? colors.primaryForeground : colors.foreground }}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 14 }]}>Language · level</Text>
        <View style={styles.wrap}>
          {LANGUAGES.map((item) => <TouchableOpacity key={item} onPress={() => setLanguage(item)} style={[styles.chip, { backgroundColor: language === item ? colors.secondary : colors.muted }]}><Text style={{ color: language === item ? colors.secondaryForeground : colors.foreground }}>{item}</Text></TouchableOpacity>)}
        </View>
        <View style={styles.wrap}>
          {['Beginner', 'Intermediate', 'Advanced'].map((item) => <TouchableOpacity key={item} onPress={() => setLevel(item)} style={[styles.chip, { backgroundColor: level === item ? colors.secondary : colors.muted }]}><Text style={{ color: level === item ? colors.secondaryForeground : colors.foreground }}>{item}</Text></TouchableOpacity>)}
        </View>
      </Card>

      {messages.length > 0 && <View style={styles.chat}>{messages.map((message, index) => <View key={`${message.role}-${index}`} style={[styles.bubble, { alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: message.role === 'user' ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: message.role === 'user' ? colors.primaryForeground : colors.foreground, lineHeight: 21 }}>{message.text}</Text></View>)}</View>}

      <View style={styles.composer}>
        <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => void send()} placeholder="Say or type something in English…" placeholderTextColor={colors.mutedForeground} multiline style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <View style={styles.actions}>
          <TouchableOpacity onPress={listen} style={[styles.iconButton, { backgroundColor: colors.secondary }]} accessibilityLabel="Start microphone"><Feather name="mic" size={19} color={colors.secondaryForeground} /></TouchableOpacity>
          <ActionButton title={loading ? 'Thinking…' : 'Send'} onPress={() => void send()} loading={loading} disabled={!input.trim() || paused} />
        </View>
        {voiceError ? <Text style={[styles.error, { color: colors.destructive }]}>{voiceError}</Text> : null}
      </View>
      <View style={styles.sessionActions}>
        <ActionButton title={paused ? 'Resume' : 'Pause'} variant="outline" onPress={() => { setPaused(!paused); if (!paused) { speechRef.current?.stop(); stopSpeaking(); } }} disabled={!active} />
        <ActionButton title="End session" variant="secondary" onPress={end} disabled={!active} />
      </View>
      {messages.length > 0 && (
        <View style={styles.chatActions}>
          <TouchableOpacity onPress={() => void saveChat()} style={[styles.chatAction, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Save chat">
            <Feather name="bookmark" size={16} color={colors.primary} />
            <Text style={[styles.chatActionText, { color: colors.foreground }]}>Save chat</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearChat} style={[styles.chatAction, { borderColor: colors.border, backgroundColor: colors.card }]} accessibilityRole="button" accessibilityLabel="Clear chat">
            <Feather name="trash-2" size={16} color={colors.destructive} />
            <Text style={[styles.chatActionText, { color: colors.foreground }]}>Clear chat</Text>
          </TouchableOpacity>
        </View>
      )}
      {messages.findLast?.((item) => item.role === 'assistant') && (
        <ResultCard title="Save this practice" content={messages.filter((item) => item.role === 'assistant').at(-1)?.text || ''} onSave={() => void saveHistory('english-guru', `${tutor.name} practice`, messages.map((item) => `${item.role}: ${item.text}`).join('\n')).then(() => Alert.alert('Saved', 'Added to your history.'))} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 20 },
  chat: { paddingHorizontal: 20, gap: 9, marginTop: 18 },
  bubble: { maxWidth: '88%', padding: 13, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  composer: { paddingHorizontal: 20, marginTop: 18 },
  input: { minHeight: 82, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 15, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 },
  iconButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  sessionActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
  chatActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 12 },
  chatAction: { flex: 1, minHeight: 42, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  chatActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  error: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 8 },
});