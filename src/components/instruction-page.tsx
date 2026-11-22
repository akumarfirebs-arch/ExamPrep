import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ExamButton, Panel, ScreenFrame, UI } from '@/components/exam-ui';
import type { Language, TestConfig } from '@/types/exam';

interface InstructionPageProps {
  test: TestConfig;
  selectedLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  onReadyToBegin: () => void;
  onBack: () => void;
}

export function InstructionPage({
  test,
  selectedLanguage,
  onLanguageChange,
  onReadyToBegin,
  onBack,
}: InstructionPageProps) {
  const [declared, setDeclared] = useState(false);
  const isHi = selectedLanguage === 'hi';

  const maxMarks = test.questions.reduce(
    (acc, q) => acc + (q.positiveMarks ?? test.positiveMarks),
    0,
  );

  return (
    <ScreenFrame>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button">
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topInfo}>
          <Text style={styles.topEyebrow}>{isHi ? 'निर्देश पुस्तिका' : 'TEST INSTRUCTIONS'}</Text>
          <Text numberOfLines={1} style={styles.topTitle}>{isHi && test.titleHi ? test.titleHi : test.title}</Text>
        </View>
        <View style={styles.langSwitch}>
          <Pressable
            onPress={() => onLanguageChange('en')}
            style={[styles.langBtn, selectedLanguage === 'en' && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, selectedLanguage === 'en' && styles.langBtnTextActive]}>EN</Text>
          </Pressable>
          <Pressable
            onPress={() => onLanguageChange('hi')}
            style={[styles.langBtn, selectedLanguage === 'hi' && styles.langBtnActive]}>
            <Text style={[styles.langBtnText, selectedLanguage === 'hi' && styles.langBtnTextActive]}>हिंदी</Text>
          </Pressable>
        </View>
      </View>

      <Panel style={styles.metaCard}>
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>{isHi ? 'प्रश्नों की संख्या' : 'Total Questions'}</Text>
            <Text style={styles.metaValue}>{test.questions.length}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>{isHi ? 'अधिकतम अंक' : 'Max Marks'}</Text>
            <Text style={styles.metaValue}>{maxMarks}</Text>
          </View>
          <View style={styles.metaDivider} />
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>{isHi ? 'समय अवधि' : 'Duration'}</Text>
            <Text style={styles.metaValue}>{test.timed && test.durationMinutes ? `${test.durationMinutes} min` : (isHi ? 'असीमित' : 'Untimed')}</Text>
          </View>
        </View>
        <View style={styles.markingCard}>
          <Text style={styles.markingTitle}>{isHi ? 'अंकन योजना (Marking Scheme):' : 'Marking Scheme:'}</Text>
          <Text style={styles.markingItem}>
            <Text style={styles.greenText}>+{test.positiveMarks} </Text>
            {isHi ? 'प्रत्येक सही उत्तर के लिए' : 'for every correct response'} ·{' '}
            <Text style={styles.redText}>−{test.negativeMarks} </Text>
            {isHi ? 'प्रत्येक गलत उत्तर के लिए' : 'for every incorrect response'}
          </Text>
        </View>
      </Panel>

      <Panel style={styles.instructionBody}>
        <Text style={styles.sectionTitle}>{isHi ? 'कृपया निर्देशों को ध्यानपूर्वक पढ़ें' : 'Please read the instructions carefully'}</Text>

        <Text style={styles.subHeading}>{isHi ? 'प्रश्नों के संकेत और रंग (Palette Symbols):' : 'Question Palette Symbols & Status:'}</Text>

        <View style={styles.symbolList}>
          <View style={styles.symbolRow}>
            <View style={[styles.symbolBadge, { backgroundColor: '#E7EBF1' }]}><Text style={styles.symbolBadgeText}>01</Text></View>
            <Text style={styles.symbolLabel}>{isHi ? 'आपने इस प्रश्न को अभी तक नहीं देखा है।' : 'You have not visited the question yet.'}</Text>
          </View>

          <View style={styles.symbolRow}>
            <View style={[styles.symbolBadge, { backgroundColor: UI.red }]}><Text style={[styles.symbolBadgeText, { color: '#fff' }]}>02</Text></View>
            <Text style={styles.symbolLabel}>{isHi ? 'आपने इस प्रश्न का उत्तर नहीं दिया है।' : 'You have not answered the question.'}</Text>
          </View>

          <View style={styles.symbolRow}>
            <View style={[styles.symbolBadge, { backgroundColor: UI.green }]}><Text style={[styles.symbolBadgeText, { color: '#fff' }]}>03</Text></View>
            <Text style={styles.symbolLabel}>{isHi ? 'आपने इस प्रश्न का उत्तर दे दिया है।' : 'You have answered the question.'}</Text>
          </View>

          <View style={styles.symbolRow}>
            <View style={[styles.symbolBadge, { backgroundColor: UI.purple }]}><Text style={[styles.symbolBadgeText, { color: '#fff' }]}>04</Text></View>
            <Text style={styles.symbolLabel}>{isHi ? 'आपने प्रश्न का उत्तर नहीं दिया है, किंतु इसे पुनर्विचार (Review) के लिए चिह्नित किया है।' : 'You have NOT answered the question, but have marked it for review.'}</Text>
          </View>
        </View>

        <Text style={styles.subHeading}>{isHi ? 'सामान्य निर्देश:' : 'General Instructions:'}</Text>
        <Text style={styles.bulletPoint}>
          1. {isHi
            ? 'स्क्रीन के शीर्ष पर स्थित घड़ी (Timer) शेष समय प्रदर्शित करेगी। समय समाप्त होने पर परीक्षा स्वतः जमा (Submit) हो जाएगी।'
            : 'The clock at the top right will display the remaining time available. The test will auto-submit when the countdown reaches zero.'}
        </Text>
        <Text style={styles.bulletPoint}>
          2. {isHi
            ? 'आप परीक्षा के दौरान कभी भी शीर्ष दाएँ कोने से भाषा (Language) बदल सकते हैं।'
            : 'You can change the question language at any time during the examination using the Language toggle.'}
        </Text>
        <Text style={styles.bulletPoint}>
          3. {isHi
            ? 'कॉपी करना, स्क्रीनशॉट लेना और अन्य टैब खोलना पूर्णतः प्रतिबंधित है और यह सुरक्षा प्रणाली द्वारा लॉग किया जाता है।'
            : 'Copying, screenshots, and navigating to other browser tabs are strictly prohibited and actively logged.'}
        </Text>
      </Panel>

      <Panel style={styles.declarationCard}>
        <Pressable
          onPress={() => setDeclared(!declared)}
          style={styles.checkboxRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: declared }}>
          <View style={[styles.checkbox, declared && styles.checkboxActive]}>
            {declared ? <Text style={styles.checkIcon}>✓</Text> : null}
          </View>
          <Text style={styles.declarationText}>
            {isHi
              ? 'मैंने सभी निर्देशों को ध्यानपूर्वक पढ़ और समझ लिया है। मैं प्रमाणित करता हूँ कि मेरे पास कोई अनुचित सामग्री अथवा उपकरण नहीं है।'
              : 'I have read and understood all the instructions above. I declare that I am not in possession of any unauthorized gadgets or unfair means.'}
          </Text>
        </Pressable>
        <ExamButton
          title={isHi ? 'मैं परीक्षा शुरू करने के लिए तैयार हूँ' : 'I AM READY TO BEGIN'}
          disabled={!declared}
          onPress={onReadyToBegin}
        />
      </Panel>
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: UI.surface, borderWidth: 1, borderColor: UI.line },
  backText: { color: UI.ink, fontSize: 28, lineHeight: 31 },
  topInfo: { flex: 1, gap: 2 },
  topEyebrow: { color: UI.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  topTitle: { color: UI.ink, fontSize: 16, fontWeight: '900' },
  langSwitch: { flexDirection: 'row', backgroundColor: '#EAEFF8', borderRadius: 10, padding: 3 },
  langBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langBtnActive: { backgroundColor: UI.primary },
  langBtnText: { fontSize: 11, fontWeight: '800', color: UI.muted },
  langBtnTextActive: { color: '#fff' },
  metaCard: { padding: 16, gap: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  metaCol: { alignItems: 'center', gap: 3 },
  metaLabel: { color: UI.muted, fontSize: 11, fontWeight: '700' },
  metaValue: { color: UI.ink, fontSize: 18, fontWeight: '900' },
  metaDivider: { width: 1, height: 34, backgroundColor: UI.line },
  markingCard: { backgroundColor: '#F6F8FC', padding: 11, borderRadius: 12, gap: 3 },
  markingTitle: { color: UI.ink, fontSize: 11, fontWeight: '800' },
  markingItem: { color: UI.muted, fontSize: 12, lineHeight: 18 },
  greenText: { color: UI.green, fontWeight: '900' },
  redText: { color: UI.red, fontWeight: '900' },
  instructionBody: { padding: 18, gap: 12 },
  sectionTitle: { color: UI.ink, fontSize: 16, fontWeight: '900' },
  subHeading: { color: UI.ink, fontSize: 13, fontWeight: '800', marginTop: 6 },
  symbolList: { gap: 10, marginVertical: 4 },
  symbolRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbolBadge: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  symbolBadgeText: { fontSize: 12, fontWeight: '900', color: UI.muted },
  symbolLabel: { flex: 1, color: UI.ink, fontSize: 12, lineHeight: 18 },
  bulletPoint: { color: '#3A4760', fontSize: 13, lineHeight: 21 },
  declarationCard: { padding: 16, gap: 14, backgroundColor: '#F8FAFD' },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD4E2', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxActive: { backgroundColor: UI.primary, borderColor: UI.primary },
  checkIcon: { color: '#fff', fontSize: 13, fontWeight: '900' },
  declarationText: { flex: 1, color: UI.ink, fontSize: 12, lineHeight: 19, fontWeight: '600' },
});
