import { Stack } from 'expo-router';
import { EventHabitPageStateProvider } from '@/components/event-habit-state';

export default function RootLayout() {
  return (
    <EventHabitPageStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </EventHabitPageStateProvider>
  );
}
