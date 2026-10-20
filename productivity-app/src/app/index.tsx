import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { initializeDatabase, isUserLoggedIn, loginUser } from '@/lib/database';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const usernameRef = useRef<TextInput | null>(null);
  const passwordRef = useRef<TextInput | null>(null);

  useEffect(() => {
    initializeDatabase()
      .then(async () => {
        const loggedIn = await isUserLoggedIn();
        if (loggedIn) {
          router.replace('/home');
        }
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
      });
  }, []);

  const handleLogin = async () => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    const isValid = await loginUser(trimmedUsername, trimmedPassword);

    if (isValid) {
      router.replace('/home');
      return;
    }

    setUsername('');
    setPassword('');
    setError('Unsuccessful login: username or password incorrect.');
    usernameRef.current?.focus();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>Login</Text>

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
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          style={styles.input}
        />

        <Pressable onPress={handleLogin} style={styles.button}>
          <Text style={styles.buttonText}>Login</Text>
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
