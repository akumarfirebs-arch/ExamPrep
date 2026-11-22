import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { ExamButton, Heading, Panel, ScreenFrame, showNotice, TextField, UI } from '@/components/exam-ui';
import { PRESET_AVATARS, UserAvatar } from '@/components/user-avatar';
import { useAuth } from '@/lib/authContext';
import { getResults } from '@/lib/examStorage';
import type { TestResult } from '@/types/exam';

export default function ProfileScreen() {
  const { user, signOut, updateAvatar, createSubAdmin } = useAuth();
  const [results, setResults] = useState<TestResult[]>([]);
  const [updating, setUpdating] = useState(false);

  // Sub-admin creation state (Admin only)
  const [subAdminName, setSubAdminName] = useState('');
  const [subAdminEmail, setSubAdminEmail] = useState('');
  const [subAdminPass, setSubAdminPass] = useState('');
  const [isCreatingSubAdmin, setIsCreatingSubAdmin] = useState(false);

  useEffect(() => {
    void getResults().then(setResults).catch(() => {});
  }, []);

  const handlePickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showNotice('Permission Denied', 'Camera roll / gallery permissions are needed to choose an image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        setUpdating(true);
        await updateAvatar(result.assets[0].uri);
        showNotice('Avatar Updated', 'Your profile picture has been updated from gallery.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not pick image';
      showNotice('Error', msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    setUpdating(true);
    try {
      await updateAvatar(presetId);
    } catch {
      showNotice('Error', 'Could not update avatar.');
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateSubAdmin = async () => {
    if (!subAdminName.trim() || !subAdminEmail.trim() || !subAdminPass) {
      showNotice('Missing Fields', 'Please fill name, email, and temporary password for the new sub-admin.');
      return;
    }
    if (subAdminPass.length < 6) {
      showNotice('Password Too Short', 'Password must be at least 6 characters.');
      return;
    }
    setIsCreatingSubAdmin(true);
    try {
      const newAdmin = await createSubAdmin(subAdminName.trim(), subAdminEmail.trim(), subAdminPass);
      showNotice(
        'Sub-Admin Created',
        `Sub-admin account for ${newAdmin.name} (${newAdmin.email}) created successfully with role: admin! They can now log in and build tests.`
      );
      setSubAdminName('');
      setSubAdminEmail('');
      setSubAdminPass('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create sub-admin';
      showNotice('Creation Failed', msg);
    } finally {
      setIsCreatingSubAdmin(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  if (!user) {
    return (
      <ScreenFrame>
        <Panel style={styles.notLoggedCard}>
          <Text style={styles.notLoggedTitle}>No profile active</Text>
          <Text style={styles.notLoggedText}>Please sign in to access your profile and exam history.</Text>
          <ExamButton title="Sign in" onPress={() => router.push('/login')} />
          <ExamButton title="Create account" onPress={() => router.push('/signup')} variant="outline" />
        </Panel>
      </ScreenFrame>
    );
  }

  const avgPercentage = results.length > 0
    ? results.reduce((acc, r) => acc + r.percentage, 0) / results.length
    : 0;

  return (
    <ScreenFrame>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.topLabel}>USER PROFILE</Text>
        <View style={{ width: 44 }} />
      </View>

      <Panel style={styles.heroProfileCard}>
        <View style={styles.avatarWrap}>
          <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size={84} />
          <View style={[styles.roleBadgeFloating, { backgroundColor: user.role === 'admin' ? UI.red : UI.primary }]}>
            <Text style={styles.roleBadgeFloatingText}>{user.role.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userEmail}>{user.email}</Text>

        <View style={styles.avatarActions}>
          <ExamButton
            title={updating ? 'Updating…' : '📷 Choose from Gallery'}
            onPress={() => void handlePickFromGallery()}
            variant="secondary"
            compact
            disabled={updating}
          />
        </View>
      </Panel>

      <View style={styles.section}>
        <Heading title="Customize avatar" subtitle="Pick an official candidate persona or illustration." />
        <View style={styles.presetGrid}>
          {PRESET_AVATARS.map((preset) => {
            const isSelected = user.avatarUrl === preset.id;
            return (
              <Pressable
                key={preset.id}
                onPress={() => void handleSelectPreset(preset.id)}
                style={[styles.presetCard, isSelected && styles.presetCardSelected]}>
                <View style={[styles.presetIconWrap, { backgroundColor: preset.bg }]}>
                  <Text style={styles.presetEmoji}>{preset.text}</Text>
                </View>
                <Text numberOfLines={1} style={[styles.presetTitle, isSelected && styles.presetTitleSelected]}>
                  {preset.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Heading title="Prep statistics" subtitle="Your performance across all completed tests." />
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{results.length}</Text>
            <Text style={styles.statLbl}>Tests completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: UI.green }]}>{avgPercentage.toFixed(0)}%</Text>
            <Text style={styles.statLbl}>Average score</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: UI.primary }]}>
              {results.reduce((acc, r) => acc + r.correctCount, 0)}
            </Text>
            <Text style={styles.statLbl}>Correct answers</Text>
          </View>
        </View>
      </View>

      {user.role === 'admin' && (
        <>
          <Panel style={styles.adminPrivilegeCard}>
            <View style={styles.adminPrivilegeHeader}>
              <Text style={styles.adminPrivilegeBadge}>ADMIN PRIVILEGES ACTIVE</Text>
            </View>
            <Text style={styles.adminPrivilegeTitle}>Educator & Test Builder Access</Text>
            <Text style={styles.adminPrivilegeText}>
              You have full administrator access to create new tests, configure positive/negative marking, add bilingual questions, and publish exam sets.
            </Text>
            <ExamButton
              title="Open Test Builder (+ Build a test)"
              onPress={() => router.push('/admin')}
            />
          </Panel>

          <Panel style={styles.subAdminCard}>
            <View style={styles.subAdminHeader}>
              <Text style={styles.subAdminBadge}>ADMIN ONLY • TEAM MANAGEMENT</Text>
            </View>
            <Text style={styles.subAdminTitle}>Create New Sub-Admin / Educator</Text>
            <Text style={styles.subAdminText}>
              Public registration only grants candidate/student access. As an Administrator, you can create new sub-admin accounts here with full test creation permissions.
            </Text>

            <View style={styles.subAdminForm}>
              <TextField
                label="Sub-Admin Full Name"
                value={subAdminName}
                onChangeText={setSubAdminName}
                placeholder="e.g. Rahul Sharma"
              />
              <TextField
                label="Official Email Address"
                value={subAdminEmail}
                onChangeText={setSubAdminEmail}
                placeholder="subadmin@examprep.org"
              />
              <TextField
                label="Temporary Password"
                value={subAdminPass}
                onChangeText={setSubAdminPass}
                placeholder="Minimum 6 characters"
                secureTextEntry
              />

              <ExamButton
                title={isCreatingSubAdmin ? 'Creating Sub-Admin…' : 'Create Sub-Admin Account'}
                onPress={() => void handleCreateSubAdmin()}
                disabled={isCreatingSubAdmin}
                variant="secondary"
              />
            </View>
          </Panel>
        </>
      )}

      <View style={styles.signOutSection}>
        <ExamButton
          title="Sign out of ExamPrep"
          onPress={() => void handleSignOut()}
          variant="outline"
        />
      </View>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 28, lineHeight: 31 },
  topLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  heroProfileCard: { alignItems: 'center', padding: 22, gap: 8, backgroundColor: UI.surface },
  avatarWrap: { position: 'relative', marginBottom: 4 },
  roleBadgeFloating: { position: 'absolute', bottom: -4, right: -4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, borderWidth: 2, borderColor: '#fff' },
  roleBadgeFloatingText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  userName: { color: UI.ink, fontSize: 20, fontWeight: '900' },
  userEmail: { color: UI.muted, fontSize: 13 },
  avatarActions: { marginTop: 8 },
  section: { gap: 12 },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  presetCard: { width: '31%', flexGrow: 1, alignItems: 'center', padding: 12, borderRadius: 15, backgroundColor: UI.surface, borderWidth: 1.5, borderColor: UI.line, gap: 7 },
  presetCardSelected: { borderColor: UI.primary, backgroundColor: UI.primarySoft },
  presetIconWrap: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  presetEmoji: { fontSize: 20 },
  presetTitle: { color: UI.ink, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  presetTitleSelected: { color: UI.primary },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, padding: 14, borderRadius: 16, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line, alignItems: 'center', gap: 4 },
  statVal: { color: UI.ink, fontSize: 22, fontWeight: '900' },
  statLbl: { color: UI.muted, fontSize: 11, textAlign: 'center' },
  adminPrivilegeCard: { padding: 18, gap: 10, backgroundColor: '#FFF6F7', borderColor: '#FFD3D8' },
  adminPrivilegeHeader: { flexDirection: 'row' },
  adminPrivilegeBadge: { color: UI.red, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  adminPrivilegeTitle: { color: UI.ink, fontSize: 16, fontWeight: '900' },
  adminPrivilegeText: { color: UI.muted, fontSize: 12, lineHeight: 18 },
  subAdminCard: { padding: 18, gap: 10, backgroundColor: UI.surface, borderWidth: 1.5, borderColor: UI.line },
  subAdminHeader: { flexDirection: 'row' },
  subAdminBadge: { color: UI.purple, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  subAdminTitle: { color: UI.ink, fontSize: 16, fontWeight: '900' },
  subAdminText: { color: UI.muted, fontSize: 12, lineHeight: 18 },
  subAdminForm: { gap: 10, marginTop: 4 },
  signOutSection: { marginTop: 6 },
  notLoggedCard: { padding: 24, gap: 14, alignItems: 'center' },
  notLoggedTitle: { color: UI.ink, fontSize: 18, fontWeight: '900' },
  notLoggedText: { color: UI.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
