import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { firebase } from '@/firebase';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';

export default function LoginScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS !== 'web' || !containerRef.current) return;

    // Dynamic imports — firebaseui and its CSS are web-only
    const firebaseui = require('firebaseui');
    require('firebaseui/dist/firebaseui.css');

    const ui =
      firebaseui.auth.AuthUI.getInstance() ||
      new firebaseui.auth.AuthUI(firebase.auth());

    ui.start(containerRef.current, {
      signInFlow: 'popup',
      signInOptions: [
        {
          provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID,
          customParameters: {
            prompt: 'select_account',
          },
        },
      ],
      callbacks: {
        signInSuccessWithAuthResult: () => {
          router.replace('/(tabs)');
          return false; // prevent redirect — we handle navigation ourselves
        },
      },
    });

    return () => {
      ui.reset();
    };
  }, [router]);

  if (Platform.OS !== 'web') {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="title">Login</ThemedText>
        <ThemedText>Native sign-in not yet implemented</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.heading}>
        Sign in to Iris Orthopedic
      </ThemedText>
      <div ref={containerRef} id="firebaseui-auth-container" />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  heading: {
    marginBottom: 24,
  },
});
