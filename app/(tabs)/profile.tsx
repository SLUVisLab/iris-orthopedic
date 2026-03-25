import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  if (!user) return null;

  const createdAt = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString()
    : 'Unknown';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Avatar */}
        {user.photoURL && (
          <Image source={{ uri: user.photoURL }} style={styles.avatar} />
        )}

        <ThemedText type="title" style={styles.name}>
          {user.displayName ?? 'User'}
        </ThemedText>

        {/* Info rows */}
        <ThemedView style={styles.infoCard}>
          <InfoRow label="Email" value={user.email ?? '—'} />
          <View style={styles.divider} />
          <InfoRow label="Member since" value={createdAt} />
          <View style={styles.divider} />
          <InfoRow label="User ID" value={user.uid} />
        </ThemedView>

        {/* Sign out */}
        <Pressable
          style={[styles.signOutBtn, { borderColor: tint }]}
          onPress={handleSignOut}
        >
          <ThemedText style={[styles.signOutText, { color: tint }]}>Sign Out</ThemedText>
        </Pressable>
      </ThemedView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <ThemedText style={styles.infoLabel}>{label}</ThemedText>
      <ThemedText style={styles.infoValue} numberOfLines={1}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  name: {
    marginBottom: 8,
  },
  infoCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.6,
  },
  infoValue: {
    fontSize: 14,
    flexShrink: 1,
    textAlign: 'right',
    maxWidth: '60%',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e2e8f0',
  },
  signOutBtn: {
    marginTop: 16,
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 32,
    paddingVertical: 10,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 15,
  },
});
