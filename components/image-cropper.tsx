import { ThemedText } from '@/components/themed-text';
import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue
} from 'react-native-reanimated';

const MAX_CROP = 320;

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
  const { width: windowWidth } = useWindowDimensions();
  // Responsive crop size: fit within card padding (20px each side) + some gap
  const cropSize = Math.min(windowWidth - 80, MAX_CROP);

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

    const displayScale = Math.max(
      cropSize / imageLayout.width,
      cropSize / imageLayout.height
    );
    const totalScale = displayScale * scale.value;

    const cropPixelSize = cropSize / totalScale;
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
  }, [imageLayout, cropSize, scale, translateX, translateY, onCropChange]);

  // --- Web: mouse + touch support ---
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
      e.preventDefault();
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
      e.preventDefault();
    };

    // Touch handlers for mobile browsers
    let activeTouches: Touch[] = [];
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDist = 0;

    const getTouchDist = (t1: Touch, t2: Touch) =>
      Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      activeTouches = Array.from(e.touches);
      if (activeTouches.length === 1) {
        lastTouchX = activeTouches[0].clientX;
        lastTouchY = activeTouches[0].clientY;
      } else if (activeTouches.length === 2) {
        initialPinchDist = getTouchDist(activeTouches[0], activeTouches[1]);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touches = Array.from(e.touches);
      if (touches.length === 1) {
        const dx = touches[0].clientX - lastTouchX;
        const dy = touches[0].clientY - lastTouchY;
        lastTouchX = touches[0].clientX;
        lastTouchY = touches[0].clientY;
        translateX.value += dx;
        translateY.value += dy;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else if (touches.length === 2 && initialPinchDist > 0) {
        const dist = getTouchDist(touches[0], touches[1]);
        const pinchScale = dist / initialPinchDist;
        const next = Math.max(1, Math.min(10, savedScale.value * pinchScale));
        scale.value = next;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      // Save scale when transitioning out of a pinch (2+ fingers → fewer than 2)
      if (e.touches.length < 2 && activeTouches.length >= 2) {
        savedScale.value = scale.value;
      }
      // When one finger remains after a pinch, reset its position
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
      }
      if (e.touches.length === 0) {
        computeCrop();
      }
      activeTouches = Array.from(e.touches);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('touchstart', onTouchStart, { passive: false });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('mousedown', onMouseDown);
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [computeCrop, cropSize, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  const panGesture = Gesture.Pan()
    .enabled(Platform.OS !== 'web')
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      computeCrop();
    });

  const pinchGesture = Gesture.Pinch()
    .enabled(Platform.OS !== 'web')
    .onUpdate((e) => {
      scale.value = Math.max(1, Math.min(10, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

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
    const displayScale = Math.max(cropSize / width, cropSize / height);
    const cropPixelSize = cropSize / displayScale;
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
      <View
        ref={cropWindowRef}
        style={[styles.cropWindow, { width: cropSize, height: cropSize }]}
      >
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            style={[
              { width: cropSize, height: cropSize, justifyContent: 'center', alignItems: 'center' },
              animatedStyle,
            ]}
          >
            <Image
              source={{ uri: imageUri }}
              style={{ width: cropSize, height: cropSize }}
              contentFit="contain"
              onLoad={handleImageLoad}
            />
          </Animated.View>
        </GestureDetector>
        <View style={styles.cropOverlay} pointerEvents="none">
          <View style={[styles.cropBorder, { width: cropSize - 16, height: cropSize - 16 }]} />
        </View>
      </View>
      <ThemedText style={styles.hint}>
        Pinch to zoom, drag to position
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
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    // Force a compositing layer on mobile WebKit so overflow: hidden
    // correctly clips transformed (scaled/translated) children.
    ...(Platform.OS === 'web' ? { isolation: 'isolate' as never } : {}),
  },
  cropOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropBorder: {
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 8,
  },
  hint: {
    fontSize: 12,
    opacity: 0.5,
  },
});
