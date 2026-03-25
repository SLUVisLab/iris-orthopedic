import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Google from 'expo-auth-session/providers/google';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import {
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup,
} from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { auth } from '@/firebase';
import { useThemeColor } from '@/hooks/use-theme-color';

// Complete any pending auth sessions (needed for native redirect flow)
if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

// Web client ID from Firebase Console → Authentication → Google provider → Web SDK config
const GOOGLE_WEB_CLIENT_ID = '727915261975-lg6u1f2dnnbmc1je0jga37rnmacklf88.apps.googleusercontent.com';

const BRAND_NAVY = '#1a365d';

export default function LoginScreen() {
  const tint = useThemeColor({}, 'tint');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // expo-auth-session for native only
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // iosClientId: '<your-ios-client-id>.apps.googleusercontent.com',
    // androidClientId: '<your-android-client-id>.apps.googleusercontent.com',
  });

  // Handle native auth response
  useEffect(() => {
    if (Platform.OS === 'web' || !response) return;

    if (response.type === 'success') {
      setLoading(true);
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .catch((err) => {
          console.error('Firebase credential error:', err);
          setError('Sign-in failed. Please try again.');
        })
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      setError(response.error?.message ?? 'Sign-in failed.');
    }
  }, [response]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        // Web: use Firebase signInWithPopup (handles COOP properly)
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        await signInWithPopup(auth, provider);
      } else {
        // Native: use expo-auth-session
        setLoading(false);
        promptAsync();
        return;
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message ?? 'Sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top section — icon */}
      <View style={styles.topSection}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          contentFit="contain"
        />
      </View>

      {/* Middle section — text */}
      <View style={styles.midSection}>
        <ThemedText style={styles.title}>OrthoScrew ID</ThemedText>
        <ThemedText style={styles.subtitle}>Sign in to continue</ThemedText>
      </View>

      {/* Bottom section — providers */}
      <View style={styles.bottomSection}>
        <View style={styles.providers}>
          {/* Google */}
          <Pressable
            style={[styles.providerBtn, { borderColor: tint }]}
            onPress={handleGoogleSignIn}
            disabled={!request || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={tint} />
            ) : (
              <>
                <MaterialIcons name="login" size={20} color={tint} />
                <ThemedText style={[styles.providerText, { color: tint }]}>
                  Continue with Google
                </ThemedText>
              </>
            )}
          </Pressable>

          {/* Add more providers here — Apple, email/password, etc. */}
        </View>

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  icon: {
    width: 160,
    height: 160,
  },
  midSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: BRAND_NAVY,
    fontFamily: Fonts?.serif,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BRAND_NAVY,
    opacity: 0.5,
  },
  bottomSection: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingHorizontal: 20,
  },
  providers: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  providerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 50,
  },
  providerText: {
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: '#dc2626',
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
  },
});
