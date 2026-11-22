import AsyncStorage from '@react-native-async-storage/async-storage';

import { SAMPLE_TESTS } from '@/data/exams';
import type { ActiveAttempt, TestConfig, TestResult } from '@/types/exam';

const TESTS_KEY = '@examprep/custom-tests-v1';
const ACTIVE_KEY = '@examprep/active-attempts-v1';
const RESULTS_KEY = '@examprep/test-results-v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  return raw === null ? fallback : (JSON.parse(raw) as T);
}

export async function getTests(): Promise<TestConfig[]> {
  const customTests = await readJson<TestConfig[]>(TESTS_KEY, []);
  return [...SAMPLE_TESTS, ...customTests];
}

export async function saveTest(test: TestConfig): Promise<void> {
  const tests = await readJson<TestConfig[]>(TESTS_KEY, []);
  await AsyncStorage.setItem(TESTS_KEY, JSON.stringify([...tests.filter((item) => item.id !== test.id), test]));
}

export async function getActiveAttempt(testId: string): Promise<ActiveAttempt | null> {
  const attempts = await readJson<Record<string, ActiveAttempt>>(ACTIVE_KEY, {});
  return attempts[testId] ?? null;
}

export async function saveActiveAttempt(attempt: ActiveAttempt): Promise<void> {
  const attempts = await readJson<Record<string, ActiveAttempt>>(ACTIVE_KEY, {});
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify({ ...attempts, [attempt.testId]: attempt }));
}

export async function clearActiveAttempt(testId: string): Promise<void> {
  const attempts = await readJson<Record<string, ActiveAttempt>>(ACTIVE_KEY, {});
  delete attempts[testId];
  await AsyncStorage.setItem(ACTIVE_KEY, JSON.stringify(attempts));
}

export async function saveResult(result: TestResult): Promise<void> {
  const results = await readJson<TestResult[]>(RESULTS_KEY, []);
  await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify([result, ...results.filter((item) => item.id !== result.id)]));
}

export async function getResult(id: string): Promise<TestResult | null> {
  const results = await readJson<TestResult[]>(RESULTS_KEY, []);
  return results.find((result) => result.id === id) ?? null;
}

export async function getResults(): Promise<TestResult[]> {
  return readJson<TestResult[]>(RESULTS_KEY, []);
}
