import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router, useFocusEffect } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ScreenSwipe } from '@/components/screen-swipe';
import { getEventHabits, isUserLoggedIn } from '@/lib/database';
import type { EventHabitRecord } from '@/lib/database';
import { getEventHabitOccurrences } from '@/lib/event-habit-occurrences';
import type { EventHabitOccurrence } from '@/lib/event-habit-occurrences';

export default function HomePage() {
  const [records, setRecords] = useState<EventHabitRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadError, setLoadError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadRecords = async () => {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) {
          router.replace('/');
          return;
        }

        const eventHabits = await getEventHabits();
        if (isActive) {
          setRecords(eventHabits);
          setCurrentDate(new Date());
          setLoadError('');
        }
      };

      loadRecords().catch((error: unknown) => {
        console.error('Unable to load home schedule:', error);
        if (isActive) {
          setLoadError('Unable to load your schedule.');
        }
      });

      return () => {
        isActive = false;
      };
    }, [])
  );

  const todayKey = formatDate(currentDate);
  const upcomingEnd = addDays(currentDate, 7);
  const occurrences = useMemo(
    () => getEventHabitOccurrences(records, currentDate, upcomingEnd),
    [currentDate, records, upcomingEnd]
  );
  const todayItems = occurrences.filter((item) => item.date === todayKey);
  const upcomingItems = occurrences.filter((item) => item.date > todayKey);

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.date}>
              {currentDate.toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>

            {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today</Text>
              {todayItems.length ? (
                todayItems.map((item) => (
                  <ScheduledItem key={`${item.id}-${item.date}`} item={item} />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing scheduled for today.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcomingItems.length ? (
                upcomingItems.map((item) => (
                  <ScheduledItem key={`${item.id}-${item.date}`} item={item} />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing else scheduled this week.</Text>
              )}
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

function ScheduledItem({ item }: { item: EventHabitOccurrence }) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.taskText}>{item.title}</Text>
          <Text style={styles.itemMeta}>
            {item.type === 'event' ? 'Event' : 'Habit'}
            {item.time ? ` · ${item.time}` : ''}
          </Text>
        </View>
      </View>
      {item.details ? <Text style={styles.taskDetailText}>{item.details}</Text> : null}
      {item.location ? <Text style={styles.taskDetailText}>{item.location}</Text> : null}
    </View>
  );
}

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function addDays(date: Date, amount: number) {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  result.setDate(result.getDate() + amount);
  return result;
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
  itemCopy: { flex: 1 },
  taskText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  itemMeta: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '500',
  },
  taskDetailText: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    color: '#374151',
    fontSize: 14,
  },
  emptyText: { color: '#6b7280', fontSize: 15, paddingVertical: 8 },
  errorText: { color: '#b91c1c', fontSize: 14, marginBottom: 12 },
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
