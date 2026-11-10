import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { createUser, initializeDatabase, isUserLoggedIn, loginUser } from '@/lib/database';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/password-hashing';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationModalVisible, setConfirmationModalVisible] = useState(false);
  const [error, setError] = useState('');
  const [databaseReady, setDatabaseReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const emailRef = useRef<TextInput | null>(null);
  const usernameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);
  const [screenOpacity] = useState(() => new Animated.Value(1));

  const transitionToHome = () =>
    new Promise<void>((resolve) => {
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          router.replace({ pathname: '/home', params: { fadeIn: 'true' } });
        }
        resolve();
      });
    });

  const closeConfirmationModal = () => {
    setConfirmationModalVisible(false);
    setMode('login');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  useEffect(() => {
    let isActive = true;

    initializeDatabase()
      .then(async () => {
        const loggedIn = await isUserLoggedIn();
        if (loggedIn) {
          router.replace('/home');
          return;
        }
        if (isActive) {
          setDatabaseReady(true);
        }
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
        if (isActive) {
          setError(error instanceof Error ? error.message : 'Unable to initialize account storage.');
        }
      });
    return () => {
      isActive = false;
    };
  }, []);

  const handleSubmit = async () => {
    if (!databaseReady || isSubmitting) {
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email address.');
      emailRef.current?.focus();
      return;
    }

    const trimmedUsername = username.trim().toLowerCase();
    if (mode === 'signup' && !trimmedUsername) {
      setError('Choose a username.');
      usernameRef.current?.focus();
      return;
    }

    if (mode === 'signup') {
      const passwordLength = Array.from(password).length;
      if (passwordLength < MIN_PASSWORD_LENGTH || passwordLength > MAX_PASSWORD_LENGTH) {
        setError(`Password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters.`);
        passwordRef.current?.focus();
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signup') {
        const created = await createUser(trimmedUsername, trimmedEmail, password);
        if (created) {
          await transitionToHome();
          return;
        }
        setError('');
        setPassword('');
        setConfirmationModalVisible(true);
      } else {
        const isValid = await loginUser(trimmedEmail, password);
        if (isValid) {
          await transitionToHome();
          return;
        }
        setPassword('');
        setError('Unsuccessful login: email or password incorrect.');
        emailRef.current?.focus();
      }
    } catch (submitError) {
      console.error('Account submission failed:', submitError);
      const isEmailRateLimited =
        submitError instanceof Error && /email rate limit exceeded|too many requests/i.test(submitError.message);
      const isInvalidEmail =
        submitError instanceof Error &&
        /email address .* is invalid|invalid email/i.test(submitError.message);
      setError(
        isEmailRateLimited
          ? 'Confirmation emails are temporarily rate-limited. Wait before retrying, or configure custom SMTP in Supabase.'
          : isInvalidEmail
            ? 'Supabase rejected this email address. Check it and try another.'
            : 'Unable to access your account. Try again.'
      );
      if (isInvalidEmail) {
        emailRef.current?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: screenOpacity }}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>{mode === 'login' ? 'Login' : 'Create account'}</Text>

        <View style={styles.modeButtons} accessibilityRole="tablist">
          {([
            { label: 'Login', value: 'login' },
            { label: 'Create account', value: 'signup' },
          ] as const).map((option) => {
            const selected = mode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setMode(option.value);
                  setConfirmPassword('');
                  setError('');
                }}
                style={[styles.modeButton, selected && styles.selectedModeButton]}
              >
                <Text style={[styles.modeButtonText, selected && styles.selectedModeButtonText]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          ref={emailRef}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            if (error) {
              setError('');
            }
          }}
          placeholder="Email address"
          accessibilityLabel="Email address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() =>
            mode === 'signup' ? usernameRef.current?.focus() : passwordRef.current?.focus()
          }
          style={styles.input}
        />

        {mode === 'signup' ? (
          <TextInput
            ref={usernameRef}
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              if (error) {
                setError('');
              }
            }}
            placeholder="Username"
            accessibilityLabel="Username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            style={styles.input}
          />
        ) : null}

        <TextInput
          ref={passwordRef}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            if (error) {
              setError('');
            }
          }}
          placeholder="Password"
          accessibilityLabel="Password"
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={mode === 'signup' ? 'next' : 'done'}
          maxLength={mode === 'signup' ? MAX_PASSWORD_LENGTH : undefined}
          onSubmitEditing={() =>
            mode === 'signup' ? confirmPasswordRef.current?.focus() : void handleSubmit()
          }
          style={styles.input}
        />

        {mode === 'signup' ? (
          <TextInput
            ref={confirmPasswordRef}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (error) {
                setError('');
              }
            }}
            placeholder="Confirm password"
            accessibilityLabel="Confirm password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            maxLength={MAX_PASSWORD_LENGTH}
            onSubmitEditing={() => void handleSubmit()}
            style={styles.input}
          />
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={!databaseReady || isSubmitting}
          onPress={() => void handleSubmit()}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            (!databaseReady || isSubmitting) && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.buttonText}>
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </Text>
        </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </SafeAreaView>

      <Modal
        visible={confirmationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeConfirmationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationDialog}>
            <Text style={styles.confirmationTitle}>Check your email</Text>
            <Text style={styles.confirmationMessage}>
              We sent a confirmation link to {email.trim()}. Confirm your email address, then log in.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={closeConfirmationModal}
              style={styles.confirmationButton}
            >
              <Text style={styles.confirmationButtonText}>Continue to login</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
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
  modeButtons: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 3,
    borderRadius: 9,
    backgroundColor: '#f3f4f6',
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    borderRadius: 7,
  },
  selectedModeButton: {
    backgroundColor: '#ffffff',
  },
  modeButtonText: {
    color: '#4b5563',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedModeButtonText: {
    color: '#111827',
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
  button: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#b91c1c',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'rgba(17, 24, 39, 0.48)',
  },
  confirmationDialog: {
    width: '100%',
    maxWidth: 360,
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 8,
  },
  confirmationTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  confirmationMessage: {
    color: '#374151',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  confirmationButton: {
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 8,
    marginTop: 20,
    paddingVertical: 12,
  },
  confirmationButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
