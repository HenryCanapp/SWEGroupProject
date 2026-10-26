import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ScreenSwipe } from '@/components/screen-swipe';
import { isUserLoggedIn } from '@/lib/database';

const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const selectedCircleSize = 50;

type CalendarItem = {
  id: string;
  type: 'task' | 'habit';
  text: string;
  date: string;
};

const calendarItems: CalendarItem[] = [
  { id: 'task-1', type: 'task', text: 'Finish project brief', date: formatDate(new Date()) },
  { id: 'task-2', type: 'task', text: 'Reply to team messages', date: formatDate(new Date(Date.now() + 86400000)) },
  { id: 'habit-1', type: 'habit', text: 'Morning walk', date: formatDate(new Date()) },
  { id: 'habit-2', type: 'habit', text: 'Read 20 pages', date: formatDate(new Date(Date.now() + 172800000)) },
  { id: 'habit-3', type: 'habit', text: 'Stretch for 10 minutes', date: formatDate(new Date()) },
  { id: 'task-3', type: 'task', text: 'Plan next sprint', date: formatDate(new Date(Date.now() - 86400000)) },
];

function getItemsForDate(date: Date) {
  const key = formatDate(date);
  return calendarItems.filter((item) => item.date === key);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState(today);

  useEffect(() => {
    isUserLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/');
      }
    });
  }, []);

  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });
  const year = viewDate.getFullYear();
  const selectedDateKey = formatDate(selectedDate);

  const selectedItems = useMemo(
    () => getItemsForDate(selectedDate),
    [selectedDateKey]
  );

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const daysInMonth = lastOfMonth.getDate();
    const leadingDays = firstOfMonth.getDay();
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    const cells: Array<{ value: number; isCurrentMonth: boolean; actualDate: Date }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - leadingDays + 1;
      const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

      let value = dayNumber;
      let actualDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);

      if (!isCurrentMonth) {
        const prevMonthLastDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
        value = dayNumber <= 0 ? prevMonthLastDay + dayNumber : dayNumber - daysInMonth;
        actualDate = new Date(
          viewDate.getFullYear(),
          viewDate.getMonth() + (dayNumber <= 0 ? -1 : 1),
          value
        );
      }

      cells.push({ value, isCurrentMonth, actualDate });
    }

    return cells;
  }, [viewDate]);

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={goToPreviousMonth} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{'<'}</Text>
              </Pressable>

              <Text style={styles.monthText}>{`${monthName}, ${year}`}</Text>

              <Pressable onPress={goToNextMonth} style={styles.arrowButton}>
                <Text style={styles.arrowText}>{'>'}</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {dayLabels.map((label) => (
                <Text key={label} style={styles.weekdayText}>{label}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isSelected = formatDate(selectedDate) === formatDate(day.actualDate);
                const isToday = formatDate(today) === formatDate(day.actualDate);

                const itemsForDay = getItemsForDate(day.actualDate);
                const hasTask = itemsForDay.some((item) => item.type === 'task');
                const hasHabit = itemsForDay.some((item) => item.type === 'habit');

                return (
                  <Pressable
                    key={`${day.actualDate.toISOString()}-${index}`}
                    onPress={() => handleDayPress(day.actualDate)}
                    style={styles.dayCell}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !day.isCurrentMonth && styles.otherMonthText,
                        isSelected && styles.selectedText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {day.value}
                    </Text>

                    {isSelected && <View style={styles.selectedCircle} />}

                    {itemsForDay.length > 0 && (
                      <View style={styles.dotRow}>
                        {hasHabit && <View style={[styles.dot, styles.habitDot, hasTask && styles.offsetHabitDot]} />}
                        {hasTask && <View style={[styles.dot, styles.taskDot, hasHabit && styles.offsetTaskDot]} />}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.detailsTitle}>{selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemType}>{item.type === 'task' ? 'Task' : 'Habit'}</Text>
                  <Text style={styles.itemText}>{item.text}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No tasks or habits for this day.</Text>
            )}
          </View>

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
    alignItems: 'center',
    paddingBottom: 80,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  arrowButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#111827',
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  calendarCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#f5f5f5',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 2,
  },
  dayText: {
    fontSize: 15,
    color: '#111827',
    zIndex: 2,
    marginTop: 0,
    textAlign: 'center',
  },
  otherMonthText: {
    color: '#b6bcc7',
  },
  todayText: {
    color: '#1d4ed8',
    fontWeight: '700',
    zIndex: 2,
  },
  selectedText: {
    color: '#111827',
    zIndex: 2,
  },
  selectedCircle: {
    position: 'absolute',
    width: selectedCircleSize,
    height: selectedCircleSize,
    borderRadius: selectedCircleSize / 2,
    borderWidth: 2,
    borderColor: '#3b82f6',
    zIndex: 1,
    left: '50%',
    top: '50%',
    transform: [{ translateX: -selectedCircleSize / 2 }, { translateY: -selectedCircleSize / 2 }],
  },
  dotRow: {
    position: 'absolute',
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 3,
  },
  habitDot: {
    backgroundColor: '#f59e0b',
  },
  taskDot: {
    backgroundColor: '#22c55e',
  },
  offsetHabitDot: {
    marginRight: 7,
  },
  offsetTaskDot: {
    marginLeft: -5,
  },
  detailsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#f9fafb',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  itemRow: {
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  itemType: {
    fontSize: 11,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: '#4b5563',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 15,
    color: '#111827',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
});
