import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ScreenSwipe } from '@/components/screen-swipe';
import {
  getFriends,
  getCurrentUser,
  removeFriend,
  sendFriendRequest,
  searchProfiles,
  type FriendRecord,
  type SearchableProfileRecord,
} from '@/lib/database';

type LeaderboardFriend = FriendRecord & {
  temporaryPoints: number;
};

const FRIENDS_LIMIT = 10;

function getTemporaryPoints(userId: string) {
  let score = 0;
  for (const character of userId) {
    score = (score * 31 + character.charCodeAt(0)) % 1700;
  }
  return score + 100;
}

export default function SocialPage() {
  const [friends, setFriends] = useState<LeaderboardFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isAddFriendVisible, setIsAddFriendVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchableProfileRecord[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isAddingFriend, setIsAddingFriend] = useState('');
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [openFriendMenuId, setOpenFriendMenuId] = useState('');

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadFriends = async () => {
        setFriends([]);
        setLoadError('');
        setIsLoading(true);
        try {
          const user = await getCurrentUser();
          if (!user) {
            router.replace('/');
            return;
          }

          const profiles = await getFriends();

          if (isActive) {
            setFriends(
              profiles.map((profile) => ({
                ...profile,
                temporaryPoints: getTemporaryPoints(profile.user_id),
              }))
            );
            setLoadError('');
          }
        } catch (error) {
          console.error('Unable to load social friends:', error);
          if (isActive) {
            setLoadError('Unable to load your friends. Please try again.');
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      void loadFriends();
      return () => {
        isActive = false;
      };
    }, [])
  );

  const sortedFriends = useMemo(
    () =>
      [...friends].sort(
        (first, second) =>
          second.temporaryPoints - first.temporaryPoints ||
          first.username.localeCompare(second.username)
      ),
    [friends]
  );
  const visibleFriends = showAllFriends
    ? sortedFriends
    : sortedFriends.slice(0, FRIENDS_LIMIT);

  const openAddFriend = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError('');
    setIsAddFriendVisible(true);
  };

  const handleSearch = async () => {
    const query = searchTerm.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('Enter at least 2 characters to search.');
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      setSearchResults(await searchProfiles(query));
    } catch (error) {
      console.error('Unable to search for friends:', error);
      setSearchError('Unable to search right now. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFriend = async (profile: SearchableProfileRecord) => {
    if (profile.relationship_status !== 'none') {
      return;
    }

    setIsAddingFriend(profile.user_id);
    setSearchError('');
    try {
      await sendFriendRequest(profile.user_id);
      setSearchResults((results) =>
        results.map((result) =>
          result.user_id === profile.user_id
            ? { ...result, relationship_status: 'pending_sent' }
            : result
        )
      );
    } catch (error) {
      console.error('Unable to send friend request:', error);
      setSearchError('Unable to send the friend request. Please try again.');
    } finally {
      setIsAddingFriend('');
    }
  };

  const handleUnfriend = async (friend: LeaderboardFriend) => {
    setLoadError('');
    try {
      await removeFriend(friend.user_id);
      setFriends((currentFriends) =>
        currentFriends.filter((currentFriend) => currentFriend.user_id !== friend.user_id)
      );
      setOpenFriendMenuId('');
    } catch (error) {
      console.error('Unable to unfriend user:', error);
      setLoadError('Unable to remove this friend. Please try again.');
    }
  };

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Text style={styles.title}>Friends</Text>
            </View>

            <View style={styles.leaderboardCard}>
              <View style={styles.leaderboardHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Leaderboard</Text>
                  <Text style={styles.friendCount}>
                    {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
                  </Text>
                </View>
                <View style={styles.temporaryBadge}>
                  <Text style={styles.temporaryBadgeText}>TEMP SCORES</Text>
                </View>
              </View>

              {loadError ? (
                <Text style={styles.errorText}>{loadError}</Text>
              ) : isLoading ? (
                <Text style={styles.emptyText}>Loading friends...</Text>
              ) : friends.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyTitle}>Your leaderboard starts here</Text>
                  <Text style={styles.emptyText}>
                    Add a friend to see them here. Points are placeholders for now.
                  </Text>
                </View>
              ) : (
                <>
                  {visibleFriends.map((friend, index) => (
                    <View key={friend.user_id}>
                      <View style={styles.friendRow}>
                        <Text style={styles.rank}>{index + 1}</Text>
                        <ProfileAvatar
                          uri={friend.avatar_uri}
                          name={friend.display_name || friend.username}
                          size={44}
                        />
                        <View style={styles.friendInfo}>
                          <Text style={styles.displayName} numberOfLines={1}>
                            {friend.display_name || friend.username}
                          </Text>
                          <Text style={styles.username} numberOfLines={1}>
                            @{friend.username}
                          </Text>
                        </View>
                        <View style={styles.pointsBlock}>
                          <Text style={styles.points}>
                            {friend.temporaryPoints.toLocaleString()}
                          </Text>
                          <Text style={styles.pointsLabel}>points</Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`More options for ${friend.display_name || friend.username}`}
                          accessibilityState={{ expanded: openFriendMenuId === friend.user_id }}
                          onPress={() =>
                            setOpenFriendMenuId((openId) =>
                              openId === friend.user_id ? '' : friend.user_id
                            )
                          }
                          style={styles.moreButton}
                        >
                          <Text style={styles.moreButtonText}>•••</Text>
                        </Pressable>
                      </View>
                      {openFriendMenuId === friend.user_id ? (
                        <View style={styles.friendMenu}>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => void handleUnfriend(friend)}
                            style={styles.unfriendButton}
                          >
                            <Text style={styles.unfriendText}>Unfriend</Text>
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))}

                  {sortedFriends.length > FRIENDS_LIMIT ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: showAllFriends }}
                      onPress={() => setShowAllFriends((expanded) => !expanded)}
                      style={styles.viewMoreButton}
                    >
                      <Text style={styles.viewMoreText}>
                        {showAllFriends
                          ? 'Show less'
                          : `View all ${sortedFriends.length} friends`}
                      </Text>
                      <Text style={styles.chevron}>{showAllFriends ? '⌃' : '⌄'}</Text>
                    </Pressable>
                  ) : null}
                </>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={openAddFriend}
              style={({ pressed }) => [styles.addFriendButton, pressed && styles.pressed]}
            >
              <View style={styles.addIconCircle}>
                <Text style={styles.addIcon}>+</Text>
              </View>
              <Text style={styles.addFriendText}>Add Friend</Text>
            </Pressable>
          </ScrollView>

          <BottomRibbon />
        </View>
      </SafeAreaView>

      <Modal
        visible={isAddFriendVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAddFriendVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add a friend</Text>
                <Text style={styles.modalSubtitle}>Search by username</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add friend"
                onPress={() => setIsAddFriendVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </Pressable>
            </View>

            <TextInput
              accessibilityLabel="Search username"
              value={searchTerm}
              onChangeText={(value) => {
                setSearchTerm(value);
                setSearchError('');
                setSearchResults([]);
              }}
              onSubmitEditing={() => void handleSearch()}
              placeholder="Enter a username"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              style={styles.searchInput}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void handleSearch()}
              disabled={isSearching}
              style={[styles.searchButton, isSearching && styles.disabledButton]}
            >
              <Text style={styles.searchButtonText}>
                {isSearching ? 'Searching...' : 'Search'}
              </Text>
            </Pressable>

            {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
            <ScrollView
              style={styles.results}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {searchResults.map((profile) => {
                const actionLabel =
                  profile.relationship_status === 'friends'
                    ? 'Friends'
                    : profile.relationship_status === 'pending_sent'
                      ? 'Sent'
                      : profile.relationship_status === 'pending_received'
                        ? 'Check bell'
                        : isAddingFriend === profile.user_id
                          ? 'Sending...'
                          : 'Add';
                const isUnavailable = profile.relationship_status !== 'none';
                return (
                  <View key={profile.user_id} style={styles.resultRow}>
                    <ProfileAvatar
                      uri={profile.avatar_uri}
                      name={profile.display_name || profile.username}
                      size={42}
                    />
                    <View style={styles.friendInfo}>
                      <Text style={styles.displayName} numberOfLines={1}>
                        {profile.display_name || profile.username}
                      </Text>
                      <Text style={styles.username} numberOfLines={1}>
                        @{profile.username}
                      </Text>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      disabled={isUnavailable || isAddingFriend === profile.user_id}
                      onPress={() => void handleAddFriend(profile)}
                      style={[styles.addResultButton, isUnavailable && styles.addedButton]}
                    >
                      <Text style={[styles.addResultText, isUnavailable && styles.addedText]}>
                        {actionLabel}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
              {!isSearching && searchResults.length === 0 && !searchError ? (
                <Text style={styles.searchHint}>
                  Search for at least 2 characters of a username.
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenSwipe>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 120,
  },
  header: {
    width: '100%',
    maxWidth: 520,
    marginBottom: 24,
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '700',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 6,
  },
  leaderboardCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
    shadowColor: '#111827',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '700',
  },
  friendCount: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 3,
  },
  temporaryBadge: {
    backgroundColor: '#fff7ed',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  temporaryBadgeText: {
    color: '#c2410c',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  emptyTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 7,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    lineHeight: 20,
    marginVertical: 10,
    textAlign: 'center',
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  rank: {
    width: 18,
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  friendInfo: {
    flex: 1,
    minWidth: 0,
  },
  displayName: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
  username: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 3,
  },
  pointsBlock: {
    alignItems: 'flex-end',
    minWidth: 55,
  },
  points: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  pointsLabel: {
    color: '#9ca3af',
    fontSize: 11,
    marginTop: 2,
  },
  moreButton: {
    width: 30,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  moreButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1,
  },
  friendMenu: {
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingVertical: 8,
  },
  unfriendButton: {
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  unfriendText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
    paddingVertical: 14,
  },
  viewMoreText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  chevron: {
    color: '#6b7280',
    fontSize: 18,
    lineHeight: 18,
  },
  addFriendButton: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 68,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: '#111827',
  },
  addIconCircle: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: '#ffffff',
  },
  addIcon: {
    color: '#111827',
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '400',
  },
  addFriendText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.82,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    padding: 18,
  },
  modalCard: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  modalTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
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
  searchInput: {
    color: '#111827',
    fontSize: 16,
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 10,
    marginTop: 10,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  results: {
    flexShrink: 1,
    marginTop: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e7eb',
  },
  addResultButton: {
    minWidth: 62,
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addResultText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  addedButton: {
    backgroundColor: '#f3f4f6',
  },
  addedText: {
    color: '#6b7280',
  },
  searchHint: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingVertical: 18,
  },
});
