import React, { useState, useCallback } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useSafeBottomPadding } from '@/hooks/useSafeBottomPadding';
import { Header } from '@/components/Header';
import { ActionButton } from '@/components/ActionButton';
import { LoadingPlaceholder } from '@/components/LoadingPlaceholder';
import { getProfile, saveProfile, type Profile } from '@/lib/storage';
import { apiRequest, getSession } from '@/lib/api';

const FIELDS: { key: keyof Profile; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Full name', placeholder: 'Your name' },
  { key: 'age', label: 'Age', placeholder: 'e.g. 24' },
  { key: 'education', label: 'Education', placeholder: 'Graduate, Diploma, etc.' },
  { key: 'careerGoal', label: 'Career goal', placeholder: 'IT / Tech, Government Job, etc.' },
  { key: 'skills', label: 'Skills', placeholder: 'Excel, Java, communication...' },
  { key: 'language', label: 'Preferred language', placeholder: 'English, Hindi, etc.' },
  { key: 'location', label: 'Location', placeholder: 'City or state' },
  { key: 'salaryExpectation', label: 'Salary expectation', placeholder: '₹3-5 LPA' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = useSafeBottomPadding();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      Promise.all([getProfile(), getSession().catch(() => null)]).then(([local, session]) => {
        if (!mounted) return;
        setAuthenticated(Boolean(session));
        if (!session) { setProfile(local); return; }
        setProfile({
          ...local,
          name: session.name || local.name,
          language: session.preferredLanguage || local.language,
          location: session.location || local.location,
          careerGoal: session.careerGoal || local.careerGoal,
          skills: Array.isArray(session.skills) ? session.skills.join(', ') : local.skills,
        });
      });
      return () => { mounted = false; };
    }, []),
  );

  const update = (key: keyof Profile, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    await saveProfile(profile);
    if (!authenticated) {
      setSaved(true);
      return;
    }
    const response = await apiRequest<{ profile?: Record<string, unknown> }>('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: profile.name,
        degree: profile.education,
        careerGoal: profile.careerGoal,
        skills: profile.skills.split(',').map((item) => item.trim()).filter(Boolean),
        location: profile.location,
        preferredCity: profile.location,
        expectedSalary: profile.salaryExpectation,
        preferredLanguage: profile.language,
      }),
    });
    if (response.profile) {
      const server = response.profile;
      await saveProfile({
        ...profile,
        name: typeof server.name === 'string' ? server.name : profile.name,
        location: typeof server.location === 'string' ? server.location : profile.location,
      });
    }
    setSaved(true);
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
      setAuthenticated(false);
      Alert.alert('Signed out', 'Your local draft stays on this device. Sign in again to sync it.');
    } catch (error) {
      Alert.alert('Could not sign out', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  if (!profile) return <LoadingPlaceholder />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Header title="Profile" subtitle="Tell us about your career goals" />
      <View style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.accountText}>
          <Text style={[styles.accountTitle, { color: colors.foreground }]}>
            {authenticated ? 'Account synced' : 'Using the app as a guest'}
          </Text>
          <Text style={[styles.accountSubtitle, { color: colors.mutedForeground }]}>
            {authenticated ? 'Your profile, credits, progress and saved work sync across devices.' : 'Sign in to save your work and use credits across devices.'}
          </Text>
        </View>
        <Pressable
          onPress={() => authenticated ? void handleLogout() : router.push('/login' as never)}
          style={[styles.accountButton, { backgroundColor: authenticated ? colors.muted : colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel={authenticated ? 'Sign out' : 'Sign in'}
        >
          <Text style={{ color: authenticated ? colors.foreground : colors.primaryForeground, fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>
            {authenticated ? 'Sign out' : 'Sign in'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.form}>
        {FIELDS.map((field) => (
          <View key={field.key} style={styles.field}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>{field.label}</Text>
            <TextInput
              value={profile[field.key]}
              onChangeText={(text) => update(field.key, text)}
              placeholder={field.placeholder}
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderRadius: colors.radius,
                },
              ]}
            />
          </View>
        ))}

        <View style={styles.saveRow}>
          {saved && <Text style={[styles.saved, { color: colors.primary }]}>Saved</Text>}
          <ActionButton title="Save profile" onPress={handleSave} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
  },
  accountCard: {
    marginHorizontal: 20,
    marginTop: 4,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountText: { flex: 1, gap: 3 },
  accountTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  accountSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17 },
  accountButton: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 9 },
  field: {
    gap: 6,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  saveRow: {
    marginTop: 8,
    gap: 8,
  },
  saved: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    textAlign: 'center',
  },
});
