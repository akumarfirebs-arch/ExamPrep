import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ExamButton, Heading, Panel, Pill, ProgressBar, ScreenFrame, showNotice, TypeBadge, UI } from '@/components/exam-ui';
import { FormattedContent } from '@/components/formatted-content';
import { getResult } from '@/lib/examStorage';
import type { AnswerFilter, Language, Question, TestResult } from '@/types/exam';

const FILTERS: { value: AnswerFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'CORRECT', label: 'Correct' },
  { value: 'INCORRECT', label: 'Incorrect' },
  { value: 'UNATTEMPTED', label: 'Skipped' },
];

export default function ResultScreen() {
  const { attemptId: routeAttemptId } = useLocalSearchParams<{ attemptId: string }>();
  const attemptId = Array.isArray(routeAttemptId) ? routeAttemptId[0] : routeAttemptId;
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(Boolean(attemptId));
  const [filter, setFilter] = useState<AnswerFilter>('ALL');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    let active = true;
    if (!attemptId) return;

    async function load() {
      try {
        const savedResult = await getResult(attemptId!);
        if (active) {
          setResult(savedResult);
        }
      } catch {
        if (active) {
          showNotice('Could not load scorecard', 'Your saved result could not be read.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [attemptId]);

  const filteredQuestions = useMemo(() => {
    if (!result) return [];
    return result.test.questions.filter((question) => {
      const answer = result.answers[question.id];
      const correct = answer === question.correctOptionId;
      if (filter === 'CORRECT') return Boolean(answer) && correct;
      if (filter === 'INCORRECT') return Boolean(answer) && !correct;
      if (filter === 'UNATTEMPTED') return !answer;
      return true;
    });
  }, [result, filter]);

  if (!result) {
    return (
      <ScreenFrame>
        <Panel>
          <Text style={styles.pageTitle}>Scorecard</Text>
          <Text style={styles.mutedText}>{loading ? 'Loading your scorecard…' : 'Scorecard not found.'}</Text>
          <ExamButton title="Back to exam hub" onPress={() => router.replace('/')} />
        </Panel>
      </ScreenFrame>
    );
  }

  const reattempt = () => router.replace(`/exam/${result.test.id}`);
  return (
    <ScreenFrame>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.replace('/')} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.topLabel}>YOUR SCORECARD</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <TypeBadge type={result.test.testType} />
          <View style={[styles.outcome, result.passed ? styles.outcomePass : styles.outcomeFail]}>
            <Text style={[styles.outcomeText, result.passed ? styles.outcomeTextPass : styles.outcomeTextFail]}>
              {result.passed ? 'ON TRACK' : 'KEEP GOING'}
            </Text>
          </View>
        </View>
        <Text style={styles.testTitle}>{result.test.title}</Text>
        <View style={styles.scoreLine}>
          <Text style={styles.scoreValue}>{formatScore(result.score)}</Text>
          <Text style={styles.scoreDivider}>/</Text>
          <Text style={styles.scoreMax}>{formatScore(result.maxMarks)}</Text>
          <Text style={styles.scoreUnit}>marks</Text>
        </View>
        <View style={styles.heroBottom}>
          <View style={styles.percentageBadge}><Text style={styles.percentageText}>{result.percentage.toFixed(1)}%</Text></View>
          <Text style={styles.timeTaken}>{formatDuration(result.timeTakenSeconds)}{result.test.timed && result.test.durationMinutes ? ` / ${result.test.durationMinutes} min` : ' spent'}</Text>
        </View>
        <View style={styles.heroProgress}><ProgressBar value={result.percentage} color="#AAB4FF" /></View>
        <Text style={styles.cutoffNote}>Pass benchmark: {result.test.passPercentage ?? 40}%</Text>
      </View>

      <View style={styles.section}>
        <Heading title="At a glance" subtitle="A clear picture of this attempt." />
        <View style={styles.metricGrid}>
          <Metric label="Accuracy" value={`${result.accuracy.toFixed(0)}%`} note={`${result.correctCount} of ${result.attemptedCount} attempted`} color={UI.primary} />
          <Metric label="Correct" value={String(result.correctCount)} note="Answers right" color={UI.green} />
          <Metric label="Incorrect" value={String(result.incorrectCount)} note="Review these next" color={UI.red} />
          <Metric label="Unattempted" value={String(result.unattemptedCount)} note="Left unanswered" color={UI.muted} />
        </View>
        <Panel style={styles.marksPanel}>
          <View style={styles.marksRow}><Text style={styles.mutedText}>Positive marks gained</Text><Text style={styles.positiveValue}>+{formatScore(result.positiveMarksGained)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.marksRow}><Text style={styles.mutedText}>Negative marks deducted</Text><Text style={styles.negativeValue}>−{formatScore(result.negativeMarksDeducted)}</Text></View>
        </Panel>
      </View>

      <View style={styles.section}>
        <Heading title="Subject breakdown" subtitle="See where your preparation is strongest." />
        {result.subjectResults.map((subject) => (
          <Panel key={subject.subject} style={styles.subjectPanel}>
            <View style={styles.subjectHeader}>
              <Text style={styles.subjectName}>{subject.subject}</Text>
              <Text style={styles.subjectMarks}>{formatScore(subject.netMarks)} marks</Text>
            </View>
            <ProgressBar value={subject.accuracy} color={subject.accuracy >= 60 ? UI.green : UI.primary} />
            <View style={styles.subjectMeta}>
              <Text style={styles.subjectMetaText}>{subject.attempted} attempted</Text>
              <Text style={styles.subjectMetaText}><Text style={styles.correctText}>{subject.correct} correct</Text> · <Text style={styles.incorrectText}>{subject.incorrect} incorrect</Text></Text>
              <Text style={styles.subjectAccuracy}>{subject.accuracy.toFixed(0)}%</Text>
            </View>
          </Panel>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.answerHeader}>
          <View style={styles.answerHeaderTop}>
            <Heading title="Answer review" subtitle={`${filteredQuestions.length} questions shown`} />
            <View style={styles.langPills}>
              <Pressable
                onPress={() => setLanguage('en')}
                style={[styles.langPill, language === 'en' && styles.langPillActive]}>
                <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>EN</Text>
              </Pressable>
              <Pressable
                onPress={() => setLanguage('hi')}
                style={[styles.langPill, language === 'hi' && styles.langPillActive]}>
                <Text style={[styles.langPillText, language === 'hi' && styles.langPillTextActive]}>हिंदी</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.filterRow}>
            {FILTERS.map(({ value, label }) => (
              <Pill key={value} active={filter === value} onPress={() => setFilter(value)}>{label}</Pill>
            ))}
          </View>
        </View>
        {filteredQuestions.length ? filteredQuestions.map((question) => (
          <AnswerReview
            key={question.id}
            index={result.test.questions.indexOf(question) + 1}
            question={question}
            language={language}
            selectedOptionId={result.answers[question.id]}
            expanded={expanded[question.id] ?? true}
            onToggle={() => setExpanded({ ...expanded, [question.id]: !(expanded[question.id] ?? true) })}
          />
        )) : (
          <Panel><Text style={styles.mutedText}>No questions match this filter.</Text></Panel>
        )}
      </View>

      <View style={styles.actions}>
        <ExamButton title="Reattempt test" onPress={reattempt} />
        <ExamButton title="Back to exam hub" onPress={() => router.replace('/')} variant="outline" />
      </View>
    </ScreenFrame>
  );
}

function Metric({ label, value, note, color }: { label: string; value: string; note: string; color: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricNote}>{note}</Text>
    </View>
  );
}

function AnswerReview({
  index,
  question,
  language,
  selectedOptionId,
  expanded,
  onToggle,
}: {
  index: number;
  question: Question;
  language: Language;
  selectedOptionId?: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isHi = language === 'hi';
  const text = isHi && question.textHi ? question.textHi : question.text;
  const options = isHi && question.optionsHi && question.optionsHi.length === question.options.length ? question.optionsHi : question.options;
  const explanation = isHi && question.explanationHi ? question.explanationHi : (question.explanation || 'No explanation has been added for this question.');

  const isCorrect = selectedOptionId === question.correctOptionId;
  const stateLabel = !selectedOptionId ? (isHi ? 'छोड़ा गया' : 'SKIPPED') : isCorrect ? (isHi ? 'सही' : 'CORRECT') : (isHi ? 'गलत' : 'INCORRECT');
  const stateColor = !selectedOptionId ? UI.muted : isCorrect ? UI.green : UI.red;
  const stateBackground = !selectedOptionId ? '#EFF2F6' : isCorrect ? UI.greenSoft : UI.redSoft;
  return (
    <Panel style={styles.answerCard}>
      <View style={styles.answerTitleRow}>
        <Text style={styles.answerNumber}>Q{String(index).padStart(2, '0')}</Text>
        <View style={[styles.answerState, { backgroundColor: stateBackground }]}>
          <Text style={[styles.answerStateText, { color: stateColor }]}>{stateLabel}</Text>
        </View>
      </View>
      <FormattedContent content={text} textStyle={styles.answerQuestion} />
      <View style={styles.reviewOptions}>
        {options.map((option, optionIndex) => {
          const selected = selectedOptionId === option.id;
          const correct = question.correctOptionId === option.id;
          const highlight = correct ? styles.correctOption : selected ? styles.incorrectOption : undefined;
          return (
            <View key={option.id} style={[styles.reviewOption, highlight]}>
              <Text style={[styles.reviewLetter, correct && styles.correctLetter, selected && !correct && styles.incorrectLetter]}>
                {String.fromCharCode(65 + optionIndex)}
              </Text>
              <View style={styles.reviewOptionContent}>
                <FormattedContent content={option.text} textStyle={[styles.reviewOptionText, (correct || selected) && styles.reviewOptionEmphasis]} />
              </View>
              {selected ? <Text style={[styles.optionTag, { color: correct ? UI.green : UI.red }]}>{isHi ? 'आपका उत्तर' : 'YOUR ANSWER'}</Text> : null}
              {correct ? <Text style={[styles.optionTag, { color: UI.green }]}>{selected ? '✓' : (isHi ? 'सही उत्तर' : 'CORRECT')}</Text> : null}
            </View>
          );
        })}
      </View>
      <Pressable onPress={onToggle} style={styles.solutionToggle} accessibilityRole="button">
        <Text style={styles.solutionTitle}>{isHi ? 'हल एवं विस्तृत व्याख्या' : 'Solution & explanation'}</Text>
        <Text style={styles.solutionChevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.explanationBox}>
          <FormattedContent content={explanation} textStyle={styles.explanationText} />
        </View>
      ) : null}
    </Panel>
  );
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}m ${String(remainder).padStart(2, '0')}s`;
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 27, lineHeight: 30 },
  topLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  heroCard: { backgroundColor: UI.ink, padding: 21, borderRadius: 24, gap: 13 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  outcome: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  outcomePass: { backgroundColor: '#194C3F' },
  outcomeFail: { backgroundColor: '#63333C' },
  outcomeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  outcomeTextPass: { color: '#A8F0D0' },
  outcomeTextFail: { color: '#FFC0C6' },
  testTitle: { color: '#E8ECF7', fontSize: 14, fontWeight: '700' },
  scoreLine: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  scoreValue: { color: '#FFFFFF', fontSize: 41, fontWeight: '900', letterSpacing: -1.5 },
  scoreDivider: { color: '#7F8AA2', fontSize: 20 },
  scoreMax: { color: '#BCC5D7', fontSize: 21, fontWeight: '800' },
  scoreUnit: { color: '#9CA9C0', fontSize: 12, marginLeft: 2 },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  percentageBadge: { backgroundColor: '#313E5D', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  percentageText: { color: '#D6DCFF', fontSize: 12, fontWeight: '900' },
  timeTaken: { color: '#B1BCD0', fontSize: 11 },
  heroProgress: { marginTop: 1 },
  cutoffNote: { color: '#AAB5CB', fontSize: 10 },
  section: { gap: 13 },
  pageTitle: { color: UI.ink, fontSize: 21, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '48%', flexGrow: 1, minHeight: 115, padding: 14, borderRadius: 17, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line, gap: 4 },
  metricValue: { fontSize: 26, fontWeight: '900' },
  metricLabel: { color: UI.ink, fontSize: 12, fontWeight: '800' },
  metricNote: { color: UI.muted, fontSize: 10 },
  marksPanel: { paddingVertical: 13, gap: 10 },
  marksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: UI.line },
  positiveValue: { color: UI.green, fontWeight: '900', fontSize: 13 },
  negativeValue: { color: UI.red, fontWeight: '900', fontSize: 13 },
  mutedText: { color: UI.muted, fontSize: 13, lineHeight: 19 },
  subjectPanel: { padding: 14, gap: 10 },
  subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subjectName: { color: UI.ink, fontSize: 13, fontWeight: '900' },
  subjectMarks: { color: UI.ink, fontSize: 12, fontWeight: '800' },
  subjectMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5, flexWrap: 'wrap' },
  subjectMetaText: { color: UI.muted, fontSize: 10 },
  subjectAccuracy: { color: UI.ink, fontSize: 11, fontWeight: '900' },
  correctText: { color: UI.green, fontWeight: '800' },
  incorrectText: { color: UI.red, fontWeight: '800' },
  answerHeader: { gap: 13 },
  answerHeaderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  langPills: { flexDirection: 'row', backgroundColor: '#EAEFF8', borderRadius: 10, padding: 2 },
  langPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  langPillActive: { backgroundColor: UI.primary },
  langPillText: { fontSize: 11, fontWeight: '800', color: UI.muted },
  langPillTextActive: { color: '#fff' },
  filterRow: { flexDirection: 'row', gap: 7 },
  answerCard: { padding: 15, gap: 13 },
  answerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerNumber: { color: UI.muted, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  answerState: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  answerStateText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  answerQuestion: { color: UI.ink, fontSize: 14, fontWeight: '800', lineHeight: 21 },
  reviewOptions: { gap: 7 },
  reviewOption: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 9, borderRadius: 11, borderWidth: 1, borderColor: UI.line, backgroundColor: UI.surface },
  reviewOptionContent: { flex: 1 },
  correctOption: { backgroundColor: UI.greenSoft, borderColor: '#A9DFC8' },
  incorrectOption: { backgroundColor: UI.redSoft, borderColor: '#F0B9BE' },
  reviewLetter: { width: 25, height: 25, borderRadius: 8, backgroundColor: '#F0F2F6', textAlign: 'center', textAlignVertical: 'center', color: UI.muted, fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingTop: 6 },
  correctLetter: { backgroundColor: UI.green, color: '#fff' },
  incorrectLetter: { backgroundColor: UI.red, color: '#fff' },
  reviewOptionText: { flex: 1, color: UI.ink, fontSize: 12, lineHeight: 17 },
  reviewOptionEmphasis: { fontWeight: '700' },
  optionTag: { fontSize: 8, fontWeight: '900' },
  solutionToggle: { minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: UI.line, paddingTop: 8 },
  solutionTitle: { color: UI.primary, fontSize: 12, fontWeight: '900' },
  solutionChevron: { color: UI.primary, fontSize: 20, fontWeight: '700' },
  explanationBox: { backgroundColor: '#F5F7FB', borderRadius: 12, padding: 12 },
  explanationText: { color: UI.muted, fontSize: 12, lineHeight: 19 },
  actions: { gap: 9 },
});
