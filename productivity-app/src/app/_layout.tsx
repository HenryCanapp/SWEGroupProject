import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router, Stack } from 'expo-router';
import { EventHabitPageStateProvider } from '@/components/event-habit-state';
import { expireBackgroundedSession, markAppBackgrounded } from '@/lib/session-timeout';

export default function RootLayout() {
  useEffect(() => {
    const checkExpiredSession = () => {
      void expireBackgroundedSession()
        .then((expired) => {
          if (expired) {
            router.replace('/');
          }
        })
        .catch((error: unknown) => {
          console.error('Unable to check background session timeout:', error);
        });
    };

    checkExpiredSession();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        void markAppBackgrounded().catch((error: unknown) => {
          console.error('Unable to record app background time:', error);
        });
      } else if (nextState === 'active') {
        checkExpiredSession();
      }
    });

    return () => subscription.remove();
  }, []);

  return (
    <EventHabitPageStateProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </EventHabitPageStateProvider>
  );
}
