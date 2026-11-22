import { useEffect, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface TestSecurityGuardProps {
  children: ReactNode;
  candidateId?: string;
  onSecurityWarning?: (message: string) => void;
}

export function TestSecurityGuard({ children, candidateId = 'CAND-784920', onSecurityWarning }: TestSecurityGuardProps) {
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // 1. Prevent Right Click (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      onSecurityWarning?.('Right click is disabled during the examination.');
      return false;
    };

    // 2. Prevent Copy & Cut
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onSecurityWarning?.('Copying content is strictly prohibited.');
      return false;
    };

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault();
      return false;
    };

    // 3. Block keyboard shortcuts (Ctrl+C, Ctrl+P, Ctrl+U, PrintScreen, F12)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      // PrintScreen
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        e.preventDefault();
        setWarningCount((c) => c + 1);
        onSecurityWarning?.('Screen capture is prohibited. This incident has been logged.');
        if (navigator.clipboard) {
          navigator.clipboard.writeText('');
        }
      }
      // Ctrl+C, Ctrl+P, Ctrl+U, Ctrl+S, Ctrl+Shift+I, F12
      if (
        (isCtrlOrMeta && ['c', 'C', 'p', 'P', 'u', 'U', 's', 'S', 'a', 'A'].includes(e.key)) ||
        e.key === 'F12' ||
        (isCtrlOrMeta && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key))
      ) {
        e.preventDefault();
        onSecurityWarning?.('Keyboard shortcuts are restricted during the test.');
      }
    };

    // 4. Tab switch / window blur detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWarningCount((c) => {
          const next = c + 1;
          onSecurityWarning?.(`Warning #${next}: Navigating away from the exam tab is recorded.`);
          return next;
        });
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('cut', handleCut);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('cut', handleCut);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onSecurityWarning]);

  const timestamp = new Date().toLocaleTimeString();

  return (
    <View style={styles.secureContainer}>
      {children}
      {/* Subtle security watermark to deter camera photos & unauthorized sharing */}
      <View pointerEvents="none" style={styles.watermarkContainer}>
        <Text style={styles.watermarkText}>{candidateId} · {timestamp} · EXAM SECURED</Text>
        <Text style={styles.watermarkText}>{candidateId} · {timestamp} · EXAM SECURED</Text>
        <Text style={styles.watermarkText}>{candidateId} · {timestamp} · EXAM SECURED</Text>
      </View>
      {warningCount > 0 && (
        <View style={styles.securityWarningBar}>
          <Text style={styles.securityWarningText}>
            Security Alert: {warningCount} tab switch/capture attempt(s) recorded.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  secureContainer: {
    flex: 1,
    // Disable text selection across test screens
    userSelect: 'none',
  },
  watermarkContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-around',
    alignItems: 'center',
    opacity: 0.04,
    transform: [{ rotate: '-25deg' }],
    zIndex: 999,
  },
  watermarkText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000',
    letterSpacing: 3,
  },
  securityWarningBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFEBEF',
    borderBottomWidth: 1,
    borderBottomColor: '#FFB8C4',
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignItems: 'center',
    zIndex: 1000,
  },
  securityWarningText: {
    color: '#C5414E',
    fontSize: 11,
    fontWeight: '800',
  },
});
