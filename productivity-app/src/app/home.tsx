import { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ScreenSwipe } from '@/components/screen-swipe';
import {
  dismissEventHabitCompletions,
  getEventHabitCompletions,
  getEventHabits,
  isUserLoggedIn,
  markEventHabitCompleteMany,
} from '@/lib/database';
import type { EventHabitCompletion, EventHabitRecord } from '@/lib/database';
import {
  describeHabitSchedule,
  getEventHabitOccurrences,
  getOverdueItems,
  groupHabitOccurrences,
  isOccurrencePastDue,
  occurrenceKey,
} from '@/lib/event-habit-occurrences';
import type { EventHabitOccurrence, OverdueItem } from '@/lib/event-habit-occurrences';

const CLOCK_REFRESH_MS = 60 * 1000;

export default function HomePage() {
  const [records, setRecords] = useState<EventHabitRecord[]>([]);
  const [completions, setCompletions] = useState<EventHabitCompletion[]>([]);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadError, setLoadError] = useState('');
  const { fadeIn } = useLocalSearchParams<{ fadeIn?: string }>();
  const [screenOpacity] = useState(() => new Animated.Value(fadeIn === 'true' ? 0 : 1));

  useEffect(() => {
    if (fadeIn !== 'true') {
      return;
    }

    const animation = Animated.timing(screenOpacity, {
      toValue: 1,
      duration: 320,
      useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [fadeIn, screenOpacity]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadRecords = async () => {
        const loggedIn = await isUserLoggedIn();
        if (!loggedIn) {
          router.replace('/');
          return;
        }

        const [eventHabits, completedRows] = await Promise.all([
          getEventHabits(),
          getEventHabitCompletions(),
        ]);
        if (isActive) {
          setRecords(eventHabits);
          setCompletions(completedRows);
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

      const clock = setInterval(() => setCurrentDate(new Date()), CLOCK_REFRESH_MS);

      return () => {
        isActive = false;
        clearInterval(clock);
      };
    }, [])
  );

  const todayKey = formatDate(currentDate);
  const occurrences = useMemo(() => {
    const today = parseDateKey(todayKey);
    return getEventHabitOccurrences(records, addDays(today, -7), addDays(today, 7));
  }, [records, todayKey]);
  const completedKeys = useMemo(
    () =>
      new Set(
        completions.map((completion) =>
          occurrenceKey(completion.event_habit_id, completion.occurrence_date)
        )
      ),
    [completions]
  );
  const isCompleted = (item: EventHabitOccurrence) =>
    completedKeys.has(occurrenceKey(item.id, item.date));
  const recordsById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records]
  );
  const scheduleFor = (item: EventHabitOccurrence) => {
    const record = recordsById.get(item.id);
    return item.type === 'habit' && record ? describeHabitSchedule(record) : undefined;
  };
  const openOccurrences = occurrences.filter(
    (item) =>
      item.date >= todayKey && !isCompleted(item) && !isOccurrencePastDue(item, currentDate)
  );
  const todayItems = groupHabitOccurrences(
    openOccurrences.filter((item) => item.date === todayKey)
  );
  const upcomingOccurrences = openOccurrences.filter((item) => item.date > todayKey);
  const upcomingItems = groupHabitOccurrences(upcomingOccurrences);
  const upcomingCountByHabit = new Map<number, number>();
  upcomingOccurrences.forEach((item) => {
    if (item.type === 'habit') {
      upcomingCountByHabit.set(item.id, (upcomingCountByHabit.get(item.id) ?? 0) + 1);
    }
  });
  const overdueItems = useMemo(
    () => getOverdueItems(records, completedKeys, currentDate),
    [records, completedKeys, currentDate]
  );
  const dismissedKeys = useMemo(
    () =>
      new Set(
        completions
          .filter((completion) => completion.dismissed)
          .map((completion) => occurrenceKey(completion.event_habit_id, completion.occurrence_date))
      ),
    [completions]
  );
  const isShownAsCompleted = (item: EventHabitOccurrence) =>
    isCompleted(item) && !dismissedKeys.has(occurrenceKey(item.id, item.date));
  const completedItems = groupHabitOccurrences(occurrences.filter(isShownAsCompleted));
  const completedDatesByHabit = new Map<number, string[]>();
  occurrences.forEach((item) => {
    if (item.type === 'habit' && isShownAsCompleted(item)) {
      completedDatesByHabit.set(item.id, [...(completedDatesByHabit.get(item.id) ?? []), item.date]);
    }
  });

  const handleMarkComplete = async (item: EventHabitOccurrence, dates: string[] = [item.date]) => {
    if (pendingKey) {
      return;
    }

    const added = dates
      .filter((date) => !completedKeys.has(occurrenceKey(item.id, date)))
      .map((date) => ({ event_habit_id: item.id, occurrence_date: date, dismissed: false }));
    setPendingKey(occurrenceKey(item.id, item.date));
    setCompletions((current) => [...current, ...added]);
    try {
      await markEventHabitCompleteMany(item.id, dates);
      setLoadError('');
    } catch (error: unknown) {
      console.error('Unable to mark item complete:', error);
      setCompletions((current) => current.filter((entry) => !added.includes(entry)));
      setLoadError(`Unable to mark "${item.title}" complete.`);
    } finally {
      setPendingKey(null);
    }
  };

  const handleRemoveCompleted = async (item: EventHabitOccurrence) => {
    if (pendingKey) {
      return;
    }

    const dates =
      item.type === 'habit' ? (completedDatesByHabit.get(item.id) ?? [item.date]) : [item.date];
    const keys = new Set(dates.map((date) => occurrenceKey(item.id, date)));
    const previous = completions;
    setPendingKey(occurrenceKey(item.id, item.date));
    setCompletions((current) =>
      current.map((entry) =>
        keys.has(occurrenceKey(entry.event_habit_id, entry.occurrence_date))
          ? { ...entry, dismissed: true }
          : entry
      )
    );
    try {
      await dismissEventHabitCompletions(item.id, dates);
      setLoadError('');
    } catch (error: unknown) {
      console.error('Unable to remove completed item:', error);
      setCompletions(previous);
      setLoadError(`Unable to remove "${item.title}" from Completed.`);
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
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
                  <ScheduledItem
                    key={`today-${itemKey(item)}`}
                    item={item}
                    todayKey={todayKey}
                    schedule={scheduleFor(item)}
                    disabled={pendingKey !== null}
                    onMarkComplete={() => void handleMarkComplete(item)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing scheduled for today.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcomingItems.length ? (
                upcomingItems.map((item) => (
                  <ScheduledItem
                    key={`upcoming-${itemKey(item)}`}
                    item={item}
                    todayKey={todayKey}
                    schedule={scheduleFor(item)}
                    upcomingCount={upcomingCountByHabit.get(item.id)}
                    disabled={pendingKey !== null}
                    onMarkComplete={
                      item.type === 'event' ? () => void handleMarkComplete(item) : undefined
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing else scheduled this week.</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, styles.overdueTitle]}>Overdue</Text>
              {overdueItems.length ? (
                overdueItems.map((overdue) => (
                  <ScheduledItem
                    key={`overdue-${overdueItemKey(overdue)}`}
                    item={overdue.occurrence}
                    overdue={overdue}
                    disabled={pendingKey !== null}
                    onMarkComplete={() =>
                      void handleMarkComplete(
                        overdue.occurrence,
                        overdue.kind === 'habit' ? overdue.missedDates : undefined
                      )
                    }
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing overdue :)</Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={[styles.sectionTitle, styles.completedTitle]}>Completed</Text>
              {completedItems.length ? (
                completedItems.map((item) => (
                  <ScheduledItem
                    key={`completed-${itemKey(item)}`}
                    item={item}
                    todayKey={todayKey}
                    completed
                    completedDates={completedDatesByHabit.get(item.id)}
                    disabled={pendingKey !== null}
                    onRemove={() => void handleRemoveCompleted(item)}
                  />
                ))
              ) : (
                <Text style={styles.emptyText}>Nothing completed yet.</Text>
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
    </Animated.View>
  );
}

function ScheduledItem({
  item,
  completed = false,
  overdue,
  todayKey,
  schedule,
  completedDates,
  upcomingCount,
  disabled = false,
  onMarkComplete,
  onRemove,
}: {
  onRemove?: () => void;
  upcomingCount?: number;
  item: EventHabitOccurrence;
  completed?: boolean;
  overdue?: OverdueItem;
  todayKey?: string;
  schedule?: string;
  completedDates?: string[];
  disabled?: boolean;
  onMarkComplete?: () => void;
}) {
  const missedCount = overdue?.kind === 'habit' ? overdue.missedDates.length : 0;

  return (
    <View
      style={[styles.taskCard, completed && styles.completedCard, overdue && styles.overdueCard]}
    >
      <View style={styles.taskRow}>
        <View style={styles.itemCopy}>
          <Text style={styles.taskText}>{item.title}</Text>
          {overdue?.kind === 'habit' ? (
            <>
              <Text style={styles.overdueMeta}>
                Habit overdue by {missedCount} {missedCount === 1 ? 'day' : 'days'}
              </Text>
              <Text style={styles.itemMeta}>
                Last missed {formatShortDate(item.date)}
                {item.time ? ` · ${item.time}` : ''}
              </Text>
            </>
          ) : overdue ? (
            <Text style={styles.overdueMeta}>
              Overdue · {formatShortDate(item.date)}
              {item.time ? ` · ${item.time}` : ''}
            </Text>
          ) : item.type === 'habit' && completed && completedDates?.length ? (
            <Text style={styles.completedMeta}>
              Completed {completedDates.map((date) => formatDayLabel(date, todayKey)).join(', ')}
            </Text>
          ) : item.type === 'habit' && schedule ? (
            <>
              <Text style={styles.itemMeta}>{schedule}</Text>
              <Text style={styles.nextMeta}>
                Next: {formatDayLabel(item.date, todayKey)}
                {item.time ? ` · ${item.time}` : ''}
              </Text>
              {upcomingCount && upcomingCount > 1 ? (
                <Text style={styles.nextMeta}>
                  {upcomingCount - 1} more {upcomingCount - 1 === 1 ? 'day' : 'days'} this week
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.itemMeta}>
              {item.type === 'event' ? 'Event' : 'Habit'}
              {completed ? ` · ${formatShortDate(item.date)}` : ''}
              {item.time ? ` · ${item.time}` : ''}
            </Text>
          )}
        </View>
        {completed ? (
          <Text style={styles.completedBadge}>✓ Completed</Text>
        ) : onMarkComplete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mark ${item.title} complete`}
            disabled={disabled}
            onPress={onMarkComplete}
            style={({ pressed }) => [
              styles.completeButton,
              pressed && styles.completeButtonPressed,
              disabled && styles.completeButtonDisabled,
            ]}
          >
            <Text style={styles.completeButtonText}>Mark Complete</Text>
          </Pressable>
        ) : null}
      </View>
      {item.details ? <Text style={styles.taskDetailText}>{item.details}</Text> : null}
      {item.location ? <Text style={styles.taskDetailText}>{item.location}</Text> : null}
      {completed && onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${item.title} from Completed`}
          disabled={disabled}
          onPress={onRemove}
          style={({ pressed }) => [
            styles.removeButton,
            pressed && styles.removeButtonPressed,
            disabled && styles.completeButtonDisabled,
          ]}
        >
          <Text style={styles.removeButtonText}>Remove from Completed</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function itemKey(item: EventHabitOccurrence) {
  return item.type === 'habit' ? `habit-${item.id}` : occurrenceKey(item.id, item.date);
}

function formatDayLabel(date: string, todayKey?: string) {
  return date === todayKey ? 'Today' : formatShortDate(date);
}

function overdueItemKey(overdue: OverdueItem) {
  return overdue.kind === 'habit'
    ? `habit-${overdue.occurrence.id}`
    : occurrenceKey(overdue.occurrence.id, overdue.occurrence.date);
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
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
  completedTitle: {
    color: '#15803d',
  },
  completedCard: {
    borderColor: '#86efac',
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
    backgroundColor: '#f0fdf4',
  },
  removeButton: {
    alignSelf: 'flex-end',
    marginHorizontal: 14,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  removeButtonPressed: {
    backgroundColor: '#dcfce7',
  },
  removeButtonText: {
    color: '#15803d',
    fontSize: 12,
    fontWeight: '600',
  },
  nextMeta: {
    marginTop: 2,
    color: '#6b7280',
    fontSize: 13,
  },
  completedMeta: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600',
  },
  overdueTitle: {
    color: '#b91c1c',
  },
  overdueCard: {
    borderColor: '#fca5a5',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  overdueMeta: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '600',
  },
  completedBadge: {
    alignSelf: 'center',
    marginLeft: 12,
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
  },
  completeButton: {
    alignSelf: 'center',
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#16a34a',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  completeButtonPressed: {
    backgroundColor: '#dcfce7',
  },
  completeButtonDisabled: {
    opacity: 0.5,
  },
  completeButtonText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '700',
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
