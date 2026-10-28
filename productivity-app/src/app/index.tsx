import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { createUser, initializeDatabase, isUserLoggedIn, loginUser } from '@/lib/database';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '@/lib/password-hashing';

export default function LoginScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [databaseReady, setDatabaseReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const usernameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);
  const confirmPasswordRef = useRef<TextInput | null>(null);

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
          setError('Unable to initialize account storage.');
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

    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      setError('Enter a username.');
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
        const created = await createUser(trimmedUsername, password);
        if (created) {
          router.replace('/home');
          return;
        }
        setError('That username is already in use.');
        usernameRef.current?.focus();
      } else {
        const isValid = await loginUser(trimmedUsername, password);
        if (isValid) {
          router.replace('/home');
          return;
        }
        setPassword('');
        setError('Unsuccessful login: username or password incorrect.');
        usernameRef.current?.focus();
      }
    } catch (submitError) {
      console.error('Account submission failed:', submitError);
      setError('Unable to access your account. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
});
