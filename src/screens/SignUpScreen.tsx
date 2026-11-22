import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ExamButton, Heading, Panel, ScreenFrame, showNotice, TextField, UI } from '@/components/exam-ui';
import { useAuth } from '@/lib/authContext';
import type { UserRole } from '@/types/exam';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
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
      await signUp(email, password, name, role);
      showNotice('Welcome!', `Your account has been created as ${role === 'admin' ? 'an Admin' : 'a Candidate'}.`);
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
        subtitle="Create your account to take mock tests, track analytics, and save scorecards."
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
        />

        <Text style={styles.roleLabel}>SELECT ACCOUNT TYPE</Text>
        <View style={styles.rolePicker}>
          <Pressable
            onPress={() => setRole('user')}
            style={[styles.roleOption, role === 'user' && styles.roleOptionActive]}>
            <Text style={styles.roleEmoji}>🎓</Text>
            <View style={styles.roleCopy}>
              <Text style={[styles.roleTitle, role === 'user' && styles.roleTitleActive]}>Candidate / Student</Text>
              <Text style={styles.roleSub}>Take mock tests, view scorecards, customize avatar</Text>
            </View>
            <View style={[styles.radio, role === 'user' && styles.radioActive]} />
          </Pressable>

          <Pressable
            onPress={() => setRole('admin')}
            style={[styles.roleOption, role === 'admin' && styles.roleOptionActive]}>
            <Text style={styles.roleEmoji}>🛡️</Text>
            <View style={styles.roleCopy}>
              <Text style={[styles.roleTitle, role === 'admin' && styles.roleTitleActive]}>Educator / Admin</Text>
              <Text style={styles.roleSub}>Build & publish tests, manage questions & papers</Text>
            </View>
            <View style={[styles.radio, role === 'admin' && styles.radioActive]} />
          </Pressable>
        </View>

        <ExamButton
          title={submitting ? 'Creating account…' : 'Create ExamPrep Account'}
          onPress={() => void handleSignUp()}
          disabled={submitting}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchPrompt}>Already registered?</Text>
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
  roleLabel: { color: UI.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  rolePicker: { gap: 10 },
  roleOption: { flexDirection: 'row', alignItems: 'center', padding: 13, borderRadius: 14, borderWidth: 1.5, borderColor: UI.line, backgroundColor: UI.surface, gap: 12 },
  roleOptionActive: { borderColor: UI.primary, backgroundColor: UI.primarySoft },
  roleEmoji: { fontSize: 24 },
  roleCopy: { flex: 1, gap: 2 },
  roleTitle: { color: UI.ink, fontSize: 13, fontWeight: '800' },
  roleTitleActive: { color: UI.primary },
  roleSub: { color: UI.muted, fontSize: 11, lineHeight: 15 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CAD4E2' },
  radioActive: { borderWidth: 5, borderColor: UI.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  switchPrompt: { color: UI.muted, fontSize: 13 },
  switchLink: { color: UI.primary, fontSize: 13, fontWeight: '800' },
});
