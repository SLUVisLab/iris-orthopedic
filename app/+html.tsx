import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

import appJson from '../app.json';

const APP_NAME = appJson.expo.name;

/**
 * Root HTML template for Expo Router web export.
 * This file lets us inject the web app manifest link and PWA meta tags
 * so "Add to Home Screen" works correctly on mobile browsers.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* PWA manifest and meta tags */}
        <link rel="manifest" href="/iris-orthopedic/manifest.json" />
        <meta name="theme-color" content="#E6F4FE" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content={APP_NAME} />
        <link rel="apple-touch-icon" href="/iris-orthopedic/apple-touch-icon.png" />

        {/* Disable body scrolling on web to match native feel */}
        <ScrollViewStyleReset />

        {/* Base responsive styles */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}
`;
