import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import ZoomableImage from '@/components/zoomable-image';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function CompareScreen() {
  const params = useLocalSearchParams<{
    apUri: string;
    latUri: string;
    refApUrl: string;
    refLatUrl: string;
    manufacturer: string;
    score: string;
  }>();
  const router = useRouter();
  const tint = useThemeColor({}, 'tint');
  const { width } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width > 600;

  const openLightbox = (uri: string, label: string) => {
    router.push({
      pathname: '/lightbox',
      params: { uri, label },
    });
  };

  const images = [
    { uri: params.apUri, label: 'Your AP' },
    { uri: params.refApUrl, label: 'Reference AP' },
    { uri: params.latUri, label: 'Your Lateral' },
    { uri: params.refLatUrl, label: 'Reference Lateral' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={tint} />
        </Pressable>
        <View style={styles.headerText}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {params.manufacturer}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Similarity: {parseFloat(params.score).toFixed(3)}
          </ThemedText>
        </View>
      </View>

      {isWide ? (
        /* Wide layout: 2×2 grid */
        <View style={styles.grid}>
          {/* AP column */}
          <View style={styles.gridCol}>
            <ThemedText style={styles.colLabel}>AP</ThemedText>
            <ImageCell uri={params.apUri} label="Your AP" onTap={openLightbox} />
            <ImageCell uri={params.refApUrl} label="Reference AP" onTap={openLightbox} />
          </View>
          {/* Lateral column */}
          <View style={styles.gridCol}>
            <ThemedText style={styles.colLabel}>Lateral</ThemedText>
            <ImageCell uri={params.latUri} label="Your Lateral" onTap={openLightbox} />
            <ImageCell uri={params.refLatUrl} label="Reference Lateral" onTap={openLightbox} />
          </View>
        </View>
      ) : (
        /* Narrow layout: vertical stack */
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <ThemedText style={styles.sectionLabel}>AP Comparison</ThemedText>
          <ImageCell uri={params.apUri} label="Your AP" onTap={openLightbox} />
          <ImageCell uri={params.refApUrl} label="Reference AP" onTap={openLightbox} />

          <ThemedText style={[styles.sectionLabel, { marginTop: 20 }]}>
            Lateral Comparison
          </ThemedText>
          <ImageCell uri={params.latUri} label="Your Lateral" onTap={openLightbox} />
          <ImageCell uri={params.refLatUrl} label="Reference Lateral" onTap={openLightbox} />
        </ScrollView>
      )}

      <ThemedText style={styles.hint}>Scroll to zoom · Drag to pan · Double-tap to reset</ThemedText>
    </SafeAreaView>
  );
}

function ImageCell({
  uri,
  label,
  onTap,
}: {
  uri: string;
  label: string;
  onTap: (uri: string, label: string) => void;
}) {
  return (
    <View style={styles.cell}>
      <View style={styles.cellHeader}>
        <ThemedText style={styles.cellLabel}>{label}</ThemedText>
        <Pressable onPress={() => onTap(uri, label)} hitSlop={8}>
          <MaterialIcons name="fullscreen" size={22} color="#666" />
        </Pressable>
      </View>
      <View style={styles.cellImage}>
        <ZoomableImage uri={uri} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.5,
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  gridCol: {
    flex: 1,
    gap: 8,
  },
  colLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 8,
  },
  cell: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    backgroundColor: '#000',
    minHeight: 180,
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cellLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  cellImage: {
    flex: 1,
  },
  hint: {
    fontSize: 11,
    opacity: 0.4,
    textAlign: 'center',
    paddingVertical: 8,
  },
});
