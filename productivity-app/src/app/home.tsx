import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ScreenSwipe } from '@/components/screen-swipe';
import {
  getEventHabits,
  getFriendNotifications,
  isUserLoggedIn,
  respondToFriendRequest,
  type EventHabitRecord,
  type FriendNotification,
} from '@/lib/database';
import { getEventHabitOccurrences } from '@/lib/event-habit-occurrences';
import type { EventHabitOccurrence } from '@/lib/event-habit-occurrences';

export default function HomePage() {
  const [records, setRecords] = useState<EventHabitRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [loadError, setLoadError] = useState('');
  const [notifications, setNotifications] = useState<FriendNotification[]>([]);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [respondingToRequest, setRespondingToRequest] = useState('');
  const { fadeIn } = useLocalSearchParams<{ fadeIn?: string }>();
  const [screenOpacity] = useState(() => new Animated.Value(fadeIn === 'true' ? 0 : 1));

  const loadNotifications = useCallback(async () => {
    try {
      setNotifications(await getFriendNotifications());
      setNotificationError('');
    } catch (error) {
      console.error('Unable to load friend notifications:', error);
      setNotificationError('Unable to load notifications. Please try again.');
    }
  }, []);

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
      void loadNotifications();

      return () => {
        isActive = false;
      };
    }, [loadNotifications])
  );

  const todayKey = formatDate(currentDate);
  const upcomingEnd = addDays(currentDate, 7);
  const occurrences = useMemo(
    () => getEventHabitOccurrences(records, currentDate, upcomingEnd),
    [currentDate, records, upcomingEnd]
  );
  const todayItems = occurrences.filter((item) => item.date === todayKey);
  const upcomingItems = occurrences.filter((item) => item.date > todayKey);

  const handleNotificationPress = () => {
    setNotificationsVisible(true);
    void loadNotifications();
  };

  const handleRequestResponse = async (notification: FriendNotification, accept: boolean) => {
    setRespondingToRequest(notification.request_id);
    setNotificationError('');
    try {
      await respondToFriendRequest(notification.request_id, accept);
      await loadNotifications();
    } catch (error) {
      console.error('Unable to respond to friend request:', error);
      setNotificationError('Unable to update this friend request. Please try again.');
    } finally {
      setRespondingToRequest('');
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
            <View style={styles.headerRow}>
              <Text style={styles.date}>
                {currentDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open notifications"
                accessibilityState={{ expanded: notificationsVisible }}
                onPress={handleNotificationPress}
                style={({ pressed }) => [styles.bellButton, pressed && styles.pressed]}
              >
                <Text style={styles.bellIcon}>🔔</Text>
                {notifications.some(
                  (notification) =>
                    notification.notification_type === 'friend_request' &&
                    notification.request_status === 'pending'
                ) ? <View style={styles.notificationDot} /> : null}
              </Pressable>
            </View>

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

        <Modal
          visible={notificationsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotificationsVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.notificationCard}>
              <View style={styles.notificationHeader}>
                <View>
                  <Text style={styles.notificationTitle}>Notifications</Text>
                  <Text style={styles.notificationSubtitle}>Your 15 most recent updates</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close notifications"
                  onPress={() => setNotificationsVisible(false)}
                  style={styles.closeButton}
                >
                  <Text style={styles.closeButtonText}>×</Text>
                </Pressable>
              </View>

              {notificationError ? (
                <Text style={styles.notificationError}>{notificationError}</Text>
              ) : null}
              <ScrollView
                style={styles.notificationList}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                {notifications.map((notification) => {
                  const actorName =
                    notification.actor_display_name || notification.actor_username;
                  const isPendingRequest =
                    notification.notification_type === 'friend_request' &&
                    notification.request_status === 'pending';
                  const message =
                    notification.notification_type === 'friend_request_accepted'
                      ? `${actorName} accepted your friend request.`
                      : notification.notification_type === 'friend_request_declined'
                        ? `${actorName} declined your friend request.`
                        : notification.request_status === 'accepted'
                          ? `You and ${actorName} are now friends.`
                          : notification.request_status === 'declined'
                            ? `${actorName}'s friend request was declined.`
                            : notification.request_status === 'removed'
                              ? `${actorName}'s friend request is no longer active.`
                              : `${actorName} sent you a friend request.`;

                  return (
                    <View key={notification.notification_id} style={styles.notificationRow}>
                      <ProfileAvatar
                        uri={notification.actor_avatar_uri}
                        name={actorName}
                        size={42}
                      />
                      <View style={styles.notificationCopy}>
                        <Text style={styles.notificationMessage}>{message}</Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notification.created_at).toLocaleString()}
                        </Text>
                        {isPendingRequest ? (
                          <View style={styles.requestActions}>
                            <Pressable
                              accessibilityRole="button"
                              disabled={respondingToRequest === notification.request_id}
                              onPress={() => void handleRequestResponse(notification, true)}
                              style={[styles.acceptButton, styles.requestAction]}
                            >
                              <Text style={styles.acceptButtonText}>
                                {respondingToRequest === notification.request_id
                                  ? 'Saving...'
                                  : 'Accept'}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityRole="button"
                              disabled={respondingToRequest === notification.request_id}
                              onPress={() => void handleRequestResponse(notification, false)}
                              style={[styles.declineButton, styles.requestAction]}
                            >
                              <Text style={styles.declineButtonText}>Decline</Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
                {notifications.length === 0 && !notificationError ? (
                  <Text style={styles.noNotifications}>You’re all caught up.</Text>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScreenSwipe>
    </Animated.View>
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
  headerRow: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 28,
  },
  date: {
    flex: 1,
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 4,
  },
  bellButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#f3f4f6',
  },
  bellIcon: {
    fontSize: 22,
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#f3f4f6',
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
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  notificationCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '75%',
    borderRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 8,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  notificationTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '700',
  },
  notificationSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    color: '#4b5563',
    fontSize: 25,
    lineHeight: 28,
  },
  notificationList: {
    flexShrink: 1,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  notificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  notificationMessage: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 5,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  requestAction: {
    minWidth: 78,
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptButton: {
    backgroundColor: '#111827',
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#f3f4f6',
  },
  declineButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  notificationError: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 10,
  },
  noNotifications: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 30,
  },
});
