import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

const options = [
  { label: 'Events + Habits', path: '/events_and_habits' },
  { label: 'Social', path: '/social' },
  { label: 'Home', path: '/home' },
  { label: 'Calendar', path: '/calendar' },
  { label: 'Profile', path: '/profile' },
] as const;

export function BottomRibbon() {
  return (
    <View style={styles.ribbon}>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 11,
    color: '#111827',
    textAlign: 'center',
  },
});
