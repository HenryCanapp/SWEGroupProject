import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ScreenSwipe } from '@/components/screen-swipe';
import { isUserLoggedIn } from '@/lib/database';

const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    isUserLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/');
      }
    });
  }, []);

  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });
  const year = viewDate.getFullYear();

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const lastOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const daysInMonth = lastOfMonth.getDate();
    const leadingDays = firstOfMonth.getDay();
    const totalCells = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

    const cells: Array<{ value: number; isCurrentMonth: boolean }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - leadingDays + 1;
      const isCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;

      let value = dayNumber;

      if (!isCurrentMonth) {
        const prevMonthLastDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
        value = dayNumber <= 0 ? prevMonthLastDay + dayNumber : dayNumber - daysInMonth;
      }

      cells.push({
        value,
        isCurrentMonth,
      });
    }

    return cells;
  }, [viewDate]);

  const goToPreviousMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={goToPreviousMonth} style={styles.arrowButton}>
              <Text style={styles.arrowText}>{'<'}</Text>
            </Pressable>

            <Text style={styles.monthText}>{`${monthName}, ${year}`}</Text>

            <Pressable onPress={goToNextMonth} style={styles.arrowButton}>
              <Text style={styles.arrowText}>{'>'}</Text>
            </Pressable>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.weekRow}>
              {dayLabels.map((label) => (
                <Text key={label} style={styles.weekdayText}>
                  {label}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                const isToday =
                  day.isCurrentMonth &&
                  viewDate.getMonth() === today.getMonth() &&
                  viewDate.getFullYear() === today.getFullYear() &&
                  day.value === today.getDate();

                return (
                  <View key={`${day.value}-${index}`} style={styles.dayCell}>
                    <Text
                      style={[
                        styles.dayText,
                        !day.isCurrentMonth && styles.otherMonthText,
                        isToday && styles.todayText,
                      ]}
                    >
                      {day.value}
                    </Text>

                    {isToday && <View style={styles.todayCircle} />}
                  </View>
                );
              })}
            </View>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  arrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 24,
    color: '#111827',
  },
  monthText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  calendarCard: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 16,
    marginTop: 90,
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
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 15,
    color: '#111827',
    zIndex: 2,
  },
  otherMonthText: {
    color: '#c7ccd3',
  },
  todayText: {
    color: '#1d4ed8',
    fontWeight: '700',
    zIndex: 2,
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
    zIndex: 1,
  },
});
