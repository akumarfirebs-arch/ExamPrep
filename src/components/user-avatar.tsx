import { Image, StyleSheet, Text, View } from 'react-native';
import { UI } from '@/components/exam-ui';

export const PRESET_AVATARS = [
  { id: 'avatar-1', label: 'Scholar', bg: '#4659D9', text: '🎓' },
  { id: 'avatar-2', label: 'Achiever', bg: '#17865B', text: '⭐' },
  { id: 'avatar-3', label: 'Strategist', bg: '#7651C8', text: '🎯' },
  { id: 'avatar-4', label: 'Explorer', bg: '#A85F17', text: '🚀' },
  { id: 'avatar-5', label: 'Leader', bg: '#17233C', text: '🏛️' },
  { id: 'avatar-admin', label: 'Faculty / Admin', bg: '#C5414E', text: '🛡️' },
];

interface UserAvatarProps {
  avatarUrl?: string;
  name: string;
  size?: number;
  style?: object;
}

export function UserAvatar({ avatarUrl, name, size = 44, style }: UserAvatarProps) {
  const isCustomUri = avatarUrl && (
    avatarUrl.startsWith('file:') ||
    avatarUrl.startsWith('content:') ||
    avatarUrl.startsWith('http:') ||
    avatarUrl.startsWith('https:') ||
    avatarUrl.startsWith('data:')
  );

  if (isCustomUri) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[
          styles.avatarImage,
          { width: size, height: size, borderRadius: size / 2 },
          style,
        ]}
      />
    );
  }

  const preset = PRESET_AVATARS.find((p) => p.id === avatarUrl);
  if (preset) {
    return (
      <View
        style={[
          styles.presetAvatar,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: preset.bg },
          style,
        ]}>
        <Text style={{ fontSize: size * 0.48 }}>{preset.text}</Text>
      </View>
    );
  }

  // Initials fallback
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'E';

  return (
    <View
      style={[
        styles.initialsAvatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: UI.primary },
        style,
      ]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.42 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatarImage: {
    borderWidth: 2,
    borderColor: UI.surface,
  },
  presetAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: UI.surface,
  },
  initialsAvatar: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: UI.surface,
  },
  initialsText: {
    color: '#fff',
    fontWeight: '900',
  },
});
