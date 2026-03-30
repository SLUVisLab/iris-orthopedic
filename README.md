# OrthoScrew ID

AI-powered orthopedic screw identification from x-ray images.

OrthoScrew ID was developed through a collaboration between medical and computer science
researchers at Saint Louis University. The app addresses a real challenge in orthopedic
revision surgeries: quickly and accurately identifying the manufacturer of previously
implanted hardware. Upload AP and Lateral x-ray views, crop to the screw of interest,
and the model returns ranked manufacturer predictions with confidence scores and similar
reference cases.

## Running the App

OrthoScrew ID is a Progressive Web App built with Expo, designed to provide a near-native
mobile experience in the browser. It auto-deploys and is hosted on GitHub Pages.

**Live app:** [https://austin-carnahan.github.io/iris-orthopedic/](https://austin-carnahan.github.io/iris-orthopedic/)

### Local Development

```bash
# Install dependencies
npm install

# Start for web
npm run web
```

The app will open at `http://localhost:8081`.

## Authentication Setup

The app uses Google sign-in via Firebase Authentication. For login to work, you must
configure whitelisting in **both** places:

1. **Firebase Console** → Authentication → Settings → Authorized domains — add your
   domain (e.g., `localhost`, `austin-carnahan.github.io`)
2. **Google Cloud Platform** → APIs & Services → Credentials → OAuth 2.0 Client →
   Authorized JavaScript origins and redirect URIs — add the same domains

Both must be configured or authentication will fail silently.

Firebase config is in [`firebase.js`](firebase.js).

## Machine Learning Backend

This app communicates directly with Hugging Face as its backend — there is no separate
server. The ML code lives in the [`ml/`](ml/) directory.

| Resource | URL |
|---|---|
| **Inference Space** | [austin-carnahan/orthopedic-screw-identification](https://huggingface.co/spaces/austin-carnahan/orthopedic-screw-identification) |
| **Model Repo** | [austin-carnahan/orthopedic-screws-model](https://huggingface.co/austin-carnahan/orthopedic-screws-model) |
| **Dataset** | [austin-carnahan/orthopedic-screw-images](https://huggingface.co/datasets/austin-carnahan/orthopedic-screw-images) |

The app sends cropped x-ray images to the HF Space via the Gradio client library and
receives manufacturer predictions with similar reference cases. See
[`ml/space/README.md`](ml/space/README.md) for API details.

## Native Builds (iOS / Android)

Basic EAS Build configuration is provided in [`eas.json`](eas.json). To create native
app builds:

```bash
eas build --platform ios     # or android
```

See the [EAS Build introduction](https://docs.expo.dev/build/introduction/) for setup
and prerequisites.

> **Note:** Native builds require additional setup before they will succeed:
> - Add `ios.bundleIdentifier` and `android.package` to [`app.json`](app.json)
> - Camera and photo library permissions may need to be configured in `app.json` plugins
> - An Apple Developer account (iOS) or Google Play Console (Android) is needed for distribution
