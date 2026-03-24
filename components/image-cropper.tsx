import { ThemedText } from '@/components/themed-text';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';

const CROP_SIZE = Math.min(Dimensions.get('window').width - 64, 320);

type CropRegion = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

type Props = {
  imageUri: string;
  label: string;
  onCropChange: (crop: CropRegion) => void;
};

export default function ImageCropper({ imageUri, label, onCropChange }: Props) {
  const [imageLayout, setImageLayout] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const cropWindowRef = useRef<View>(null);

  // Shared values for gesture transforms
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const computeCrop = useCallback(() => {
    if (!imageLayout) return;

    // The image is displayed to fill the crop box, so we need the display scale
    const displayScale = Math.max(
      CROP_SIZE / imageLayout.width,
      CROP_SIZE / imageLayout.height
    );
    const totalScale = displayScale * scale.value;

    // The visible crop square maps to these pixel coords in the original image
    const cropPixelSize = CROP_SIZE / totalScale;
    const centerX = imageLayout.width / 2 - translateX.value / totalScale;
    const centerY = imageLayout.height / 2 - translateY.value / totalScale;

    const originX = Math.max(0, centerX - cropPixelSize / 2);
    const originY = Math.max(0, centerY - cropPixelSize / 2);
    const width = Math.min(cropPixelSize, imageLayout.width - originX);
    const height = Math.min(cropPixelSize, imageLayout.height - originY);

    onCropChange({
      originX: Math.round(originX),
      originY: Math.round(originY),
      width: Math.round(width),
      height: Math.round(height),
    });
  }, [imageLayout, scale, translateX, translateY, onCropChange]);

  // --- Mouse support for web ---
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = cropWindowRef.current as unknown as HTMLElement | null;
    if (!node) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(1, Math.min(10, scale.value * zoomDelta));
      scale.value = newScale;
      savedScale.value = newScale;
      computeCrop();
    };

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault(); // prevent text/image selection
      isDragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      translateX.value += dx;
      translateY.value += dy;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        computeCrop();
      }
    };

    const onDragStart = (e: DragEvent) => {
      e.preventDefault(); // prevent native image drag ghost
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('dragstart', onDragStart);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('mousedown', onMouseDown);
      node.removeEventListener('dragstart', onDragStart);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [computeCrop, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const panGesture = Gesture.Pan()
    .enabled(Platform.OS !== 'web') // on web, mouse handlers manage panning
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      computeCrop();
    });

  const pinchEnabled = Gesture.Pinch()
    .enabled(Platform.OS !== 'web') // on web, wheel handler manages zoom
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(10, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchEnabled, panGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleImageLoad = (e: { source: { width: number; height: number } }) => {
    const { width, height } = e.source;
    setImageLayout({ width, height });
    // Fire initial crop covering the center square
    const displayScale = Math.max(CROP_SIZE / width, CROP_SIZE / height);
    const cropPixelSize = CROP_SIZE / displayScale;
    const originX = Math.max(0, (width - cropPixelSize) / 2);
    const originY = Math.max(0, (height - cropPixelSize) / 2);
    onCropChange({
      originX: Math.round(originX),
      originY: Math.round(originY),
      width: Math.round(Math.min(cropPixelSize, width)),
      height: Math.round(Math.min(cropPixelSize, height)),
    });
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {label}
      </ThemedText>
      <View ref={cropWindowRef} style={styles.cropWindow}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.imageWrapper, animatedStyle]}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              contentFit="contain"
              onLoad={handleImageLoad}
            />
          </Animated.View>
        </GestureDetector>
        {/* Crop overlay — non-interactive border showing the crop zone */}
        <View style={styles.cropOverlay} pointerEvents="none">
          <View style={styles.cropBorder} />
        </View>
      </View>
      <ThemedText style={styles.hint}>
        {Platform.OS === 'web'
          ? 'Scroll to zoom, click and drag to position'
          : 'Pinch to zoom, drag to position'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 8,
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 13,
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  cropWindow: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  imageWrapper: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: CROP_SIZE,
    height: CROP_SIZE,
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropBorder: {
    width: CROP_SIZE - 16,
    height: CROP_SIZE - 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  hint: {
    fontSize: 12,
    opacity: 0.5,
  },
});
