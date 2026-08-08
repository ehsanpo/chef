# Chef Game & Watch — Mobile (Expo Android)

Built with **Expo** & **React Native WebView** for Android.

## Requirements

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Android Emulator or Expo Go App on Android Device

## Running & Building Android App

```powershell
cd c:\Users\Ehsan\dev\chef\mobile

# Install mobile dependencies
npm install

# Start Expo development server
npx expo start

# Run on Android Emulator or Device
npx expo run:android

# Build standalone Android APK / AAB
npx eas build -p android --profile preview
```

The frontend web distribution is automatically symlinked into `mobile/web-dist`.
