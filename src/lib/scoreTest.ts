import type { ActiveAttempt, SubjectResult, TestConfig, TestResult } from '@/types/exam';

export function scoreTest(test: TestConfig, attempt: ActiveAttempt, completedAt = Date.now()): TestResult {
  let correctCount = 0;
  let incorrectCount = 0;
  let positiveMarksGained = 0;
  let negativeMarksDeducted = 0;
  const subjects = new Map<string, SubjectResult>();

  for (const question of test.questions) {
    const subject = question.subject ?? test.subject ?? 'General';
    const subjectResult = subjects.get(subject) ?? {
      subject,
      attempted: 0,
      correct: 0,
      incorrect: 0,
      netMarks: 0,
      accuracy: 0,
    };
    const answer = attempt.answers[question.id];
    if (answer) {
      subjectResult.attempted += 1;
      if (answer === question.correctOptionId) {
        correctCount += 1;
        subjectResult.correct += 1;
        const marks = question.positiveMarks ?? test.positiveMarks;
        positiveMarksGained += marks;
        subjectResult.netMarks += marks;
      } else {
        incorrectCount += 1;
        subjectResult.incorrect += 1;
        const marks = question.negativeMarks ?? test.negativeMarks;
        negativeMarksDeducted += marks;
        subjectResult.netMarks -= marks;
      }
    }
    subjects.set(subject, subjectResult);
  }

  const maxMarks = test.questions.reduce(
    (total, question) => total + (question.positiveMarks ?? test.positiveMarks),
    0,
  );
  const attemptedCount = correctCount + incorrectCount;
  const score = positiveMarksGained - negativeMarksDeducted;
  const percentage = maxMarks > 0 ? (score / maxMarks) * 100 : 0;
  const subjectResults = [...subjects.values()].map((item) => ({
    ...item,
    accuracy: item.attempted > 0 ? (item.correct / item.attempted) * 100 : 0,
  }));
  const durationSeconds = test.timed && test.durationMinutes ? test.durationMinutes * 60 : undefined;
  const elapsedSeconds = Math.max(0, Math.floor((completedAt - attempt.startedAt) / 1000));

  return {
    id: `${test.id}-${completedAt}`,
    test,
    answers: attempt.answers,
    startedAt: attempt.startedAt,
    completedAt,
    timeTakenSeconds: durationSeconds ? Math.min(elapsedSeconds, durationSeconds) : elapsedSeconds,
    score,
    maxMarks,
    percentage,
    passed: percentage >= (test.passPercentage ?? 40),
    correctCount,
    incorrectCount,
    unattemptedCount: test.questions.length - attemptedCount,
    attemptedCount,
    accuracy: attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0,
    positiveMarksGained,
    negativeMarksDeducted,
    subjectResults,
  };
}
