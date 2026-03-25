import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Client, handle_file } from '@gradio/client';
import { Image as RNImage } from 'expo-image';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ImageCropper from '@/components/image-cropper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

const BRAND_NAVY = '#1a365d';

type CropRegion = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

type SimilarCase = {
  manufacturer: string;
  score: number;
  ap_url: string;
  lat_url: string;
};

type PredictionResult = {
  manufacturer: string;
  confidence: number;
  similar: SimilarCase[];
};

export default function SearchScreen() {
  const [apImageUri, setApImageUri] = useState<string | null>(null);
  const [latImageUri, setLatImageUri] = useState<string | null>(null);
  const [apCrop, setApCrop] = useState<CropRegion | null>(null);
  const [latCrop, setLatCrop] = useState<CropRegion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PredictionResult[] | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const tint = useThemeColor({}, 'tint');
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && windowWidth > 600;

  const openCompare = (sim: SimilarCase) => {
    router.push({
      pathname: '/compare',
      params: {
        apUri: apImageUri!,
        latUri: latImageUri!,
        refApUrl: sim.ap_url,
        refLatUrl: sim.lat_url,
        manufacturer: sim.manufacturer,
        score: String(sim.score),
      },
    });
  };

  const pickFromLibrary = async (setUri: (uri: string | null) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUri(result.assets[0].uri);
    }
  };

  const takePhoto = async (setUri: (uri: string | null) => void) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      setError('Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      setUri(result.assets[0].uri);
    }
  };

  const getCroppedUri = async (uri: string, crop: CropRegion): Promise<string> => {
    const manipulated = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop }],
      { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulated.uri;
  };

  const uriToBlob = async (uri: string): Promise<Blob> => {
    const response = await fetch(uri);
    return response.blob();
  };

  const analyze = async () => {
    if (!apImageUri || !latImageUri || !apCrop || !latCrop) return;

    setLoading(true);
    setError(null);

    // Polyfill Buffer check for @gradio/client in browser environment
    if (typeof globalThis.Buffer === 'undefined') {
      globalThis.Buffer = class {} as never;
    }

    try {
      const apCroppedUri = await getCroppedUri(apImageUri, apCrop);
      const latCroppedUri = await getCroppedUri(latImageUri, latCrop);

      const apBlob = await uriToBlob(apCroppedUri);
      const latBlob = await uriToBlob(latCroppedUri);

      const client = await Client.connect('austin-carnahan/orthopedic-screw-identification');
      const result = await client.predict('/predict', {
        ap_editor: {
          background: handle_file(apBlob),
          layers: [],
          composite: handle_file(apBlob),
        },
        lat_editor: {
          background: handle_file(latBlob),
          layers: [],
          composite: handle_file(latBlob),
        },
      });

      const data = result.data as { results: PredictionResult[] }[];
      const predictions = data[0].results;
      setResults(predictions);
      setSelectedIdx(0);
      console.log('Prediction result:', JSON.stringify(predictions, null, 2));
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setApImageUri(null);
    setLatImageUri(null);
    setApCrop(null);
    setLatCrop(null);
    setError(null);
    setResults(null);
    setSelectedIdx(0);
  };

  const canAnalyze = !!apImageUri && !!latImageUri && !!apCrop && !!latCrop && !loading;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <RNImage
            source={require('@/assets/images/icon.png')}
            style={styles.headerIcon}
          />
          <ThemedText style={styles.brandTitle}>OrthoScrew ID</ThemedText>
        </View>

        {/* AP View */}
        <ThemedView style={styles.card}>
          {!apImageUri ? (
            <UploadBox
              label="AP View"
              onTakePhoto={() => takePhoto(setApImageUri)}
              onChooseLibrary={() => pickFromLibrary(setApImageUri)}
              tint={tint}
            />
          ) : (
            <View style={styles.cropSection}>
              <ImageCropper
                imageUri={apImageUri}
                label="Crop AP Screw"
                onCropChange={setApCrop}
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => { setApImageUri(null); setApCrop(null); }}
              >
                <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>

        {/* Lateral View */}
        <ThemedView style={styles.card}>
          {!latImageUri ? (
            <UploadBox
              label="Lateral View"
              onTakePhoto={() => takePhoto(setLatImageUri)}
              onChooseLibrary={() => pickFromLibrary(setLatImageUri)}
              tint={tint}
            />
          ) : (
            <View style={styles.cropSection}>
              <ImageCropper
                imageUri={latImageUri}
                label="Crop Lateral Screw"
                onCropChange={setLatCrop}
              />
              <Pressable
                style={styles.removeBtn}
                onPress={() => { setLatImageUri(null); setLatCrop(null); }}
              >
                <ThemedText style={styles.removeBtnText}>Remove</ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.analyzeBtn, { backgroundColor: tint, opacity: canAnalyze ? 1 : 0.4 }]}
            onPress={analyze}
            disabled={!canAnalyze}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.analyzeBtnText}>Identify Manufacturer</ThemedText>
            )}
          </Pressable>

          {(apImageUri || latImageUri) && (
            <Pressable style={styles.resetBtn} onPress={reset}>
              <ThemedText style={styles.resetBtnText}>Reset</ThemedText>
            </Pressable>
          )}
        </View>

        {error && (
          <ThemedView style={styles.errorBox}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </ThemedView>
        )}

        {/* Results */}
        {results && (
          <View style={styles.resultSection}>
            <ThemedText type="defaultSemiBold" style={styles.resultHeading}>
              Predicted Manufacturers
            </ThemedText>

            {/* Prediction list */}
            <View style={styles.predictionList}>
              {results.map((item, idx) => (
                <Pressable
                  key={item.manufacturer}
                  style={[
                    styles.predictionItem,
                    selectedIdx === idx && { borderColor: tint, backgroundColor: tint + '10' },
                  ]}
                  onPress={() => setSelectedIdx(idx)}
                >
                  <View style={styles.predInfo}>
                    <ThemedText style={styles.predName}>{item.manufacturer}</ThemedText>
                    <ThemedText style={[styles.predConf, { color: tint }]}>
                      {(item.confidence * 100).toFixed(1)}%
                    </ThemedText>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${item.confidence * 100}%` },
                      ]}
                    />
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Similar cases */}
            {results[selectedIdx]?.similar?.length > 0 && (
              <View style={styles.similarSection}>
                <ThemedText style={styles.similarHeading}>
                  Similar Cases ({results[selectedIdx].manufacturer})
                </ThemedText>
                {isWide ? (
                  <View style={styles.similarGrid}>
                    {results[selectedIdx].similar.map((sim, idx) => (
                      <Pressable key={idx} style={[styles.similarItem, styles.similarItemWide]} onPress={() => openCompare(sim)}>
                        <View style={styles.similarImgs}>
                          <RNImage
                            source={{ uri: sim.ap_url }}
                            style={styles.similarImg}
                            contentFit="cover"
                          />
                          <RNImage
                            source={{ uri: sim.lat_url }}
                            style={styles.similarImg}
                            contentFit="cover"
                          />
                        </View>
                        <ThemedText style={styles.similarLabel}>AP / Lateral</ThemedText>
                        <ThemedText style={styles.similarScore}>
                          Similarity: {sim.score.toFixed(3)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.similarList}
                  >
                    {results[selectedIdx].similar.map((sim, idx) => (
                      <Pressable key={idx} style={styles.similarItem} onPress={() => openCompare(sim)}>
                        <View style={styles.similarImgs}>
                          <RNImage
                            source={{ uri: sim.ap_url }}
                            style={styles.similarImg}
                            contentFit="cover"
                          />
                          <RNImage
                            source={{ uri: sim.lat_url }}
                            style={styles.similarImg}
                            contentFit="cover"
                          />
                        </View>
                        <ThemedText style={styles.similarLabel}>AP / Lateral</ThemedText>
                        <ThemedText style={styles.similarScore}>
                          Similarity: {sim.score.toFixed(3)}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}

        {/* Disclaimer */}
        <ThemedText style={styles.disclaimer}>
          <ThemedText style={[styles.disclaimer, { fontWeight: '700' }]}>Disclaimer: </ThemedText>
          This tool is provided for assistive use only and does not constitute medical advice or
          diagnosis. AI predictions may contain errors. The operating physician assumes full
          responsibility for the final identification of any implant.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

function UploadBox({ label, onTakePhoto, onChooseLibrary, tint }: {
  label: string;
  onTakePhoto: () => void;
  onChooseLibrary: () => void;
  tint: string;
}) {
  return (
    <View style={styles.uploadBox}>
      <Pressable style={styles.cameraIconBtn} onPress={onTakePhoto}>
        <MaterialIcons name="photo-camera" size={26} color={tint} />
      </Pressable>
      <ThemedText type="defaultSemiBold">{label}</ThemedText>
      <Pressable style={[styles.chooseBtn, { borderColor: tint }]} onPress={onChooseLibrary}>
        <ThemedText style={[styles.chooseBtnText, { color: tint }]}>Select a Photo</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: BRAND_NAVY,
    fontFamily: Fonts?.serif,
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadBox: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 24,
    position: 'relative',
    width: '100%',
  },
  cameraIconBtn: {
    position: 'absolute',
    bottom: 4,
    right: -4,
    padding: 8,
  },
  chooseBtn: {
    borderWidth: 2,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  chooseBtnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  cropSection: {
    alignItems: 'center',
    gap: 12,
  },
  removeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  removeBtnText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 14,
  },
  actions: {
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  analyzeBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
  },
  analyzeBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  resetBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  resetBtnText: {
    fontWeight: '600',
    fontSize: 14,
    opacity: 0.6,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  disclaimer: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.5,
    textAlign: 'center',
  },
  resultSection: {
    gap: 16,
  },
  resultHeading: {
    fontSize: 16,
    marginBottom: 4,
  },
  predictionList: {
    gap: 10,
  },
  predictionItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  predInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  predName: {
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  predConf: {
    fontWeight: '700',
    fontSize: 15,
    fontFamily: 'monospace' as never,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 4,
  },
  similarSection: {
    marginTop: 4,
  },
  similarHeading: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  similarGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  similarList: {
    gap: 12,
    paddingBottom: 4,
  },
  similarItem: {
    width: 200,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  similarItemWide: {
    flex: 1,
    width: undefined,
  },
  similarImgs: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  similarImg: {
    width: 85,
    height: 85,
    borderRadius: 4,
  },
  similarLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  similarScore: {
    fontSize: 12,
    opacity: 0.5,
  },
});
