import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ExamButton, Heading, Panel, ScreenFrame, showNotice, TextField, UI } from '@/components/exam-ui';
import { useAuth } from '@/lib/authContext';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      showNotice('Enter Credentials', 'Please provide both email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      showNotice('Sign In Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setSubmitting(true);
    try {
      await signIn(demoEmail, demoPass);
      router.replace('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo sign in failed';
      showNotice('Sign In Error', msg);
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
        <Text style={styles.topLabel}>AUTHENTICATION</Text>
        <View style={{ width: 44 }} />
      </View>

      <Heading
        title="Welcome back"
        subtitle="Sign in to continue your exam preparation or access the admin panel."
      />

      <Panel style={styles.loginCard}>
        <TextField
          label="Email address"
          value={email}
          onChangeText={setEmail}
          placeholder="your.email@example.com"
          keyboardType="default"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <ExamButton
          title={submitting ? 'Signing in…' : 'Sign in to ExamPrep'}
          onPress={() => void handleSignIn()}
          disabled={submitting}
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchPrompt}>New to ExamPrep?</Text>
          <Pressable onPress={() => router.push('/signup')}>
            <Text style={styles.switchLink}>Create an account</Text>
          </Pressable>
        </View>
      </Panel>

      <View style={styles.quickSection}>
        <Text style={styles.quickLabel}>INSTANT DEMO ACCESS</Text>
        <View style={styles.quickButtons}>
          <Pressable
            onPress={() => void handleQuickLogin('student@examprep.com', 'demo123')}
            style={styles.quickBtn}>
            <View style={[styles.roleBadge, { backgroundColor: '#EEF0FF' }]}>
              <Text style={[styles.roleBadgeText, { color: UI.primary }]}>CANDIDATE</Text>
            </View>
            <Text style={styles.quickName}>Rahul Kumar</Text>
            <Text style={styles.quickSub}>Test taking & student profile</Text>
          </Pressable>

          <Pressable
            onPress={() => void handleQuickLogin('admin@examprep.com', 'admin123')}
            style={styles.quickBtn}>
            <View style={[styles.roleBadge, { backgroundColor: '#FFF0F1' }]}>
              <Text style={[styles.roleBadgeText, { color: UI.red }]}>ADMIN</Text>
            </View>
            <Text style={styles.quickName}>Faculty Admin</Text>
            <Text style={styles.quickSub}>Test builder & full data access</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.footerInfo}>
        <Text style={styles.footerInfoText}>
          {isSupabaseConfigured
            ? 'Connected to Supabase Authentication & Database'
            : 'Using Local Storage Mode (Ready to connect with Supabase via .env)'}
        </Text>
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 28, lineHeight: 31 },
  topLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  loginCard: { padding: 20, gap: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4 },
  switchPrompt: { color: UI.muted, fontSize: 13 },
  switchLink: { color: UI.primary, fontSize: 13, fontWeight: '800' },
  quickSection: { gap: 10, marginTop: 4 },
  quickLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  quickButtons: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line, gap: 6 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { fontSize: 9, fontWeight: '900' },
  quickName: { color: UI.ink, fontSize: 13, fontWeight: '900' },
  quickSub: { color: UI.muted, fontSize: 11, lineHeight: 15 },
  footerInfo: { alignItems: 'center', marginTop: 12 },
  footerInfoText: { color: UI.muted, fontSize: 11, textAlign: 'center' },
});
