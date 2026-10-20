import { type ReactNode, useMemo } from 'react';
import { PanResponder, View } from 'react-native';
import { router, usePathname } from 'expo-router';

const routes = [
  '/events_and_habits',
  '/social',
  '/home',
  '/calendar',
  '/profile',
] as const;

export function ScreenSwipe({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 30 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          const currentIndex = routes.indexOf((pathname || '/') as (typeof routes)[number]);

          if (currentIndex === -1) {
            return;
          }

          if (Math.abs(gestureState.dx) < 60) {
            return;
          }

          const nextIndex = gestureState.dx < 0 ? currentIndex + 1 : currentIndex - 1;
          const nextRoute = routes[nextIndex];

          if (nextRoute) {
            router.push(nextRoute);
          }
        },
      }),
    [pathname]
  );

  return <View style={{ flex: 1 }} {...panResponder.panHandlers}>{children}</View>;
}
