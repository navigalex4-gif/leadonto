import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { askAI, saveHistory } from '@/lib/api';
import { speakText } from '@/lib/speech';

const MODES = [
  { id: 'grammar', title: 'Grammar Fix', placeholder: 'Paste a sentence or paragraph', prompt: (value: string) => `Fix grammar in this text: "${value}". List each correction with a brief, simple explanation.` },
  { id: 'writing', title: 'Write Better', placeholder: 'What would you like to write?', prompt: (value: string) => `Rewrite this professionally and naturally for an Indian job seeker: "${value}". Give the improved version and 3 useful notes.` },
  { id: 'vocabulary', title: 'Vocabulary', placeholder: 'Topic or situation, e.g. customer support', prompt: (value: string) => `Give 8 practical English words for "${value}". Format each as word — simple meaning — example sentence.` },
  { id: 'pronunciation', title: 'Pronunciation', placeholder: 'A word you find difficult', prompt: (value: string) => `Give a simple pronunciation guide for "${value}" with syllables, Indian-language guidance, common mistake, and three example sentences.` },
  { id: 'lesson', title: 'English Lesson', placeholder: 'A topic you want to learn', prompt: (value: string) => `Teach a short practical English lesson about "${value}" for an Indian learner. Include examples and a 30-second practice task.` },
  { id: 'phrases', title: 'Interview Phrases', placeholder: 'Interview situation, e.g. tell me about yourself', prompt: (value: string) => `Give useful English interview phrases for "${value}". Include what to say, a natural alternative, and one pronunciation tip.` },
] as const;

export default function ToolsProScreen() {
  const colors = useColors();
  const [mode, setMode] = useState<(typeof MODES)[number]>(MODES[0]);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const run = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try { setResult(await askAI(mode.prompt(input), 'You are a concise, kind English teacher for Indian learners. Use readable plain text and practical examples.', 650)); }
    catch (error) { Alert.alert('Could not generate', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setLoading(false); }
  };
  return (
    <Screen>
      <Header title="Tools Pro" subtitle="Six focused tools for everyday English" showBack />
      <View style={styles.modes}>{MODES.map((item) => <TouchableOpacity key={item.id} onPress={() => { setMode(item); setResult(''); }} style={[styles.mode, { backgroundColor: mode.id === item.id ? colors.primary : colors.card, borderColor: colors.border }]}><Text style={{ color: mode.id === item.id ? colors.primaryForeground : colors.foreground, fontFamily: 'Inter_500Medium', fontSize: 13 }}>{item.title}</Text></TouchableOpacity>)}</View>
      <View style={styles.form}>
        <TextInput value={input} onChangeText={setInput} placeholder={mode.placeholder} placeholderTextColor={colors.mutedForeground} multiline style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <ActionButton title="Generate" onPress={() => void run()} loading={loading} disabled={!input.trim()} />
      </View>
      {result ? <ResultCard title={mode.title} content={result} onSave={() => void saveHistory('tools-pro', mode.title, result).then(() => Alert.alert('Saved', 'Added to your history.'))} /> : null}
      {result ? <View style={styles.listen}><ActionButton title="Listen" variant="outline" onPress={() => speakText(result, 1.05)} /><ActionButton title="New result" variant="outline" onPress={() => setResult('')} /></View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modes: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  mode: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  form: { paddingHorizontal: 20, marginTop: 18, gap: 12 },
  input: { minHeight: 130, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14, fontSize: 15, fontFamily: 'Inter_400Regular', textAlignVertical: 'top' },
  listen: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 12 },
});