import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { BottomRibbon } from '@/components/bottom-ribbon';
import { ProfileAvatar } from '@/components/profile-avatar';
import { ScreenSwipe } from '@/components/screen-swipe';
import { getProfile, isUserLoggedIn, logoutUser, type ProfileRecord } from '@/lib/database';

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);

  useEffect(() => {
    isUserLoggedIn().then((loggedIn) => {
      if (!loggedIn) {
        router.replace('/');
      }
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      getProfile()
        .then(setProfile)
        .catch((error) => {
          console.error('Failed to load profile:', error);
        });
    }, [])
  );

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/');
  };

  const username = profile?.username ?? '';
  const displayName = profile?.display_name || username;
  const aboutMe = profile?.about_me ?? '';

  return (
    <ScreenSwipe>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <ProfileAvatar uri={profile?.avatar_uri ?? ''} name={displayName} size={112} />

            <Text style={styles.displayName}>{displayName}</Text>
            {username ? <Text style={styles.username}>@{username}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>About Me</Text>
              {aboutMe ? (
                <Text style={styles.aboutText}>{aboutMe}</Text>
              ) : (
                <Text style={styles.placeholderText}>
                  Tell others about yourself. Tap Edit Profile to add an About Me section.
                </Text>
              )}
            </View>

            <Pressable onPress={() => router.push('/edit-profile')} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Edit Profile</Text>
            </Pressable>

            <Pressable onPress={handleLogout} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Logout</Text>
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 120,
  },
  displayName: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
    color: '#111827',
    textAlign: 'center',
  },
  username: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  aboutText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#374151',
  },
  placeholderText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 480,
    marginTop: 24,
    backgroundColor: '#111827',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 480,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
});
