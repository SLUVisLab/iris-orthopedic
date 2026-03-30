import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { APP_NAME, Fonts } from '@/constants/theme';

export default function AboutScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#E6F4FE', dark: '#1a365d' }}
      headerImage={
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.headerImage}
          contentFit="contain"
        />
      }>
      {/* Title */}
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title" style={{ fontFamily: Fonts?.serif }}>
          {APP_NAME}
        </ThemedText>
      </ThemedView>
      <ThemedText style={styles.tagline}>
        AI-powered orthopedic screw identification from x-ray images.
      </ThemedText>

      {/* ── How to Use ── */}
      <View style={styles.section}>
        <ThemedText type="subtitle">How to Use</ThemedText>

        <ThemedText style={styles.stepHeader}>1. Upload X-Ray Images</ThemedText>
        <ThemedText style={styles.body}>
          Tap <ThemedText type="defaultSemiBold">Select a Photo</ThemedText> or the camera icon to
          provide two x-ray views of the implanted screw — one anteroposterior (AP) and one lateral.
        </ThemedText>

        <ThemedText style={styles.stepHeader}>2. Crop to the Screw</ThemedText>
        <ThemedText style={styles.body}>
          Use the crop tool to zoom in on the screw of interest. Choose the clearest, least
          obstructed screw — x-rays often have artifacts or overlapping anatomy that can obscure
          some instances. Pinch to zoom and drag to position the screw within the frame. The
          tighter and more centered the crop, the better the prediction.
        </ThemedText>

        <ThemedText style={styles.stepHeader}>3. Identify Manufacturer</ThemedText>
        <ThemedText style={styles.body}>
          Tap <ThemedText type="defaultSemiBold">Identify Manufacturer</ThemedText> to run the
          analysis. The model will return a ranked list of predicted manufacturers with confidence
          scores.
        </ThemedText>

        <ThemedText style={styles.stepHeader}>4. Review Results</ThemedText>
        <ThemedText style={styles.body}>
          Select a prediction to view similar cases from the reference database. Tap a similar case
          to open a side-by-side comparison of your x-rays with the reference images.
        </ThemedText>
      </View>

      {/* ── About the Project ── */}
      <View style={styles.section}>
        <ThemedText type="subtitle">About the Project</ThemedText>
        <ThemedText style={styles.body}>
          {APP_NAME} was developed through a collaboration between medical and computer science
          researchers at Saint Louis University. The project addresses a real challenge in orthopedic
          revision surgeries: quickly and accurately identifying the manufacturer of previously
          implanted hardware.
        </ThemedText>
        <ThemedText style={styles.body}>
          Manual identification is time-consuming and error-prone, often requiring surgeons to
          visually compare screws against catalogs or consult with vendor representatives. Our goal
          is to streamline this process using machine learning, enabling faster preoperative planning
          and more confident surgical decision-making.
        </ThemedText>
        <ThemedText style={styles.body}>
          The underlying model is trained on a curated dataset of x-ray images from thoracic spine
          patients with implants from known manufacturers. It analyzes screw features visible in
          standard x-ray views and matches them against learned patterns to predict the most likely
          manufacturer.
        </ThemedText>
      </View>

      {/* ── Disclaimer ── */}
      <View style={styles.section}>
        <ThemedText style={styles.disclaimer}>
          <ThemedText style={[styles.disclaimer, { fontWeight: '700' }]}>Disclaimer: </ThemedText>
          This tool is provided for assistive use only and does not constitute medical advice or
          diagnosis. AI predictions may contain errors. The operating physician assumes full
          responsibility for the final identification of any implant.
        </ThemedText>
      </View>

      {/* ── Contact ── */}
      <View style={styles.section}>
        <ThemedText type="subtitle">Contact</ThemedText>
        <ThemedText style={styles.body}>
          For questions, feedback, or collaboration inquiries, please reach out to the research team
          at Saint Louis University.
        </ThemedText>
      </View>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    width: 160,
    height: 160,
    alignSelf: 'center',
    position: 'absolute',
    bottom: 40,
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagline: {
    fontSize: 15,
    opacity: 0.6,
    marginBottom: 8,
  },
  section: {
    gap: 8,
    marginTop: 16,
  },
  stepHeader: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  disclaimer: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.6,
  },
});
