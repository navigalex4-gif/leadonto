import React, { useState, useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';
import { ToolCard } from '@/components/ToolCard';
import { StatCard } from '@/components/StatCard';
import { ProgressRing } from '@/components/ProgressRing';
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getProgress, getProfile, type Progress, type Profile } from '@/lib/storage';
import type { ToolInfo } from '@/components/ToolCard';
import { apiRequest, getSession } from '@/lib/api';

export default function HomeScreen() {
  const colors = useColors();
  const bottomPadding = useSafeBottomPadding();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      Promise.all([getProgress(), getProfile(), getSession().catch(() => null), apiRequest<{ balance: number | null }>('/credits/balance').catch(() => ({ balance: null }))]).then(([p, pr, session, creditData]) => {
        if (!mounted) return;
        const mergedProfile = session ? {
          ...pr,
          name: session.name || pr.name,
          language: session.preferredLanguage || pr.language,
          location: session.location || pr.location,
          careerGoal: session.careerGoal || pr.careerGoal,
          skills: Array.isArray(session.skills) ? session.skills.join(', ') : pr.skills,
        } : pr;
        setProgress(p);
        setProfile(mergedProfile);
        setCredits(typeof creditData.balance === 'number' ? creditData.balance : null);
      });
      return () => { mounted = false; };
    }, []),
  );

  if (!progress || !profile) return <LoadingPlaceholder />;

  const overall = Math.min(
    100,
    Math.round((progress.englishMinutes + progress.interviewCount * 10 + progress.resumeAnalyses * 10 + progress.jobsSaved * 5) / 5),
  );

  const FLUENCY_TOOLS: ToolInfo[] = [
    { id: 'english-guru',      title: 'English Guru', subtitle: 'AI conversation & speaking',     icon: 'message-circle', color: colors.tools.english },
    { id: 'tools-pro',         title: 'Tools Pro',    subtitle: 'Grammar, writing & vocabulary',  icon: 'tool',           color: colors.tools.english },
    { id: 'my-journey',        title: 'My Journey',   subtitle: 'CEFR roadmap & streak tracking', icon: 'compass',        color: colors.tools.english },
  ];

  const CAREER_TOOLS: ToolInfo[] = [
    { id: 'interview-ace',      title: 'Interview Ace',   subtitle: 'Mock interviews & AI feedback', icon: 'users',     color: colors.tools.interview },
    { id: 'rozgar-samachar',    title: 'Rozgar Samachar', subtitle: 'Live jobs & salary insights',   icon: 'briefcase', color: colors.tools.rozgar    },
    { id: 'resume-intelligence',title: 'Resume',          subtitle: 'ATS score & keyword analysis',  icon: 'file-text', color: colors.tools.resume    },
  ];

  function handleToolPress(id: string) {
    if (id === 'my-journey') {
      router.push('/learning-journey' as never);
    } else {
      router.push(`/${id}` as never);
    }
  }

  const contentWidth = Math.min(width, 520);
  const horizontalPadding = width < 360 ? 16 : 20;
  const headlineSize = Math.max(32, Math.min(42, contentWidth * 0.102));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 16 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Compact mobile header: every item remains visible at 320–430pt widths. */}
      <View style={[styles.mobileHeader, { paddingTop: insets.top + 8, paddingHorizontal: horizontalPadding, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.replace('/(tabs)' as never)} accessibilityRole="button" accessibilityLabel="Lead Onto home">
          <Text style={[styles.brand, { color: colors.primary }]}>Lead Onto</Text>
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable style={[styles.creditPill, { borderColor: colors.primary + '55', backgroundColor: colors.primary + '12' }]} onPress={() => router.push('/credits' as never)} accessibilityRole="button" accessibilityLabel="Credits">
            <Feather name="link-2" size={12} color={colors.primary} />
            <Text style={[styles.creditText, { color: colors.primary }]}>{credits ?? '—'}</Text>
          </Pressable>
          <Pressable style={[styles.avatar, { backgroundColor: colors.secondary }]} onPress={() => router.push('/(tabs)/profile' as never)} accessibilityRole="button" accessibilityLabel="Open profile">
            <Text style={[styles.avatarText, { color: colors.secondaryForeground }]}>{(profile.name || 'L').slice(0, 1).toUpperCase()}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/tools' as never)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Open menu">
            <Feather name="menu" size={23} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.headerSuite}>
          <Pressable style={styles.headerSuiteButton} onPress={() => router.push('/english-guru' as never)} accessibilityRole="button">
            <Feather name="zap" size={13} color={colors.mutedForeground} />
            <Text style={[styles.headerSuiteText, { color: colors.mutedForeground }]}>Fluency Suite</Text>
            <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
          </Pressable>
          <Pressable style={styles.headerSuiteButton} onPress={() => router.push('/interview-ace' as never)} accessibilityRole="button">
            <Feather name="briefcase" size={13} color={colors.mutedForeground} />
            <Text style={[styles.headerSuiteText, { color: colors.mutedForeground }]}>Career Suite</Text>
            <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.hero, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.learnBadge, { backgroundColor: colors.primary + '16', borderColor: colors.primary + '35' }]}>
          <Feather name="zap" size={14} color={colors.primary} />
          <Text style={[styles.learnBadgeText, { color: colors.primary }]}>Learn something new</Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.foreground, fontSize: headlineSize, lineHeight: headlineSize * 1.08 }]}>
          Master English.{'\n'}Ace Interviews.{'\n'}<Text style={{ color: colors.primary }}>Get the Job.</Text>
        </Text>
        <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
          Lead Onto catalysing your aspirations
        </Text>
        <Pressable style={[styles.primaryCta, { backgroundColor: colors.primary, borderRadius: colors.radius }]} onPress={() => router.push('/communication-check' as never)} accessibilityRole="button">
          <Text style={[styles.primaryCtaText, { color: colors.primaryForeground }]}>Try Free 90-Second Check</Text>
          <Feather name="arrow-right" size={18} color={colors.primaryForeground} />
        </Pressable>
        <Pressable style={[styles.secondaryCta, { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius }]} onPress={() => router.push('/english-guru' as never)} accessibilityRole="button">
          <Text style={[styles.secondaryCtaText, { color: colors.foreground }]}>Start Learning Free</Text>
        </Pressable>
        <View style={[styles.quote, { borderLeftColor: colors.primary + '66' }]}>
          <Text style={[styles.quoteText, { color: colors.mutedForeground }]}>
            “97% of HR decision-makers in India say English proficiency is more important today than it was five years ago, and 87% say the growing use of AI has increased the need for strong English skills.”
          </Text>
          <Text style={[styles.quoteSource, { color: colors.mutedForeground }]}>— ETS, TOEIC Global English Skills Report 2026</Text>
        </View>
        <View style={styles.benefits}>
          {[
            'Native-language support — Hindi, Tamil, Telugu & 10 more',
            'Voice-powered practice — speak, listen, improve',
            'Live jobs personalised by experience & location',
            'CEFR English roadmap from AI to C2',
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.benefitText, { color: colors.foreground }]}>{benefit}</Text>
            </View>
          ))}
        </View>
        <View style={styles.heroLinks}>
          <Pressable onPress={() => router.push('/(tabs)/jobs' as never)}><Text style={[styles.heroLink, { color: colors.mutedForeground }]}>Browse Jobs</Text></Pressable>
          <Pressable onPress={() => router.push('/interview-ace' as never)}><Text style={[styles.heroLink, { color: colors.mutedForeground }]}>Open B2B Portal →</Text></Pressable>
        </View>
      </View>

      {/* Progress and tools remain below the landing content. */}
      <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.heroCard, { backgroundColor: colors.secondary, borderRadius: colors.radius * 1.5 }]}>
          <View style={styles.heroRow}>
            <ProgressRing value={overall} label="Weekly goal" />
            <View style={styles.progressText}>
              <Text style={[styles.progressTitle, { color: colors.secondaryForeground }]}>Keep the momentum going</Text>
              <Text style={[styles.progressSubtitle, { color: colors.secondaryForeground + 'cc' }]}>{progress.streakDays} day streak · {progress.englishMinutes} min practice</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Fluency Suite ────────────────────────────────────────────────────── */}
      <View style={[styles.section, { paddingHorizontal: horizontalPadding }]}>
        <View style={[styles.suiteWrap, { borderColor: colors.tools.english + '35', backgroundColor: colors.tools.english + '0a' }]}>
          <View style={[styles.suiteAccent, { backgroundColor: colors.tools.english }]} />
          <View style={styles.suiteContent}>
            <View style={[styles.suitePill, { backgroundColor: colors.tools.english + '22' }]}>
              <Feather name="book-open" size={10} color={colors.tools.english} />
              <Text style={[styles.suitePillText, { color: colors.tools.english }]}>Fluency Suite</Text>
            </View>
            <Text style={[styles.suiteTitle, { color: colors.foreground }]}>Speak with confidence.</Text>
            <Text style={[styles.suiteDesc, { color: colors.mutedForeground }]}>
              Learn naturally — in Hindi, Tamil & 10+ Indian languages
            </Text>
          </View>
        </View>
        <View style={styles.toolGrid}>
          {FLUENCY_TOOLS.map(tool => (
            <ToolCard key={tool.id} tool={tool} onPress={() => handleToolPress(tool.id)} />
          ))}
        </View>
      </View>

      {/* ── Career Suite ─────────────────────────────────────────────────────── */}
      <View style={[styles.section, { paddingHorizontal: horizontalPadding, marginBottom: 8 }]}>
        <View style={[styles.suiteWrap, { borderColor: colors.tools.interview + '35', backgroundColor: colors.tools.interview + '0a' }]}>
          <View style={[styles.suiteAccent, { backgroundColor: colors.tools.interview }]} />
          <View style={styles.suiteContent}>
            <View style={[styles.suitePill, { backgroundColor: colors.tools.interview + '22' }]}>
              <Feather name="trending-up" size={10} color={colors.tools.interview} />
              <Text style={[styles.suitePillText, { color: colors.tools.interview }]}>Career Suite</Text>
            </View>
            <Text style={[styles.suiteTitle, { color: colors.foreground }]}>Get hired. Go further.</Text>
            <Text style={[styles.suiteDesc, { color: colors.mutedForeground }]}>
              Tailored to your experience, location & career goal
            </Text>
          </View>
        </View>
        <View style={styles.toolGrid}>
          {CAREER_TOOLS.map(tool => (
            <ToolCard key={tool.id} tool={tool} onPress={() => handleToolPress(tool.id)} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  mobileHeader: {
    minHeight: 64,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 3,
  },
  brand: { fontFamily: 'Inter_700Bold', fontSize: 17, letterSpacing: -0.5 },
  headerSuite: { flexBasis: '100%', width: '100%', flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  headerSuiteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingHorizontal: 3 },
  headerSuiteText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditPill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 5 },
  creditText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  avatar: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  hero: { marginTop: 46, maxWidth: 520, width: '100%', alignSelf: 'center' },
  learnBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 20 },
  learnBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  heroTitle: { fontFamily: 'Inter_700Bold', letterSpacing: -1.3 },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 24, marginBottom: 24 },
  primaryCta: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 },
  primaryCtaText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  secondaryCta: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginTop: 10, paddingHorizontal: 16 },
  secondaryCtaText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  quote: { borderLeftWidth: 2, paddingLeft: 12, marginTop: 22, gap: 4 },
  quoteText: { fontFamily: 'Inter_400Regular', fontSize: 12.5, lineHeight: 19, fontStyle: 'italic' },
  quoteSource: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, fontStyle: 'italic' },
  benefits: { gap: 12, marginTop: 24 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  benefitText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 19 },
  heroLinks: { flexDirection: 'row', gap: 20, marginTop: 36, marginBottom: 4 },
  heroLink: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  section: { marginTop: 24, gap: 12 },
  heroCard: { padding: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progressText: { flex: 1, gap: 6 },
  progressTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  progressSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  /* Suite header card */
  suiteWrap: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suiteAccent: { width: 4 },
  suiteContent: { flex: 1, padding: 14, gap: 4 },
  suitePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 2,
  },
  suitePillText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  suiteTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  suiteDesc:  { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },

  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});
