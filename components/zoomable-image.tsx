import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

type Props = {
  uri: string;
  style?: ViewStyle;
  minScale?: number;
  maxScale?: number;
};

export default function ZoomableImage({
  uri,
  style,
  minScale = 1,
  maxScale = 8,
}: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const containerRef = useRef(null);

  const resetZoom = () => {
    'worklet';
    scale.value = withTiming(1, { duration: 200 });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // Web: wheel-to-zoom + mouse drag
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    let isDragging = false;
    let lastX = 0;
    let lastY = 0;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const next = Math.max(minScale, Math.min(maxScale, scale.value * factor));
      scale.value = next;
      savedScale.value = next;
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
      translateX.value += e.clientX - lastX;
      translateY.value += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onDblClick = () => {
      scale.value = withTiming(1, { duration: 200 });
      savedScale.value = 1;
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    };

    const onDragStart = (e: DragEvent) => e.preventDefault();

    // Touch handlers for mobile emulator / touch-enabled web
    let activeTouches: Touch[] = [];
    let lastTouchX = 0;
    let lastTouchY = 0;
    let initialPinchDist = 0;
    let lastTapTime = 0;

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
        const next = Math.max(minScale, Math.min(maxScale, savedScale.value * pinchScale));
        scale.value = next;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0 && activeTouches.length >= 2) {
        // Pinch ended — save scale
        savedScale.value = scale.value;
      }
      if (e.touches.length === 0 && activeTouches.length === 1) {
        // Check for double-tap
        const now = Date.now();
        if (now - lastTapTime < 300) {
          // double-tap reset
          scale.value = withTiming(1, { duration: 200 });
          savedScale.value = 1;
          translateX.value = withTiming(0, { duration: 200 });
          translateY.value = withTiming(0, { duration: 200 });
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }
        lastTapTime = now;
      }
      activeTouches = Array.from(e.touches);
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    node.addEventListener('mousedown', onMouseDown);
    node.addEventListener('dblclick', onDblClick);
    node.addEventListener('dragstart', onDragStart);
    node.addEventListener('touchstart', onTouchStart, { passive: false });
    node.addEventListener('touchmove', onTouchMove, { passive: false });
    node.addEventListener('touchend', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      node.removeEventListener('wheel', onWheel);
      node.removeEventListener('mousedown', onMouseDown);
      node.removeEventListener('dblclick', onDblClick);
      node.removeEventListener('dragstart', onDragStart);
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [minScale, maxScale, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Mobile: pinch + pan + double-tap-to-reset
  const pinch = Gesture.Pinch()
    .enabled(Platform.OS !== 'web')
    .onUpdate((e) => {
      scale.value = Math.max(minScale, Math.min(maxScale, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .enabled(Platform.OS !== 'web')
    .minPointers(1)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .enabled(Platform.OS !== 'web')
    .numberOfTaps(2)
    .onEnd(resetZoom);

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        ref={containerRef}
        style={[styles.container, style]}
      >
        <Animated.View style={[styles.inner, animatedStyle]}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    flex: 1,
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
  },
});
