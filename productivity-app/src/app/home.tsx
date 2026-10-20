import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ScreenSwipe } from '@/components/screen-swipe';
import { isUserLoggedIn } from '@/lib/database';

const taskIds = ['today-1', 'today-2', 'upcoming-1', 'upcoming-2'];

export default function HomePage() {
  const [checkedTasks, setCheckedTasks] = useState<string[]>([]);

  useEffect(() => {
    isUserLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/');
      }
    });
  }, []);

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today:</Text>
              {taskIds.slice(0, 2).map((taskId) => (
                <TaskRow
                  key={taskId}
                  checked={checkedTasks.includes(taskId)}
                  onToggle={() =>
                    setCheckedTasks((current) =>
                      current.includes(taskId)
                        ? current.filter((id) => id !== taskId)
                        : [...current, taskId]
                    )
                  }
                />
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming:</Text>
              {taskIds.slice(2).map((taskId) => (
                <TaskRow
                  key={taskId}
                  checked={checkedTasks.includes(taskId)}
                  onToggle={() =>
                    setCheckedTasks((current) =>
                      current.includes(taskId)
                        ? current.filter((id) => id !== taskId)
                        : [...current, taskId]
                    )
                  }
                />
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to Events + Habits"
              onPress={() => router.push('/events_and_habits' as Href)}
              style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
            >
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addLabel}>Events + Habits</Text>
            </Pressable>
          </ScrollView>
          <BottomRibbon />
        </View>
      </SafeAreaView>
    </ScreenSwipe>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  date: {
    alignSelf: 'center',
    marginBottom: 32,
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  taskRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  taskText: {
    color: '#1f2937',
    fontSize: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9ca3af',
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
  checkboxChecked: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  addButton: {
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: '#f9fafb',
  },
  addIcon: {
    color: '#4b5563',
    fontSize: 36,
    fontWeight: '400',
    lineHeight: 40,
  },
  addLabel: {
    marginTop: 4,
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});

function TaskRow({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskText}>Temp</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel="Mark temp task complete"
        onPress={onToggle}
        style={[styles.checkbox, checked && styles.checkboxChecked]}
      >
        {checked && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    </View>
  );
}
