import type { ReactNode } from 'react';
import { Alert, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { TestType } from '@/types/exam';

export const UI = {
  background: '#F5F7FB',
  surface: '#FFFFFF',
  ink: '#17233C',
  muted: '#71809A',
  line: '#E4E9F1',
  primary: '#4659D9',
  primarySoft: '#EEF0FF',
  green: '#17865B',
  greenSoft: '#E8F7F0',
  red: '#C5414E',
  redSoft: '#FFF0F1',
  purple: '#7651C8',
  purpleSoft: '#F2EDFF',
  amber: '#A86A10',
  amberSoft: '#FFF6E5',
};

export function showNotice(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

const TYPE_COLORS: Record<TestType, { background: string; text: string }> = {
  MOCK: { background: '#EEF0FF', text: '#4659D9' },
  SUBJECT_WISE: { background: '#E7F5F2', text: '#147A68' },
  PYQ: { background: '#FFF2E6', text: '#A85F17' },
  DPP: { background: '#F2EDFF', text: '#7651C8' },
};

export function ScreenFrame({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.page, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function TypeBadge({ type, label }: { type: TestType; label?: string }) {
  const colors = TYPE_COLORS[type];
  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <Text style={[styles.badgeText, { color: colors.text }]}>{label ?? type.replace('_', ' ')}</Text>
    </View>
  );
}

export function Pill({
  children,
  active = false,
  onPress,
}: {
  children: ReactNode;
  active?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{children}</Text>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function ExamButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  compact = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  disabled?: boolean;
  compact?: boolean;
  style?: object;
}) {
  const buttonStyle = {
    primary: styles.buttonPrimary,
    secondary: styles.buttonSecondary,
    outline: styles.buttonOutline,
    danger: styles.buttonDanger,
  }[variant];
  const textStyle = {
    primary: styles.buttonTextPrimary,
    secondary: styles.buttonTextSecondary,
    outline: styles.buttonTextOutline,
    danger: styles.buttonTextDanger,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        buttonStyle,
        compact && styles.buttonCompact,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={UI.muted}
        style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputDisabled]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.headingTitle}>{title}</Text>
      {subtitle ? <Text style={styles.headingSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function ProgressBar({ value, color = UI.primary }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: UI.background },
  page: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 36, gap: 20 },
  fill: { flex: 1 },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  pill: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: UI.line, backgroundColor: UI.surface },
  pillActive: { backgroundColor: UI.ink, borderColor: UI.ink },
  pillText: { color: UI.muted, fontSize: 13, fontWeight: '700' },
  pillTextActive: { color: UI.surface },
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 14, paddingHorizontal: 16 },
  buttonCompact: { minHeight: 44, paddingHorizontal: 13, borderRadius: 12 },
  buttonPrimary: { backgroundColor: UI.primary },
  buttonSecondary: { backgroundColor: UI.primarySoft },
  buttonOutline: { backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  buttonDanger: { backgroundColor: UI.redSoft },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  buttonTextPrimary: { color: UI.surface },
  buttonTextSecondary: { color: UI.primary },
  buttonTextOutline: { color: UI.ink },
  buttonTextDanger: { color: UI.red },
  pressed: { opacity: 0.75 },
  fieldWrap: { gap: 7, flex: 1 },
  fieldLabel: { color: UI.muted, fontSize: 12, fontWeight: '800' },
  input: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: UI.line, backgroundColor: UI.surface, paddingHorizontal: 13, color: UI.ink, fontSize: 14 },
  inputMultiline: { minHeight: 100, paddingTop: 13 },
  inputDisabled: { opacity: 0.65 },
  panel: { padding: 16, borderRadius: 20, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line, gap: 14 },
  heading: { gap: 4 },
  headingTitle: { color: UI.ink, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  headingSubtitle: { color: UI.muted, fontSize: 14, lineHeight: 20 },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: 8, backgroundColor: '#E9EDF5' },
  progressFill: { height: '100%', borderRadius: 8 },
});
