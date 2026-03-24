import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ImageCropper from '@/components/image-cropper';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

type CropRegion = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

export default function SearchScreen() {
  const [apImageUri, setApImageUri] = useState<string | null>(null);
  const [latImageUri, setLatImageUri] = useState<string | null>(null);
  const [apCrop, setApCrop] = useState<CropRegion | null>(null);
  const [latCrop, setLatCrop] = useState<CropRegion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tint = useThemeColor({}, 'tint');

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

  const analyze = async () => {
    if (!apImageUri || !latImageUri || !apCrop || !latCrop) return;

    setLoading(true);
    setError(null);

    try {
      const apCroppedUri = await getCroppedUri(apImageUri, apCrop);
      const latCroppedUri = await getCroppedUri(latImageUri, latCrop);

      // TODO: Send cropped images to /predict API
      // For now just log that cropping succeeded
      console.log('Cropped AP:', apCroppedUri);
      console.log('Cropped Lateral:', latCroppedUri);
    } catch (err) {
      console.error(err);
      setError('Failed to process images.');
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
          <ThemedText type="title">OrthoScrew ID</ThemedText>
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
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
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
});
