import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { ExamButton, Heading, Panel, Pill, ScreenFrame, showNotice, TypeBadge, UI } from '@/components/exam-ui';
import { UserAvatar } from '@/components/user-avatar';
import { EXAMS, TEST_TYPE_LABELS } from '@/data/exams';
import { useAuth } from '@/lib/authContext';
import { getActiveAttempt, getResults, getTests } from '@/lib/examStorage';
import type { ActiveAttempt, TestConfig, TestResult, TestType } from '@/types/exam';

const MODES: { type: TestType; label: string }[] = [
  { type: 'MOCK', label: 'Mock tests' },
  { type: 'SUBJECT_WISE', label: 'By subject' },
  { type: 'PYQ', label: 'PYQs' },
  { type: 'DPP', label: 'Daily practice' },
];

export default function ExamHubScreen() {
  const { user, isAdmin } = useAuth();
  const [examId, setExamId] = useState(EXAMS[0].id);
  const [subExamId, setSubExamId] = useState<string | null>(null);
  const [mode, setMode] = useState<TestType>('MOCK');
  const [tests, setTests] = useState<TestConfig[]>([]);
  const [attempts, setAttempts] = useState<Record<string, ActiveAttempt>>({});
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      async function load() {
        try {
          const [loadedTests, loadedResults] = await Promise.all([getTests(), getResults()]);
          const loadedAttempts = await Promise.all(
            loadedTests.map(async (test) => [test.id, await getActiveAttempt(test.id)] as const),
          );
          if (!active) return;
          setTests(loadedTests);
          setResults(loadedResults);
          setAttempts(
            Object.fromEntries(loadedAttempts.filter((item): item is readonly [string, ActiveAttempt] => item[1] !== null)),
          );
        } catch {
          if (active) showNotice('Could not load your tests', 'Please close and reopen the app to try again.');
        } finally {
          if (active) setLoading(false);
        }
      }
      void load();
      return () => {
        active = false;
      };
    }, []),
  );

  const selectedExam = EXAMS.find((exam) => exam.id === examId) ?? EXAMS[0];
  const visibleTests = useMemo(
    () =>
      tests.filter(
        (test) =>
          test.examId === examId &&
          test.testType === mode &&
          (!subExamId || test.subExamId === subExamId),
      ),
    [tests, examId, subExamId, mode],
  );
  const recentResults = results.slice(0, 3);

  const launch = (test: TestConfig) => router.push(`/exam/${test.id}`);

  return (
    <ScreenFrame>
      <View style={styles.topRow}>
        <View style={styles.brand}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>E</Text></View>
          <Text style={styles.brandName}>ExamPrep</Text>
        </View>

        <View style={styles.topActions}>
          {isAdmin && (
            <Pressable onPress={() => router.push('/admin')} style={styles.adminButton} accessibilityRole="button">
              <Text style={styles.adminButtonText}>+ Build a test</Text>
            </Pressable>
          )}

          {user ? (
            <Pressable onPress={() => router.push('/profile')} style={styles.profileBadge} accessibilityRole="button">
              <UserAvatar avatarUrl={user.avatarUrl} name={user.name} size={34} />
              <View style={styles.profileTextWrap}>
                <Text numberOfLines={1} style={styles.profileName}>{user.name.split(' ')[0]}</Text>
                <Text style={[styles.profileRole, { color: user.role === 'admin' ? UI.red : UI.primary }]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.push('/login')} style={styles.loginButton} accessibilityRole="button">
              <Text style={styles.loginButtonText}>Sign In</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TESTBOOK-GRADE PREP</Text>
        <Text style={styles.heroTitle}>Make every{'\n'}practice count.</Text>
        <Text style={styles.heroSubtitle}>Choose your exam category, drill sub-exams, and prepare in English or Hindi.</Text>
        <View style={styles.heroStats}>
          <View><Text style={styles.statValue}>{tests.length}</Text><Text style={styles.statLabel}>practice sets</Text></View>
          <View style={styles.statDivider} />
          <View><Text style={styles.statValue}>{results.length}</Text><Text style={styles.statLabel}>attempts saved</Text></View>
          <View style={styles.statDivider} />
          <View><Text style={styles.statValue}>{EXAMS.length}</Text><Text style={styles.statLabel}>exam tracks</Text></View>
        </View>
        <View style={styles.heroOrb} />
      </View>

      <View style={styles.section}>
        <Heading title="Choose your exam" subtitle="Select your target exam and sub-exam track." />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {EXAMS.map((exam) => (
            <Pill key={exam.id} active={exam.id === examId} onPress={() => { setExamId(exam.id); setSubExamId(null); }}>
              {exam.shortName}
            </Pill>
          ))}
        </ScrollView>
        <Panel style={styles.examPanel}>
          <View style={styles.examIcon}><Text style={styles.examIconText}>{selectedExam.shortName.slice(0, 1)}</Text></View>
          <View style={styles.examCopy}>
            <Text style={styles.examTitle}>{selectedExam.name}</Text>
            <Text style={styles.examDescription}>{selectedExam.description}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Panel>

        {selectedExam.subExams && selectedExam.subExams.length > 0 && (
          <View style={styles.subExamContainer}>
            <Text style={styles.subExamLabel}>SUB-EXAMS & TARGETS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              <Pill active={subExamId === null} onPress={() => setSubExamId(null)}>
                All {selectedExam.shortName}
              </Pill>
              {selectedExam.subExams.map((sub) => (
                <Pill key={sub.id} active={subExamId === sub.id} onPress={() => setSubExamId(sub.id)}>
                  {sub.shortName}
                </Pill>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Heading title="Practice library" subtitle="Pick a mode to match today's goal." />
          <Text style={styles.testCount}>{visibleTests.length} SET{visibleTests.length === 1 ? '' : 'S'}</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MODES.map(({ type, label }) => (
            <Pill key={type} active={type === mode} onPress={() => setMode(type)}>
              {label}
            </Pill>
          ))}
        </ScrollView>

        {loading ? (
          <Panel><Text style={styles.emptyText}>Loading your practice library…</Text></Panel>
        ) : visibleTests.length ? (
          visibleTests.map((test) => (
            <TestCard key={test.id} test={test} activeAttempt={attempts[test.id]} onStart={() => launch(test)} />
          ))
        ) : (
          <Panel style={styles.emptyPanel}>
            <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>+</Text></View>
            <Text style={styles.emptyTitle}>A fresh page for {TEST_TYPE_LABELS[mode].toLowerCase()}</Text>
            <Text style={styles.emptyText}>No {mode === 'PYQ' ? 'previous-year papers' : 'practice sets'} are listed for {selectedExam.shortName} yet.</Text>
            <ExamButton title="Create a test" onPress={() => router.push('/admin')} variant="secondary" />
          </Panel>
        )}
      </View>

      {recentResults.length > 0 && (
        <View style={styles.section}>
          <Heading title="Recent scorecards" subtitle="Every completed attempt is saved on this device." />
          {recentResults.map((result) => (
            <Pressable key={result.id} style={styles.resultRow} onPress={() => router.push(`/result/${result.id}`)}>
              <View style={styles.resultType}><Text style={styles.resultTypeText}>{result.test.examId.slice(0, 2).toUpperCase()}</Text></View>
              <View style={styles.resultCopy}>
                <Text numberOfLines={1} style={styles.resultTitle}>{result.test.title}</Text>
                <Text style={styles.resultSub}>{new Date(result.completedAt).toLocaleDateString()} · {result.correctCount} correct</Text>
              </View>
              <Text style={styles.resultScore}>{result.percentage.toFixed(0)}%</Text>
            </Pressable>
          ))}
        </View>
      )}
      <Text style={styles.footer}>Small steps. Strong scores.</Text>
    </ScreenFrame>
  );
}

function TestCard({
  test,
  activeAttempt,
  onStart,
}: {
  test: TestConfig;
  activeAttempt?: ActiveAttempt;
  onStart: () => void;
}) {
  const details = [
    test.subject,
    test.year ? String(test.year) : null,
    test.date ?? (test.dayNumber ? `Day ${test.dayNumber}` : null),
    test.shift,
    test.paper,
  ].filter(Boolean);
  const maxMarks = test.questions.reduce(
    (total, question) => total + (question.positiveMarks ?? test.positiveMarks),
    0,
  );

  return (
    <Panel style={styles.testCard}>
      <View style={styles.cardHead}>
        <TypeBadge type={test.testType} />
        <Text style={styles.marksLabel}>+{test.positiveMarks} · −{test.negativeMarks}</Text>
      </View>
      <Text style={styles.testTitle}>{test.title}</Text>
      <Text style={styles.testDescription}>{test.description}</Text>
      {details.length > 0 && <Text style={styles.detailLine}>{details.join('  /  ')}</Text>}
      <View style={styles.testMeta}>
        <Text style={styles.metaItem}>{test.questions.length} questions</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaItem}>{Number.isInteger(maxMarks) ? maxMarks : maxMarks.toFixed(2)} marks</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaItem}>{test.timed ? `${test.durationMinutes} min` : 'Untimed practice'}</Text>
        {test.section ? <><Text style={styles.metaDot}>·</Text><Text numberOfLines={1} style={styles.metaItem}>{test.section}</Text></> : null}
      </View>
      <ExamButton title={activeAttempt ? 'Continue test' : 'Start practice'} onPress={onStart} />
    </Panel>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -4 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandMark: { width: 34, height: 34, borderRadius: 12, backgroundColor: UI.primary, alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  brandName: { color: UI.ink, fontSize: 16, fontWeight: '900' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 13, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  adminButtonText: { color: UI.primary, fontWeight: '800', fontSize: 12 },
  profileBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 5, paddingRight: 10, borderRadius: 20, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  profileTextWrap: { gap: 1 },
  profileName: { color: UI.ink, fontSize: 11, fontWeight: '800', maxWidth: 70 },
  profileRole: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  loginButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 12, backgroundColor: UI.primary },
  loginButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  hero: { overflow: 'hidden', backgroundColor: UI.ink, borderRadius: 26, padding: 23, gap: 11 },
  eyebrow: { color: '#B8C2FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  heroTitle: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', lineHeight: 39, letterSpacing: -1.2 },
  heroSubtitle: { maxWidth: 270, color: '#C4CCDD', fontSize: 13, lineHeight: 19 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 9 },
  statValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#AAB5CB', fontSize: 10, marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#3A4760' },
  heroOrb: { position: 'absolute', width: 130, height: 130, borderRadius: 100, borderWidth: 1, borderColor: '#3C4B6D', right: -32, top: 20 },
  section: { gap: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  testCount: { color: UI.muted, fontSize: 10, fontWeight: '900', paddingBottom: 4 },
  chipRow: { gap: 8, paddingRight: 12 },
  examPanel: { flexDirection: 'row', alignItems: 'center' },
  examIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: UI.primarySoft, alignItems: 'center', justifyContent: 'center' },
  examIconText: { color: UI.primary, fontWeight: '900', fontSize: 18 },
  examCopy: { flex: 1, gap: 3 },
  examTitle: { color: UI.ink, fontSize: 14, fontWeight: '900' },
  examDescription: { color: UI.muted, fontSize: 12 },
  chevron: { color: UI.muted, fontSize: 25, marginLeft: 4 },
  testCard: { gap: 11 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  marksLabel: { color: UI.muted, fontSize: 11, fontWeight: '700' },
  testTitle: { color: UI.ink, fontSize: 17, fontWeight: '900', lineHeight: 22 },
  testDescription: { color: UI.muted, fontSize: 13, lineHeight: 19 },
  detailLine: { color: UI.primary, fontSize: 12, fontWeight: '700' },
  testMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaItem: { color: UI.muted, fontSize: 11, fontWeight: '700' },
  metaDot: { color: '#BBC3D1' },
  emptyPanel: { alignItems: 'center', paddingVertical: 24 },
  emptyMark: { width: 48, height: 48, borderRadius: 17, backgroundColor: UI.primarySoft, justifyContent: 'center', alignItems: 'center' },
  emptyMarkText: { color: UI.primary, fontSize: 25, fontWeight: '600' },
  emptyTitle: { color: UI.ink, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  emptyText: { color: UI.muted, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  resultRow: { flexDirection: 'row', alignItems: 'center', minHeight: 68, padding: 12, borderRadius: 17, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line, gap: 11 },
  resultType: { width: 38, height: 38, borderRadius: 13, backgroundColor: UI.primarySoft, alignItems: 'center', justifyContent: 'center' },
  resultTypeText: { color: UI.primary, fontSize: 11, fontWeight: '900' },
  resultCopy: { flex: 1, gap: 4 },
  resultTitle: { color: UI.ink, fontSize: 12, fontWeight: '800' },
  resultSub: { color: UI.muted, fontSize: 11 },
  subExamContainer: { gap: 8, marginTop: 4 },
  subExamLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  resultScore: { color: UI.primary, fontSize: 17, fontWeight: '900' },
  footer: { color: UI.muted, textAlign: 'center', fontSize: 11, fontWeight: '700' },
});
