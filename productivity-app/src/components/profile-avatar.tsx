import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

type ProfileAvatarProps = {
  uri: string;
  name: string;
  size?: number;
};

export function ProfileAvatar({ uri, name, size = 96 }: ProfileAvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.image, dimensions]} contentFit="cover" />;
  }

  const initial = name.trim().charAt(0).toUpperCase() || '?';

  return (
    <View style={[styles.fallback, dimensions]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e5e7eb',
  },
  fallback: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
