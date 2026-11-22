import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ExamButton, Heading, Panel, ScreenFrame, showNotice, TextField, UI } from '@/components/exam-ui';
import { useAuth } from '@/lib/authContext';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!name.trim()) {
      showNotice('Name Required', 'Please enter your full name.');
      return;
    }
    if (!email.trim() || !password) {
      showNotice('Credentials Required', 'Please provide your email and password.');
      return;
    }
    if (password.length < 6) {
      showNotice('Short Password', 'Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      // Public sign-up is always registered as a regular student / candidate
      await signUp(email, password, name, 'user');
      showNotice('Welcome!', 'Your student account has been created successfully.');
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      showNotice('Registration Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenFrame>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.topLabel}>CREATE ACCOUNT</Text>
        <View style={{ width: 44 }} />
      </View>

      <Heading
        title="Start your prep"
        subtitle="Create your candidate account to take mock tests, track analytics, and save scorecards."
      />

      <Panel style={styles.card}>
        <TextField
          label="Full name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Priya Sharma"
        />

        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="default"
        />

        <TextField
          label="Password (min 6 characters)"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <ExamButton
          title={submitting ? 'Creating account…' : 'Create Candidate Account'}
          onPress={() => void handleSignUp()}
          disabled={submitting}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchPrompt}>Already have an account?</Text>
          <Pressable onPress={() => router.push('/login')}>
            <Text style={styles.switchLink}>Sign in</Text>
          </Pressable>
        </View>
      </Panel>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 28, lineHeight: 31 },
  topLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  card: { padding: 20, gap: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  switchPrompt: { color: UI.muted, fontSize: 13 },
  switchLink: { color: UI.primary, fontSize: 13, fontWeight: '800' },
});
