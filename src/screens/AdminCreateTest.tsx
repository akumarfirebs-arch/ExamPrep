import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { ExamButton, Heading, Panel, Pill, ScreenFrame, showNotice, TextField, TypeBadge, UI } from '@/components/exam-ui';
import { EXAMS } from '@/data/exams';
import { useAuth } from '@/lib/authContext';
import { saveTest } from '@/lib/examStorage';
import type { Question, TestConfig, TestType } from '@/types/exam';

const TYPES: { value: TestType; label: string }[] = [
  { value: 'MOCK', label: 'Mock' },
  { value: 'SUBJECT_WISE', label: 'Subject-wise' },
  { value: 'PYQ', label: 'PYQ' },
  { value: 'DPP', label: 'DPP' },
];
const LETTERS = ['A', 'B', 'C', 'D'];

export default function AdminCreateTest() {
  const { user, isAdmin } = useAuth();
  const [testId] = useState(() => `custom-${Date.now()}`);
  const [examId, setExamId] = useState(EXAMS[0].id);
  const [subExamId, setSubExamId] = useState<string | undefined>(EXAMS[0].subExams?.[0]?.id);
  const [testType, setTestType] = useState<TestType>('MOCK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');
  const [year, setYear] = useState('');
  const [date, setDate] = useState('');
  const [dayNumber, setDayNumber] = useState('');
  const [shift, setShift] = useState('');
  const [paper, setPaper] = useState('');
  const [section, setSection] = useState('');
  const [duration, setDuration] = useState('60');
  const [timed, setTimed] = useState(true);
  const [positiveMarks, setPositiveMarks] = useState('2');
  const [negativeMarks, setNegativeMarks] = useState('0.66');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOptionId, setCorrectOptionId] = useState('A');
  const [questionSubject, setQuestionSubject] = useState('');
  const [questionYear, setQuestionYear] = useState('');
  const [explanation, setExplanation] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const selectedExam = EXAMS.find((exam) => exam.id === examId) ?? EXAMS[0];

  const test = useMemo<TestConfig>(() => ({
    id: testId,
    examId,
    subExamId,
    testType,
    title: title.trim() || 'Untitled practice test',
    description: description.trim(),
    subject: subject.trim() || undefined,
    year: testType === 'PYQ' && year ? Number(year) : undefined,
    date: testType === 'DPP' ? date.trim() || undefined : undefined,
    dayNumber: testType === 'DPP' && dayNumber ? Number(dayNumber) : undefined,
    shift: testType === 'PYQ' ? shift.trim() || undefined : undefined,
    paper: testType === 'PYQ' ? paper.trim() || undefined : undefined,
    section: testType === 'MOCK' ? section.trim() || undefined : undefined,
    durationMinutes: timed && duration ? Number(duration) : undefined,
    timed,
    positiveMarks: Number(positiveMarks) || 0,
    negativeMarks: Number(negativeMarks) || 0,
    questions: questions.map((question) => ({ ...question, examId, subExamId, testType })),
    isCustom: true,
  }), [testId, examId, subExamId, testType, title, description, subject, year, date, dayNumber, shift, paper, section, timed, duration, positiveMarks, negativeMarks, questions]);

  const resetQuestionForm = () => {
    setEditingId(null);
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectOptionId('A');
    setQuestionSubject('');
    setQuestionYear('');
    setExplanation('');
  };

  const addOrUpdateQuestion = () => {
    if (!questionText.trim()) {
      showNotice('Add a question', 'Enter the question statement before adding it.');
      return;
    }
    if (options.some((option) => !option.trim())) {
      showNotice('Complete all four options', 'Each question needs an answer option from A to D.');
      return;
    }
    const positive = Number(positiveMarks);
    const negative = Number(negativeMarks);
    if (!Number.isFinite(positive) || positive <= 0 || !Number.isFinite(negative) || negative < 0) {
      showNotice('Check the marking rules', 'Positive marks must be greater than zero and negative marks cannot be below zero.');
      return;
    }
    if (questionYear && (!Number.isInteger(Number(questionYear)) || Number(questionYear) < 1)) {
      showNotice('Check the question year', 'Enter a whole-number year.');
      return;
    }
    if (testType === 'DPP' && dayNumber && (!Number.isInteger(Number(dayNumber)) || Number(dayNumber) < 1)) {
      showNotice('Check the day number', 'Enter a positive whole-number day.');
      return;
    }
    const updatedQuestion: Question = {
      id: editingId ?? `${testId}-q-${Date.now()}`,
      examId,
      testType,
      subject: questionSubject.trim() || (testType === 'SUBJECT_WISE' ? subject.trim() || undefined : undefined),
      year: questionYear ? Number(questionYear) : testType === 'PYQ' && year ? Number(year) : undefined,
      date: testType === 'DPP' ? date.trim() || undefined : undefined,
      dayNumber: testType === 'DPP' && dayNumber ? Number(dayNumber) : undefined,
      text: questionText.trim(),
      options: options.map((text, index) => ({ id: LETTERS[index], text: text.trim() })),
      correctOptionId,
      positiveMarks: Number(positiveMarks),
      negativeMarks: Number(negativeMarks),
      explanation: explanation.trim(),
    };
    setQuestions((current) =>
      editingId ? current.map((question) => question.id === editingId ? updatedQuestion : question) : [...current, updatedQuestion],
    );
    resetQuestionForm();
    setSaved(false);
  };

  const editQuestion = (question: Question) => {
    setEditingId(question.id);
    setQuestionText(question.text);
    setOptions(LETTERS.map((letter) => question.options.find((option) => option.id === letter)?.text ?? ''));
    setCorrectOptionId(question.correctOptionId);
    setQuestionSubject(question.subject ?? '');
    setQuestionYear(question.year ? String(question.year) : '');
    setExplanation(question.explanation);
  };

  const persist = async (returnToLibrary: boolean) => {
    if (!title.trim()) {
      showNotice('Add a test title', 'Give this test a name before saving it.');
      return;
    }
    if (testType === 'SUBJECT_WISE' && !subject.trim()) {
      showNotice('Add a subject', 'Subject-wise tests need a subject, for example History or Quant.');
      return;
    }
    if (testType === 'PYQ' && (!year || !Number.isInteger(Number(year)) || Number(year) < 1)) {
      showNotice('Add a valid year', 'Previous-year tests need a whole-number exam year.');
      return;
    }
    if (testType === 'DPP' && dayNumber && (!Number.isInteger(Number(dayNumber)) || Number(dayNumber) < 1)) {
      showNotice('Check the day number', 'Enter a positive whole-number day.');
      return;
    }
    if (testType === 'DPP' && !date.trim() && !dayNumber) {
      showNotice('Add a DPP date or day', 'Daily practice sets need a date or a day number.');
      return;
    }
    if (!questions.length) {
      showNotice('Add at least one question', 'Your test needs at least one complete question.');
      return;
    }
    if (timed && (!duration || Number(duration) <= 0)) {
      showNotice('Check the duration', 'Enter a positive duration in minutes.');
      return;
    }
    if (timed && (!Number.isInteger(Number(duration)) || !Number.isFinite(Number(duration)))) {
      showNotice('Check the duration', 'Enter a whole number of minutes.');
      return;
    }
    if (!Number.isFinite(Number(positiveMarks)) || Number(positiveMarks) <= 0 || !Number.isFinite(Number(negativeMarks)) || Number(negativeMarks) < 0) {
      showNotice('Check the marking rules', 'Positive marks must be greater than zero and negative marks cannot be below zero.');
      return;
    }
    try {
      await saveTest(test);
      setSaved(true);
      if (returnToLibrary) router.replace('/');
      else showNotice('Test saved', 'Your test is now available in the exam library.');
    } catch {
      showNotice('Could not save test', 'Please check device storage and try again.');
    }
  };

  if (!isAdmin) {
    return (
      <ScreenFrame>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.topCopy}>
            <Text style={styles.topEyebrow}>ACCESS CONTROL</Text>
            <Text style={styles.topTitle}>Admin Portal</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
        <Panel style={styles.unauthorizedCard}>
          <View style={styles.unauthorizedBadge}>
            <Text style={styles.unauthorizedBadgeText}>ADMIN PERMISSION REQUIRED</Text>
          </View>
          <Text style={styles.unauthorizedTitle}>Restricted to Educators & Admins</Text>
          <Text style={styles.unauthorizedText}>
            You are currently signed in as {user ? `${user.name} (${user.role.toUpperCase()})` : 'a Guest'}. Only administrator accounts are authorized to build, edit, and publish tests.
          </Text>
          <ExamButton
            title="Switch / Sign in as Admin"
            onPress={() => router.push('/login')}
          />
          <ExamButton
            title="Back to Exam Hub"
            onPress={() => router.replace('/')}
            variant="outline"
          />
        </Panel>
      </ScreenFrame>
    );
  }

  return (
    <ScreenFrame>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button"><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.topCopy}><Text style={styles.topEyebrow}>TEST DESIGNER</Text><Text style={styles.topTitle}>Build a practice set</Text></View>
          <View style={styles.draftBadge}><Text style={styles.draftBadgeText}>{questions.length} Q</Text></View>
        </View>

        <View style={styles.section}>
          <Heading title="Test details" subtitle="Set the exam and rules for this practice set." />
          <Panel>
            <Text style={styles.fieldLabel}>TARGET EXAM</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {EXAMS.map((exam) => (
                <Pill
                  key={exam.id}
                  active={examId === exam.id}
                  onPress={() => {
                    setExamId(exam.id);
                    setSubExamId(exam.subExams?.[0]?.id);
                    setSaved(false);
                  }}>
                  {exam.shortName}
                </Pill>
              ))}
            </ScrollView>

            {selectedExam.subExams && selectedExam.subExams.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>SUB-EXAM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {selectedExam.subExams.map((sub) => (
                    <Pill
                      key={sub.id}
                      active={subExamId === sub.id}
                      onPress={() => {
                        setSubExamId(sub.id);
                        setSaved(false);
                      }}>
                      {sub.shortName}
                    </Pill>
                  ))}
                </ScrollView>
              </>
            )}

            <TextField label="Test title" value={title} onChangeText={(value) => { setTitle(value); setSaved(false); }} placeholder="e.g. Modern History · Set 01" />
            <TextField label="Description" value={description} onChangeText={setDescription} placeholder="What should learners expect?" multiline />

            <Text style={styles.fieldLabel}>TEST TYPE</Text>
            <View style={styles.typeRow}>
              {TYPES.map((type) => (
                <Pill
                  key={type.value}
                  active={testType === type.value}
                  onPress={() => {
                    setTestType(type.value);
                    setTimed(type.value !== 'DPP');
                    setSaved(false);
                  }}>
                  {type.label}
                </Pill>
              ))}
            </View>

            <TextField
              label={`Subject${testType === 'SUBJECT_WISE' ? ' (required)' : ' (optional)'}`}
              value={subject}
              onChangeText={setSubject}
              placeholder="History, Polity, Reasoning…"
            />

            {testType === 'PYQ' ? (
              <>
                <TextField label="Exam year" value={year} onChangeText={setYear} placeholder="2024" keyboardType="numeric" />
                <View style={styles.fieldRow}>
                  <TextField label="Shift (optional)" value={shift} onChangeText={setShift} placeholder="Shift 1" />
                  <TextField label="Paper (optional)" value={paper} onChangeText={setPaper} placeholder="Paper I" />
                </View>
              </>
            ) : null}
            {testType === 'DPP' ? (
              <View style={styles.fieldRow}>
                <TextField label="Date (optional)" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
                <TextField label="Day number (optional)" value={dayNumber} onChangeText={setDayNumber} placeholder="12" keyboardType="numeric" />
              </View>
            ) : null}
            {testType === 'MOCK' ? <TextField label="Section badge (optional)" value={section} onChangeText={setSection} placeholder="General Studies · Paper I" /> : null}

            <View style={styles.fieldRow}>
              <TextField label="Positive marks" value={positiveMarks} onChangeText={setPositiveMarks} placeholder="2" keyboardType="decimal-pad" />
              <TextField label="Negative marks" value={negativeMarks} onChangeText={setNegativeMarks} placeholder="0.66" keyboardType="decimal-pad" />
            </View>
            <Pressable onPress={() => { setTimed(!timed); setSaved(false); }} style={styles.timerToggle} accessibilityRole="switch" accessibilityState={{ checked: timed }}>
              <View style={[styles.toggle, timed && styles.toggleOn]}><View style={[styles.toggleKnob, timed && styles.toggleKnobOn]} /></View>
              <View style={styles.toggleCopy}><Text style={styles.toggleTitle}>Timed test</Text><Text style={styles.toggleHint}>{timed ? 'Countdown timer enabled' : 'Untimed practice mode'}</Text></View>
              <Text style={styles.toggleValue}>{timed ? 'ON' : 'OFF'}</Text>
            </Pressable>
            {timed ? <TextField label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="60" keyboardType="numeric" /> : null}
          </Panel>
        </View>

        <View style={styles.section}>
          <View style={styles.builderHeading}>
            <Heading title={editingId ? 'Edit question' : 'Question builder'} subtitle="Write the question, add four options, then choose its answer." />
            <Text style={styles.questionCount}>{questions.length} ADDED</Text>
          </View>
          <Panel>
            <TextField label="Question statement" value={questionText} onChangeText={setQuestionText} placeholder="Enter the question…" multiline />
            <View style={styles.optionsHeader}><Text style={styles.fieldLabel}>ANSWER OPTIONS</Text><Text style={styles.fieldHint}>Tap the letter for the correct answer</Text></View>
            {options.map((option, index) => (
              <View key={LETTERS[index]} style={styles.optionInputRow}>
                <Pressable
                  onPress={() => setCorrectOptionId(LETTERS[index])}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: correctOptionId === LETTERS[index] }}
                  style={[styles.answerToggle, correctOptionId === LETTERS[index] && styles.answerToggleSelected]}>
                  <Text style={[styles.answerLetter, correctOptionId === LETTERS[index] && styles.answerLetterSelected]}>{LETTERS[index]}</Text>
                  {correctOptionId === LETTERS[index] ? <Text style={styles.checkmark}>✓</Text> : null}
                </Pressable>
                <TextField label={`Option ${LETTERS[index]}`} value={option} onChangeText={(value) => setOptions((current) => current.map((item, itemIndex) => itemIndex === index ? value : item))} placeholder={`Enter option ${LETTERS[index]}`} />
              </View>
            ))}
            <View style={styles.fieldRow}>
              <TextField label="Question subject (optional)" value={questionSubject} onChangeText={setQuestionSubject} placeholder={subject || 'General'} />
              <TextField label="Question year (optional)" value={questionYear} onChangeText={setQuestionYear} placeholder={year || '2024'} keyboardType="numeric" />
            </View>
            <TextField label="Detailed explanation" value={explanation} onChangeText={setExplanation} placeholder="Explain why this answer is correct…" multiline />
            <View style={styles.builderActions}>
              {editingId ? <ExamButton title="Cancel edit" onPress={resetQuestionForm} variant="outline" style={styles.flexButton} /> : null}
              <ExamButton title={editingId ? 'Update question' : 'Add question'} onPress={addOrUpdateQuestion} style={styles.flexButton} />
            </View>
          </Panel>
        </View>

        {questions.length > 0 ? (
          <View style={styles.section}>
            <Heading title="Question list" subtitle="Edit or remove items before publishing." />
            {questions.map((question, index) => (
              <Panel key={question.id} style={styles.questionListItem}>
                <View style={styles.listNumber}><Text style={styles.listNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <View style={styles.listCopy}>
                  <Text numberOfLines={2} style={styles.listQuestion}>{question.text}</Text>
                  <Text style={styles.listMeta}>Answer {question.correctOptionId} · {question.subject ?? 'General'}</Text>
                </View>
                <View style={styles.listActions}>
                  <Pressable onPress={() => editQuestion(question)} style={styles.miniAction}><Text style={styles.editText}>Edit</Text></Pressable>
                  <Pressable
                    onPress={() => {
                      setQuestions((current) => current.filter((item) => item.id !== question.id));
                      if (editingId === question.id) resetQuestionForm();
                      setSaved(false);
                    }}
                    style={styles.miniAction}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              </Panel>
            ))}
          </View>
        ) : null}

        <Panel style={styles.previewPanel}>
          <View style={styles.previewHead}>
            <View><Text style={styles.previewEyebrow}>LIVE PREVIEW</Text><Text style={styles.previewTitle}>{title || 'Your test title'}</Text></View>
            <TypeBadge type={testType} />
          </View>
          <Text style={styles.previewInfo}>{selectedExam.name} · {subject || 'All subjects'} · {timed ? `${duration || '—'} min` : 'Untimed'} · +{positiveMarks} / −{negativeMarks}</Text>
          <Text style={styles.previewInfo}>{questions.length} questions · {testType === 'PYQ' ? year || 'Year not set' : testType === 'DPP' ? date || (dayNumber ? `Day ${dayNumber}` : 'Date not set') : 'Ready to build'}</Text>
          <View style={styles.saveActions}>
            <ExamButton title={saved ? 'Update test' : 'Save test'} onPress={() => void persist(false)} style={styles.flexButton} />
            <ExamButton title="Save & library" onPress={() => void persist(true)} variant="secondary" style={styles.flexButton} />
          </View>
          <ExamButton title="Preview / export JSON" onPress={() => setExportOpen(true)} variant="outline" />
        </Panel>
      </KeyboardAvoidingView>

      <Modal visible={exportOpen} animationType="slide" transparent onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.exportSheet}>
            <View style={styles.exportHeader}>
              <View><Text style={styles.exportTitle}>Test JSON</Text><Text style={styles.exportHint}>Save the test first to add it to your library.</Text></View>
              <Pressable onPress={() => setExportOpen(false)} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
            </View>
            <ScrollView style={styles.jsonScroll} contentContainerStyle={styles.jsonContent}>
              <Text selectable style={styles.jsonText}>{JSON.stringify(test, null, 2)}</Text>
            </ScrollView>
            <ExamButton title="Done" onPress={() => setExportOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  backButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 27, lineHeight: 30 },
  topCopy: { flex: 1, gap: 3 },
  topEyebrow: { color: UI.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  topTitle: { color: UI.ink, fontSize: 19, fontWeight: '900' },
  draftBadge: { backgroundColor: UI.primarySoft, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  draftBadgeText: { color: UI.primary, fontSize: 10, fontWeight: '900' },
  section: { gap: 13 },
  fieldLabel: { color: UI.muted, fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  chipRow: { flexDirection: 'row', gap: 7, paddingVertical: 1 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  fieldRow: { flexDirection: 'row', gap: 10 },
  timerToggle: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, borderRadius: 14, backgroundColor: '#F6F7FA' },
  toggle: { width: 40, height: 23, padding: 3, borderRadius: 12, justifyContent: 'center', backgroundColor: '#CCD3DF' },
  toggleOn: { backgroundColor: UI.primary },
  toggleKnob: { width: 17, height: 17, borderRadius: 9, backgroundColor: '#fff' },
  toggleKnobOn: { alignSelf: 'flex-end' },
  toggleCopy: { flex: 1, gap: 3 },
  toggleTitle: { color: UI.ink, fontSize: 12, fontWeight: '900' },
  toggleHint: { color: UI.muted, fontSize: 10 },
  toggleValue: { color: UI.muted, fontSize: 9, fontWeight: '900' },
  builderHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  questionCount: { color: UI.primary, fontSize: 9, fontWeight: '900', paddingBottom: 4 },
  optionsHeader: { gap: 4, marginTop: 1 },
  fieldHint: { color: UI.muted, fontSize: 10 },
  optionInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 9 },
  answerToggle: { width: 42, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F3F7', marginBottom: 1 },
  answerToggleSelected: { backgroundColor: UI.greenSoft },
  answerLetter: { color: UI.muted, fontSize: 12, fontWeight: '900' },
  answerLetterSelected: { color: UI.green },
  checkmark: { color: UI.green, fontSize: 9, fontWeight: '900', marginTop: -1 },
  builderActions: { flexDirection: 'row', gap: 9, marginTop: 2 },
  flexButton: { flex: 1 },
  questionListItem: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  listNumber: { width: 33, height: 33, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: UI.primarySoft },
  listNumberText: { color: UI.primary, fontSize: 10, fontWeight: '900' },
  listCopy: { flex: 1, gap: 5 },
  listQuestion: { color: UI.ink, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  listMeta: { color: UI.muted, fontSize: 10 },
  listActions: { gap: 5, alignItems: 'flex-end' },
  miniAction: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 6 },
  editText: { color: UI.primary, fontSize: 10, fontWeight: '900' },
  deleteText: { color: UI.red, fontSize: 10, fontWeight: '900' },
  previewPanel: { backgroundColor: '#EEF1FB' },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewEyebrow: { color: UI.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  previewTitle: { color: UI.ink, fontSize: 15, fontWeight: '900', marginTop: 4 },
  previewInfo: { color: UI.muted, fontSize: 11, lineHeight: 16 },
  saveActions: { flexDirection: 'row', gap: 9 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 26, 44, 0.48)' },
  exportSheet: { backgroundColor: UI.background, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30, gap: 16, height: '82%' },
  exportHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exportTitle: { color: UI.ink, fontSize: 19, fontWeight: '900' },
  exportHint: { color: UI.muted, fontSize: 11, marginTop: 4 },
  unauthorizedCard: { padding: 22, gap: 14, alignItems: 'center', backgroundColor: '#FFF6F7', borderColor: '#FFD3D8' },
  unauthorizedBadge: { backgroundColor: '#FFE2E6', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  unauthorizedBadgeText: { color: UI.red, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  unauthorizedTitle: { color: UI.ink, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  unauthorizedText: { color: UI.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  closeButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: UI.surface, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: UI.ink, fontSize: 24, lineHeight: 26 },
  jsonScroll: { flex: 1, borderRadius: 14, backgroundColor: '#17233C' },
  jsonContent: { padding: 14 },
  jsonText: { color: '#DCE4F7', fontSize: 10, lineHeight: 16, fontFamily: 'monospace' },
});
