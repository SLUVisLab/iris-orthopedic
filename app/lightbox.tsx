import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import ZoomableImage from '@/components/zoomable-image';

export default function LightboxScreen() {
  const { uri, label } = useLocalSearchParams<{ uri: string; label: string }>();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ZoomableImage uri={uri} style={styles.container} />

      {/* Overlay controls */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable style={styles.closeBtn} onPress={() => router.back()}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </Pressable>
          {label ? <ThemedText style={styles.label}>{label}</ThemedText> : null}
        </View>
        <ThemedText style={styles.hint}>Double-tap to reset · Scroll/pinch to zoom</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 16,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 40,
  },
});
