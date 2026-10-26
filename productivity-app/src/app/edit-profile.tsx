import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ProfileAvatar } from '@/components/profile-avatar';
import { getProfile, saveProfile } from '@/lib/database';

const DISPLAY_NAME_MAX_LENGTH = 40;
const ABOUT_ME_MAX_LENGTH = 300;

export default function EditProfileScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    getProfile()
      .then((profile) => {
        if (!profile) {
          router.replace('/');
          return;
        }

        setUsername(profile.username);
        setDisplayName(profile.display_name);
        setAboutMe(profile.about_me);
        setAvatarUri(profile.avatar_uri);
      })
      .catch((loadError) => {
        console.error('Failed to load profile:', loadError);
      });
  }, []);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];
    if (asset.base64) {
      setAvatarUri(`data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`);
    } else {
      setAvatarUri(asset.uri);
    }
  };

  const handleSave = async () => {
    const trimmedDisplayName = displayName.trim();
    const trimmedAboutMe = aboutMe.trim();

    if (!trimmedDisplayName) {
      setError('Display name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await saveProfile({
        display_name: trimmedDisplayName,
        about_me: trimmedAboutMe,
        avatar_uri: avatarUri,
      });
      router.back();
    } catch (saveError) {
      console.error('Failed to save profile:', saveError);
      setError('Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Edit Profile</Text>

            <View style={styles.avatarSection}>
              <ProfileAvatar uri={avatarUri} name={displayName || username} size={104} />
              <View style={styles.avatarActions}>
                <Pressable onPress={handlePickPhoto} style={styles.smallButton}>
                  <Text style={styles.smallButtonText}>Change photo</Text>
                </Pressable>
                {avatarUri ? (
                  <Pressable onPress={() => setAvatarUri('')} style={styles.smallButton}>
                    <Text style={styles.smallButtonText}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Text style={styles.label}>Display name</Text>
            <TextInput
              value={displayName}
              onChangeText={(value) => {
                setDisplayName(value);
                if (error) {
                  setError('');
                }
              }}
              placeholder={username || 'Your name'}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              autoCorrect={false}
              returnKeyType="next"
              style={styles.input}
            />

            <View style={styles.labelRow}>
              <Text style={styles.label}>About Me</Text>
              <Text style={styles.counter}>
                {aboutMe.length}/{ABOUT_ME_MAX_LENGTH}
              </Text>
            </View>
            <TextInput
              value={aboutMe}
              onChangeText={setAboutMe}
              placeholder="Share your goals, interests, or what you're working on."
              maxLength={ABOUT_ME_MAX_LENGTH}
              multiline
              textAlignVertical="top"
              style={[styles.input, styles.multilineInput]}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={[styles.button, isSaving && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
            </Pressable>

            <Pressable onPress={() => router.back()} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  smallButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  counter: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  multilineInput: {
    minHeight: 120,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
    marginBottom: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});
