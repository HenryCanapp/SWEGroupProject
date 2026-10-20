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
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);

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
                  expanded={expandedTasks.includes(taskId)}
                  checked={checkedTasks.includes(taskId)}
                  onToggleDetails={() =>
                    setExpandedTasks((current) =>
                      current.includes(taskId)
                        ? current.filter((id) => id !== taskId)
                        : [...current, taskId]
                    )
                  }
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
                  expanded={expandedTasks.includes(taskId)}
                  checked={checkedTasks.includes(taskId)}
                  onToggleDetails={() =>
                    setExpandedTasks((current) =>
                      current.includes(taskId)
                        ? current.filter((id) => id !== taskId)
                        : [...current, taskId]
                    )
                  }
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  taskCard: {
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
  },
  taskCardChecked: {
    borderColor: 'rgba(22, 163, 74, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  taskText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailsButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  detailsButtonText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  detailsChevron: {
    marginLeft: 4,
    color: '#2563eb',
    fontSize: 12,
  },
  taskTime: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '500',
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
    borderColor: '#16a34a',
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  checkmark: {
    color: '#15803d',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  taskDetails: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 12,
  },
  taskDetailText: {
    marginTop: 6,
    color: '#374151',
    fontSize: 14,
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
  pressed: {
    opacity: 0.7,
  },
});

function TaskRow({
  expanded,
  checked,
  onToggleDetails,
  onToggle,
}: {
  expanded: boolean;
  checked: boolean;
  onToggleDetails: () => void;
  onToggle: () => void;
}) {
  return (
    <View style={[styles.taskCard, checked && styles.taskCardChecked]}>
      <View style={styles.taskRow}>
        <Text style={styles.taskText}>Temp</Text>
        <View style={styles.taskActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={expanded ? 'Hide task details' : 'Show task details'}
            onPress={onToggleDetails}
            style={styles.detailsButton}
          >
            <Text style={styles.detailsButtonText}>Details</Text>
            <Text style={styles.detailsChevron}>{expanded ? '▲' : '▼'}</Text>
          </Pressable>
          <Text style={styles.taskTime}>Time: Temp</Text>
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
      </View>
      {expanded && (
        <View style={styles.taskDetails}>
          <Text style={styles.taskDetailText}>Description: Temp</Text>
          <Text style={styles.taskDetailText}>Location: Temp</Text>
          <Text style={styles.taskDetailText}>Event type: Temp (one-time or recurring)</Text>
        </View>
      )}
    </View>
  );
}
