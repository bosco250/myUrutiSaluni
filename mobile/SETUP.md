# Mobile App Setup Guide

## ✅ Android Project Structure

The Android native project has been initialized and is ready to use.

## Prerequisites

1. **Node.js 18+** - Already installed
2. **Java Development Kit (JDK)** - Version 17 or higher
3. **Android Studio** - For Android development
4. **Android SDK** - Installed via Android Studio

## Installation Steps

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Install Android Dependencies

If you haven't already, install Android Studio and set up the Android SDK:

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio and install the Android SDK
3. Set up environment variables:
   - `ANDROID_HOME` - Path to your Android SDK (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)
   - Add to PATH: `%ANDROID_HOME%\platform-tools` and `%ANDROID_HOME%\tools`

### 3. Start Metro Bundler

In one terminal:
```bash
cd mobile
npm start
```

### 4. Run on Android

In another terminal (or Android Studio):
```bash
cd mobile
npm run android
```

Or use Android Studio:
1. Open `mobile/android` folder in Android Studio
2. Wait for Gradle sync to complete
3. Click "Run" button or press Shift+F10

## Troubleshooting

### Error: "Android project not found"
- Make sure you're in the `mobile` directory
- Verify `android` folder exists
- Run `npm install` if you haven't already

### Error: "SDK location not found"
- Set `ANDROID_HOME` environment variable
- Or create `local.properties` in `android` folder:
  ```
  sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
  ```

### Error: "Command not found: react-native"
- Make sure you've run `npm install`
- Try: `npx react-native run-android`

### Metro Bundler Issues
- Clear cache: `npm start -- --reset-cache`
- Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`

## Project Structure

```
mobile/
├── android/          # Android native project
├── ios/             # iOS native project (if on macOS)
├── src/             # React Native source code
│   ├── screens/     # Screen components
│   ├── components/  # Reusable components
│   ├── navigation/  # Navigation setup
│   ├── services/    # API services
│   ├── theme/       # Theme configuration
│   └── context/     # React contexts
├── index.js         # Entry point
└── package.json     # Dependencies
```

## Next Steps

1. Install dependencies: `npm install`
2. Start Metro: `npm start`
3. Run on Android: `npm run android`
4. Start building your screens!

## Notes

- The app name is currently "SalonAssociationTemp" (can be changed later)
- Package name: `com.salonassociationtemp` (can be changed in Android files)
- Make sure you have an Android emulator running or a device connected

