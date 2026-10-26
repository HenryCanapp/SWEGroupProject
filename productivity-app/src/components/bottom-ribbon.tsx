import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const options = [
  { label: 'Events + Habits', path: '/events_and_habits' },
  { label: 'Social', path: '/social' },
  { label: 'Home', path: '/home' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Profile', path: '/profile' },
] as const;

export function BottomRibbon() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.ribbon, { paddingBottom: insets.bottom + 6 }]}>
      {options.map((option) => (
        <Pressable
          key={option.label}
          onPress={() => router.push(option.path)}
          style={styles.optionButton}
        >
          <Text style={styles.optionText}>{option.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#f3f4f6',
    minHeight: 68,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    zIndex: 20,
    elevation: 20,
  },
  optionButton: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
    paddingVertical: 6,
  },
  optionText: {
    fontSize: 10,
    lineHeight: 12,
    color: '#111827',
    textAlign: 'center',
  },
});
