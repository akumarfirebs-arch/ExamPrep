import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ExamButton, Panel, ScreenFrame, showNotice, TypeBadge, UI } from '@/components/exam-ui';
import { FormattedContent } from '@/components/formatted-content';
import { InstructionPage } from '@/components/instruction-page';
import { TestSecurityGuard } from '@/components/test-security-guard';
import { getTests, getActiveAttempt, saveActiveAttempt, clearActiveAttempt, saveResult } from '@/lib/examStorage';
import { scoreTest } from '@/lib/scoreTest';
import type { ActiveAttempt, Language, Question, QuestionStatus, TestConfig } from '@/types/exam';

export default function ExamScreen() {
  const { testId: routeTestId } = useLocalSearchParams<{ testId: string }>();
  const testId = Array.isArray(routeTestId) ? routeTestId[0] : routeTestId;
  const [test, setTest] = useState<TestConfig | null>(null);
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const completed = useRef(false);
  const attemptRef = useRef<ActiveAttempt | null>(null);
  const testRef = useRef<TestConfig | null>(null);

  useEffect(() => {
    attemptRef.current = attempt;
    testRef.current = test;
  }, [attempt, test]);

  useEffect(() => {
    let active = true;
    completed.current = false;
    async function load() {
      try {
        const [tests, savedAttempt] = await Promise.all([getTests(), testId ? getActiveAttempt(testId) : null]);
        const selectedTest = tests.find((item) => item.id === testId);
        if (!selectedTest) {
          if (active) setLoading(false);
          return;
        }
        const firstQuestionId = selectedTest.questions[0]?.id;
        const nextAttempt: ActiveAttempt =
          savedAttempt ??
          {
            testId: selectedTest.id,
            answers: {},
            visitedQuestionIds: firstQuestionId ? [firstQuestionId] : [],
            reviewQuestionIds: [],
            startedAt: Date.now(),
            deadlineAt:
              selectedTest.timed && selectedTest.durationMinutes
                ? Date.now() + selectedTest.durationMinutes * 60 * 1000
                : undefined,
            language: 'en',
            instructionAccepted: false,
          };
        if (firstQuestionId && !nextAttempt.visitedQuestionIds.includes(firstQuestionId)) {
          nextAttempt.visitedQuestionIds = [...nextAttempt.visitedQuestionIds, firstQuestionId];
        }
        if (!active) return;
        setTest(selectedTest);
        setAttempt(nextAttempt);
        if (nextAttempt.language) setLanguage(nextAttempt.language);
        setSecondsLeft(nextAttempt.deadlineAt ? Math.max(0, Math.ceil((nextAttempt.deadlineAt - Date.now()) / 1000)) : null);
      } catch {
        showNotice('Could not open this test', 'Your saved practice data could not be read.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [testId]);

  const currentQuestion = test?.questions[questionIndex];
  const submit = useCallback(async () => {
    const currentTest = testRef.current;
    const currentAttempt = attemptRef.current;
    if (!currentTest || !currentAttempt || completed.current) return;
    completed.current = true;
    try {
      const result = scoreTest(currentTest, currentAttempt);
      await saveResult(result);
      await clearActiveAttempt(currentTest.id);
      setSubmitOpen(false);
      router.replace(`/result/${result.id}`);
    } catch {
      completed.current = false;
      showNotice('Could not submit test', 'Your scorecard could not be saved. Please try again.');
    }
  }, []);

  useEffect(() => {
    if (!test?.timed || !attempt?.deadlineAt || !attempt?.instructionAccepted) return;
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((attempt.deadlineAt! - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0) {
        clearInterval(timer);
        void submit();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [test?.timed, attempt?.deadlineAt, attempt?.instructionAccepted, submit]);

  useEffect(() => {
    if (!attempt || completed.current) return;
    const timeout = setTimeout(() => {
      void saveActiveAttempt(attempt).catch(() => {
        showNotice('Progress not saved', 'Check your device storage and try again.');
      });
    }, 250);
    return () => clearTimeout(timeout);
  }, [attempt]);

  const answeredCount = useMemo(() => Object.keys(attempt?.answers ?? {}).length, [attempt?.answers]);
  const timeLabel = secondsLeft === null ? 'Practice mode' : formatTime(secondsLeft);
  const goTo = (index: number) => {
    if (!test) return;
    const nextIndex = Math.max(0, Math.min(index, test.questions.length - 1));
    setQuestionIndex(nextIndex);
    setPaletteOpen(false);
    const target = test.questions[nextIndex];
    if (target) {
      setAttempt((prev) => {
        if (!prev || prev.visitedQuestionIds.includes(target.id)) return prev;
        return {
          ...prev,
          visitedQuestionIds: [...prev.visitedQuestionIds, target.id],
        };
      });
    }
  };
  const setAnswer = (optionId: string) => {
    if (!attempt || !currentQuestion) return;
    setAttempt({ ...attempt, answers: { ...attempt.answers, [currentQuestion.id]: optionId } });
  };
  const clearAnswer = () => {
    if (!attempt || !currentQuestion) return;
    const answers = { ...attempt.answers };
    delete answers[currentQuestion.id];
    setAttempt({ ...attempt, answers });
  };
  const reviewAndNext = () => {
    if (!attempt || !currentQuestion || !test) return;
    const isLast = questionIndex >= test.questions.length - 1;
    setAttempt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reviewQuestionIds: prev.reviewQuestionIds.includes(currentQuestion.id)
          ? prev.reviewQuestionIds
          : [...prev.reviewQuestionIds, currentQuestion.id],
      };
    });
    if (isLast) {
      setSubmitOpen(true);
    } else {
      goTo(questionIndex + 1);
    }
  };
  const handleSaveAndNext = () => {
    if (!test) return;
    if (questionIndex >= test.questions.length - 1) {
      setSubmitOpen(true);
    } else {
      goTo(questionIndex + 1);
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (attempt) {
      setAttempt({ ...attempt, language: lang });
    }
  };

  const handleBeginExam = () => {
    if (!attempt) return;
    const updated: ActiveAttempt = {
      ...attempt,
      instructionAccepted: true,
      startedAt: Date.now(),
      deadlineAt:
        test?.timed && test?.durationMinutes
          ? Date.now() + test.durationMinutes * 60 * 1000
          : undefined,
    };
    setAttempt(updated);
    if (updated.deadlineAt) {
      setSecondsLeft(Math.max(0, Math.ceil((updated.deadlineAt - Date.now()) / 1000)));
    }
  };

  if (loading) {
    return <ScreenFrame><Panel><Text style={styles.infoText}>Opening your saved test…</Text></Panel></ScreenFrame>;
  }
  if (!test || !attempt || !currentQuestion) {
    return (
      <ScreenFrame>
        <Panel><Text style={styles.missingTitle}>Test not found</Text><Text style={styles.infoText}>This test may have been removed from your library.</Text><ExamButton title="Back to exam hub" onPress={() => router.replace('/')} /></Panel>
      </ScreenFrame>
    );
  }

  // Show Pre-Exam Instructions Page if not accepted yet
  if (!attempt.instructionAccepted) {
    return (
      <InstructionPage
        test={test}
        selectedLanguage={language}
        onLanguageChange={handleLanguageChange}
        onReadyToBegin={handleBeginExam}
        onBack={() => router.back()}
      />
    );
  }

  const isHi = language === 'hi';
  const displayQuestionText = isHi && currentQuestion.textHi ? currentQuestion.textHi : currentQuestion.text;
  const displayOptions = isHi && currentQuestion.optionsHi && currentQuestion.optionsHi.length === currentQuestion.options.length
    ? currentQuestion.optionsHi
    : currentQuestion.options;
  const displaySubject = isHi && currentQuestion.subjectHi ? currentQuestion.subjectHi : (currentQuestion.subject ?? test.subject);

  const statusOf = (question: Question): QuestionStatus => {
    if (attempt.reviewQuestionIds.includes(question.id)) return 'REVIEW';
    if (attempt.answers[question.id]) return 'ANSWERED';
    if (attempt.visitedQuestionIds.includes(question.id)) return 'UNANSWERED';
    return 'NOT_VISITED';
  };
  const statusCounts = {
    answered: test.questions.filter((question) => statusOf(question) === 'ANSWERED').length,
    unanswered: test.questions.filter((question) => statusOf(question) === 'UNANSWERED').length,
    review: test.questions.filter((question) => statusOf(question) === 'REVIEW').length,
    notVisited: test.questions.filter((question) => statusOf(question) === 'NOT_VISITED').length,
  };

  return (
    <TestSecurityGuard onSecurityWarning={(msg) => showNotice('Security Notice', msg)}>
      <ScreenFrame scroll={false}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.topTitle}>
            <Text numberOfLines={1} style={styles.examName}>{isHi && test.titleHi ? test.titleHi : test.title}</Text>
            <Text style={styles.examMeta}>{test.questions.length} questions · {test.examId.toUpperCase()}</Text>
          </View>

          {/* Testbook style Language Toggle */}
          <View style={styles.langPills}>
            <Pressable
              onPress={() => handleLanguageChange('en')}
              style={[styles.langPill, language === 'en' && styles.langPillActive]}>
              <Text style={[styles.langPillText, language === 'en' && styles.langPillTextActive]}>EN</Text>
            </Pressable>
            <Pressable
              onPress={() => handleLanguageChange('hi')}
              style={[styles.langPill, language === 'hi' && styles.langPillActive]}>
              <Text style={[styles.langPillText, language === 'hi' && styles.langPillTextActive]}>हिंदी</Text>
            </Pressable>
          </View>

          <Pressable onPress={() => setPaletteOpen(true)} style={styles.paletteButton} accessibilityRole="button">
            <Text style={styles.paletteButtonText}>Grid</Text>
          </Pressable>
        </View>

        <View style={styles.examStatus}>
          <View style={styles.examBadges}>
            <View style={styles.examBadge}><Text style={styles.examBadgeText}>{test.examId.toUpperCase()}</Text></View>
            <TypeBadge type={test.testType} />
          </View>
          <View style={[styles.timer, secondsLeft !== null && secondsLeft <= 300 && styles.timerUrgent]}>
            <Text style={[styles.timerIcon, secondsLeft !== null && secondsLeft <= 300 && styles.timerTextUrgent]}>
              {secondsLeft === null ? '∞' : '◷'}
            </Text>
            <Text style={[styles.timerText, secondsLeft !== null && secondsLeft <= 300 && styles.timerTextUrgent]}>{timeLabel}</Text>
          </View>
        </View>

        <ScrollView style={styles.questionScroll} contentContainerStyle={styles.questionContent} showsVerticalScrollIndicator={false}>
          <View style={styles.questionHeader}>
            <View>
              <Text style={styles.questionEyebrow}>QUESTION {String(questionIndex + 1).padStart(2, '0')} <Text style={styles.questionOf}>/ {String(test.questions.length).padStart(2, '0')}</Text></Text>
              <Text style={styles.questionTag}>
                {[displaySubject, currentQuestion.year ?? test.year, currentQuestion.date ?? test.date, currentQuestion.dayNumber ? `Day ${currentQuestion.dayNumber}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'General awareness'}
              </Text>
            </View>
            <View style={styles.markingBadge}>
              <Text style={styles.markingPositive}>+{currentQuestion.positiveMarks ?? test.positiveMarks}</Text>
              <Text style={styles.markingDivider}> / </Text>
              <Text style={styles.markingNegative}>−{currentQuestion.negativeMarks ?? test.negativeMarks}</Text>
            </View>
          </View>

          <Panel style={styles.questionPanel}>
            {/* Formatted Content supporting LaTeX and Tables */}
            <FormattedContent content={displayQuestionText} textStyle={styles.questionText} />

            <View style={styles.options}>
              {displayOptions.map((option, index) => {
                const selected = attempt.answers[currentQuestion.id] === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setAnswer(option.id)}
                    style={[styles.option, selected && styles.optionSelected]}>
                    <View style={[styles.optionLetter, selected && styles.optionLetterSelected]}>
                      <Text style={[styles.optionLetterText, selected && styles.optionLetterTextSelected]}>
                        {String.fromCharCode(65 + index)}
                      </Text>
                    </View>
                    <View style={styles.optionContent}>
                      <FormattedContent content={option.text} textStyle={[styles.optionText, selected && styles.optionTextSelected]} />
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]} />
                  </Pressable>
                );
              })}
            </View>
          </Panel>

          <View style={styles.progressRow}>
            <Text style={styles.progressCaption}>{answeredCount} of {test.questions.length} answered</Text>
            <Text style={styles.progressCaption}>Question {questionIndex + 1} of {test.questions.length}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${((questionIndex + 1) / test.questions.length) * 100}%` }]} /></View>
        </ScrollView>

        <View style={styles.actionBar}>
          <View style={styles.actionRow}>
            <ExamButton title="Clear" onPress={clearAnswer} variant="outline" compact style={styles.actionSmall} />
            <ExamButton title="Review & Next" onPress={reviewAndNext} variant="secondary" compact style={styles.actionReview} />
            <ExamButton
              title={questionIndex >= test.questions.length - 1 ? 'Submit' : 'Save & Next'}
              onPress={handleSaveAndNext}
              compact
              style={styles.actionNext}
            />
          </View>
        </View>

        <Modal visible={paletteOpen} animationType="slide" transparent onRequestClose={() => setPaletteOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.paletteSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View><Text style={styles.sheetTitle}>Question palette</Text><Text style={styles.sheetSubtitle}>Jump to any question</Text></View>
                <Pressable onPress={() => setPaletteOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
              </View>
              <View style={styles.legend}>
                <Legend color={UI.green} label="Answered" />
                <Legend color={UI.red} label="Unanswered" />
                <Legend color={UI.purple} label="Review" />
                <Legend color="#DCE2EB" label="Not visited" />
              </View>
              <View style={styles.paletteGrid}>
                {test.questions.map((question, index) => {
                  const status = statusOf(question);
                  return (
                    <Pressable
                      key={question.id}
                      onPress={() => goTo(index)}
                      style={[
                        styles.paletteNumber,
                        status === 'ANSWERED' && styles.paletteAnswered,
                        status === 'UNANSWERED' && styles.paletteUnanswered,
                        status === 'REVIEW' && styles.paletteReview,
                        index === questionIndex && styles.paletteCurrent,
                      ]}>
                      <Text style={[styles.paletteNumberText, status !== 'NOT_VISITED' && styles.paletteNumberTextActive]}>{index + 1}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.paletteSummary}>
                <Text style={styles.summaryText}>{statusCounts.answered} answered</Text>
                <Text style={styles.summaryText}>{statusCounts.review} for review</Text>
                <Text style={styles.summaryText}>{statusCounts.notVisited + statusCounts.unanswered} left</Text>
              </View>
              <ExamButton title="Submit test" onPress={() => { setPaletteOpen(false); setSubmitOpen(true); }} />
            </View>
          </View>
        </Modal>

        <Modal visible={submitOpen} animationType="fade" transparent onRequestClose={() => setSubmitOpen(false)}>
          <View style={styles.confirmBackdrop}>
            <Panel style={styles.confirmCard}>
              <Text style={styles.confirmTitle}>Submit your test?</Text>
              <Text style={styles.infoText}>You have answered {answeredCount} of {test.questions.length} questions. You can review your scorecard and explanations after submission.</Text>
              <View style={styles.confirmActions}>
                <ExamButton title="Keep practicing" onPress={() => setSubmitOpen(false)} variant="outline" style={styles.confirmButton} />
                <ExamButton title="Submit test" onPress={() => void submit()} style={styles.confirmButton} />
              </View>
            </Panel>
          </View>
        </Modal>
      </ScreenFrame>
    </TestSecurityGuard>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>;
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 28, lineHeight: 31 },
  topTitle: { flex: 1, gap: 3 },
  examName: { color: UI.ink, fontSize: 14, fontWeight: '900' },
  examMeta: { color: UI.muted, fontSize: 11 },
  langPills: { flexDirection: 'row', backgroundColor: '#EAEFF8', borderRadius: 10, padding: 2 },
  langPill: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  langPillActive: { backgroundColor: UI.primary },
  langPillText: { fontSize: 11, fontWeight: '800', color: UI.muted },
  langPillTextActive: { color: '#fff' },
  paletteButton: { height: 44, paddingHorizontal: 13, justifyContent: 'center', borderRadius: 14, backgroundColor: UI.primarySoft },
  paletteButtonText: { color: UI.primary, fontSize: 12, fontWeight: '900' },
  examStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  examBadges: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  examBadge: { minHeight: 32, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 10, backgroundColor: UI.ink },
  examBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  timer: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 12, backgroundColor: UI.greenSoft },
  timerUrgent: { backgroundColor: UI.redSoft },
  timerIcon: { color: UI.green, fontWeight: '900', fontSize: 15 },
  timerText: { color: UI.green, fontSize: 12, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerTextUrgent: { color: UI.red },
  questionScroll: { flex: 1 },
  questionContent: { paddingBottom: 15, gap: 15 },
  questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questionEyebrow: { color: UI.ink, fontSize: 11, letterSpacing: 0.8, fontWeight: '900' },
  questionOf: { color: UI.muted },
  questionTag: { color: UI.muted, fontSize: 12, marginTop: 5 },
  markingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  markingPositive: { color: UI.green, fontSize: 11, fontWeight: '900' },
  markingNegative: { color: UI.red, fontSize: 11, fontWeight: '900' },
  markingDivider: { color: UI.muted, fontSize: 10 },
  questionPanel: { padding: 18, gap: 20 },
  questionText: { color: UI.ink, fontSize: 17, fontWeight: '800', lineHeight: 26 },
  options: { gap: 10 },
  option: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: UI.line, borderRadius: 15, backgroundColor: UI.surface },
  optionSelected: { borderColor: UI.primary, backgroundColor: UI.primarySoft },
  optionLetter: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#F1F3F7', alignItems: 'center', justifyContent: 'center' },
  optionLetterSelected: { backgroundColor: UI.primary },
  optionLetterText: { color: UI.muted, fontWeight: '900', fontSize: 12 },
  optionLetterTextSelected: { color: '#fff' },
  optionContent: { flex: 1 },
  optionText: { color: UI.ink, fontSize: 14, lineHeight: 20 },
  optionTextSelected: { color: UI.primary, fontWeight: '700' },
  radio: { width: 19, height: 19, borderRadius: 10, borderWidth: 1.5, borderColor: '#CAD2E0' },
  radioSelected: { borderWidth: 5, borderColor: UI.primary },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressCaption: { color: UI.muted, fontSize: 11, fontWeight: '700' },
  progressTrack: { height: 5, borderRadius: 4, backgroundColor: '#E8ECF3' },
  progressFill: { height: 5, borderRadius: 4, backgroundColor: UI.primary },
  actionBar: { paddingTop: 10, paddingBottom: 6, backgroundColor: UI.background },
  actionRow: { flexDirection: 'row', gap: 7 },
  actionSmall: { flex: 0.75 },
  actionReview: { flex: 1.2 },
  actionNext: { flex: 1.2 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 26, 44, 0.45)' },
  paletteSheet: { backgroundColor: UI.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 21, paddingBottom: 30, gap: 19 },
  sheetHandle: { width: 38, height: 4, borderRadius: 3, backgroundColor: '#CBD2DE', alignSelf: 'center', marginTop: -7 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetTitle: { color: UI.ink, fontSize: 20, fontWeight: '900' },
  sheetSubtitle: { color: UI.muted, fontSize: 12, marginTop: 3 },
  closeButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: UI.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: UI.ink, fontSize: 24, lineHeight: 26 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 13 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: UI.muted, fontSize: 10, fontWeight: '700' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paletteNumber: { width: '17%', maxWidth: 56, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#E7EBF1', borderWidth: 2, borderColor: 'transparent' },
  paletteAnswered: { backgroundColor: UI.green },
  paletteUnanswered: { backgroundColor: UI.red },
  paletteReview: { backgroundColor: UI.purple },
  paletteCurrent: { borderColor: UI.ink },
  paletteNumberText: { color: UI.muted, fontSize: 13, fontWeight: '900' },
  paletteNumberTextActive: { color: '#fff' },
  paletteSummary: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryText: { color: UI.muted, fontSize: 11, fontWeight: '700' },
  confirmBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 23, backgroundColor: 'rgba(17, 26, 44, 0.48)' },
  confirmCard: { padding: 21 },
  confirmTitle: { color: UI.ink, fontSize: 20, fontWeight: '900' },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  confirmButton: { flex: 1 },
  infoText: { color: UI.muted, fontSize: 14, lineHeight: 21 },
  missingTitle: { color: UI.ink, fontSize: 20, fontWeight: '900' },
});
