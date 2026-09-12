import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Header } from '@/components/Header';
import { Screen } from '@/components/Screen';
import { ActionButton } from '@/components/ActionButton';
import { ResultCard } from '@/components/ResultCard';
import { useColors } from '@/hooks/useColors';
import { apiRequest, readSSE, saveHistory } from '@/lib/api';
import { speakText } from '@/lib/speech';
import { incrementProgress } from '@/lib/storage';

type Analysis = {
  overallScore?: number;
  skills?: string[];
  education?: string[];
  experienceSummary?: string;
  atsGaps?: string[];
  formattingIssues?: string[];
  suggestions?: string[];
};

function formatAnalysis(analysis: Analysis): string {
  return [
    analysis.overallScore != null ? `ATS score: ${analysis.overallScore}/100` : '',
    analysis.experienceSummary ? `\nExperience summary:\n${analysis.experienceSummary}` : '',
    analysis.skills?.length ? `\nSkills found:\n${analysis.skills.join(', ')}` : '',
    analysis.education?.length ? `\nEducation:\n${analysis.education.join(', ')}` : '',
    analysis.atsGaps?.length ? `\nATS gaps:\n${analysis.atsGaps.map((item) => `• ${item}`).join('\n')}` : '',
    analysis.formattingIssues?.length ? `\nFormatting issues:\n${analysis.formattingIssues.map((item) => `• ${item}`).join('\n')}` : '',
    analysis.suggestions?.length ? `\nSuggestions:\n${analysis.suggestions.map((item) => `• ${item}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}

export default function ResumeIntelligenceScreen() {
  const colors = useColors();
  const [resumeText, setResumeText] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Fresher');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [improved, setImproved] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiRequest<{ hasResume?: boolean; resumeText?: string; analysis?: Analysis }>('/resume/current')
      .then((data) => {
        if (data.resumeText) setResumeText(data.resumeText);
        if (data.analysis) setAnalysis(data.analysis);
      })
      .catch(() => undefined);
  }, []);

  const saveText = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    try {
      await apiRequest('/resume/text', { method: 'POST', body: JSON.stringify({ text: resumeText }) });
      Alert.alert('Resume saved', 'Your resume text is ready to analyse.');
    } catch (error) {
      Alert.alert('Could not save resume', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const analyse = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    try {
      const raw = await readSSE('/resume/analyse', {
        targetRole: targetRole.trim() || 'General',
        experienceLevel,
        guestText: resumeText,
      });
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      const parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw) as Analysis;
      setAnalysis(parsed);
      await incrementProgress('resumeAnalyses');
    } catch (error) {
      Alert.alert('Analysis failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const improve = async () => {
    if (!resumeText.trim()) return;
    setLoading(true);
    try {
      const data = await apiRequest<{ improvedText?: string }>('/resume/improved', {
        method: 'POST',
        body: JSON.stringify({ targetRole: targetRole.trim() || 'General', experienceLevel, guestText: resumeText }),
      });
      setImproved(data.improvedText || '');
    } catch (error) {
      Alert.alert('Could not improve resume', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Resume Intelligence" subtitle="Paste your resume for an ATS-ready review" showBack />
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Target role</Text>
        <TextInput value={targetRole} onChangeText={setTargetRole} placeholder="e.g. Data Analyst" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Experience level</Text>
        <TextInput value={experienceLevel} onChangeText={setExperienceLevel} placeholder="Fresher, Junior, Mid…" placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Resume text</Text>
        <TextInput value={resumeText} onChangeText={setResumeText} multiline placeholder="Paste the text from your resume here…" placeholderTextColor={colors.mutedForeground} style={[styles.resumeInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border }]} />
        <View style={styles.actions}>
          <ActionButton title="Save" variant="outline" onPress={() => void saveText()} loading={loading} disabled={!resumeText.trim()} />
          <ActionButton title="Analyse ATS" onPress={() => void analyse()} loading={loading} disabled={!resumeText.trim()} />
        </View>
        <ActionButton title="Create improved resume" variant="secondary" onPress={() => void improve()} loading={loading} disabled={!resumeText.trim()} />
      </View>
      {analysis ? <ResultCard title="ATS analysis" content={formatAnalysis(analysis)} onSave={() => void saveHistory('resume-intelligence', 'Resume ATS analysis', formatAnalysis(analysis)).then(() => Alert.alert('Saved', 'Analysis added to history.'))} /> : null}
      {improved ? <><ResultCard title="Improved resume" content={improved} onSave={() => void saveHistory('resume-intelligence', 'Improved resume', improved).then(() => Alert.alert('Saved', 'Improved resume added to history.'))} /><View style={styles.listen}><ActionButton title="Listen" variant="outline" onPress={() => speakText(improved)} /></View></> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { paddingHorizontal: 20, gap: 10, marginTop: 8 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 4 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 13, fontFamily: 'Inter_400Regular', fontSize: 15 },
  resumeInput: { minHeight: 230, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10 },
  listen: { paddingHorizontal: 20, marginTop: 10 },
});