# USB Debugging Guide - Connect Your Phone to Test

This guide will help you connect your Android phone via USB cable to test your React Native Expo app.

## Prerequisites

- Android phone with USB cable
- Windows 10/11 computer
- USB debugging enabled on your phone

## Step 1: Enable USB Debugging on Your Phone

1. **Enable Developer Options:**
   - Go to **Settings** → **About Phone**
   - Find **Build Number** (might be under "Software Information")
   - Tap **Build Number** 7 times until you see "You are now a developer!"

2. **Enable USB Debugging:**
   - Go back to **Settings**
   - Find **Developer Options** (usually under System or Advanced)
   - Turn on **Developer Options**
   - Enable **USB Debugging**
   - (Optional) Enable **Stay Awake** (keeps screen on while charging)

3. **Allow USB Debugging:**
   - When you connect your phone, you'll see a popup asking "Allow USB debugging?"
   - Check **Always allow from this computer**
   - Tap **Allow**

## Step 2: Install Android Debug Bridge (ADB)

### Option A: Install Android Studio (Recommended)

1. Download Android Studio from: https://developer.android.com/studio
2. During installation, make sure **Android SDK** and **Android SDK Platform-Tools** are selected
3. ADB will be installed automatically

### Option B: Install Minimal ADB (Lightweight)

1. Download from: https://androidfilehost.com/?fid=746010030569952951
2. Install it
3. ADB will be in: `C:\Program Files (x86)\Minimal ADB and Fastboot\`

### Option C: Use Platform Tools Only

1. Download Platform Tools: https://developer.android.com/tools/releases/platform-tools
2. Extract to a folder (e.g., `C:\platform-tools`)
3. Add to PATH (see below)

## Step 3: Add ADB to System PATH (If needed)

If you installed Platform Tools only:

1. **Find ADB location:**
   - Usually: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\`
   - Or: `C:\platform-tools\` (if you extracted it there)

2. **Add to PATH:**
   - Press `Win + X` → **System** → **Advanced system settings**
   - Click **Environment Variables**
   - Under **System Variables**, find **Path** → **Edit**
   - Click **New** → Add the path to `platform-tools` folder
   - Click **OK** on all dialogs

3. **Verify ADB is installed:**
   - Open PowerShell or Command Prompt
   - Run: `adb version`
   - You should see version info (e.g., "Android Debug Bridge version 1.0.41")

## Step 4: Connect Your Phone

1. **Connect via USB:**
   - Plug your phone into your computer with USB cable
   - On your phone, when prompted, select **File Transfer** or **MTP** mode (not "Charge only")

2. **Verify Connection:**
   - Open PowerShell/Command Prompt
   - Run: `adb devices`
   - You should see your device listed:
     ```
     List of devices attached
     ABC123XYZ    device
     ```
   - If you see "unauthorized", check your phone and allow USB debugging

3. **Troubleshooting Connection:**
   - If device not showing:
     - Try different USB cable
     - Try different USB port
     - Unplug and replug
     - Run: `adb kill-server` then `adb start-server`
     - Check phone for USB debugging authorization popup

## Step 5: Run Your Expo App on Phone

### Method 1: Using Expo Go App (Easiest)

1. **Install Expo Go on your phone:**
   - Download from Google Play Store: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Start Expo development server:**

   ```bash
   cd mobile
   npm start
   # or
   npx expo start
   ```

3. **Connect to your phone:**
   - Make sure phone and computer are on the same WiFi network
   - Scan QR code with Expo Go app, OR
   - Press `a` in the terminal to open on Android device

### Method 2: Direct USB Connection (Recommended for Development)

1. **Start Expo with USB connection:**

   ```bash
   cd mobile
   npx expo start --android
   ```

   - This will automatically detect your connected phone
   - Press `a` to open on Android device

2. **Or use ADB directly:**

   ```bash
   # Start Expo server
   npm start

   # In another terminal, install on device
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Method 3: Development Build (For Production-like Testing)

1. **Build development APK:**

   ```bash
   cd mobile
   npx expo run:android
   ```

2. **Install on connected device:**
   - The build process will automatically install on your connected device
   - Or manually: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`

## Step 6: View Logs and Debug

### View Logs from Your Phone:

```bash
# View all logs
adb logcat

# View React Native logs only
adb logcat *:S ReactNative:V ReactNativeJS:V

# View Expo logs
adb logcat | grep -i expo
```

### Open Chrome DevTools:

1. Shake your phone (or press `Ctrl+M` in emulator)
2. Select **Debug**
3. Chrome DevTools will open automatically

### Reload App:

- Shake phone → **Reload**
- Or press `r` in the Expo terminal
- Or press `Ctrl+R` in Metro bundler

## Troubleshooting

### Phone Not Detected:

- ✅ Check USB cable (use data cable, not charge-only)
- ✅ Enable USB debugging on phone
- ✅ Allow USB debugging authorization popup
- ✅ Try different USB port
- ✅ Run `adb kill-server && adb start-server`
- ✅ Install phone drivers (Samsung, Xiaomi, etc. have specific drivers)

### "Device Unauthorized":

- Unplug phone
- Revoke USB debugging authorizations on phone (Developer Options)
- Reconnect and allow again

### App Not Installing:

- Check if phone has enough storage
- Enable "Install via USB" in Developer Options
- Try: `adb install -r -d app.apk` (force install)

### Expo Not Connecting:

- Ensure phone and computer are on same WiFi
- Check firewall settings
- Try tunnel mode: `npx expo start --tunnel`

### ADB Command Not Found:

- Verify ADB is in PATH: `where adb`
- Restart terminal after adding to PATH
- Use full path: `C:\Users\YourName\AppData\Local\Android\Sdk\platform-tools\adb.exe`

## Quick Reference Commands

```bash
# Check connected devices
adb devices

# Install APK
adb install app.apk

# Uninstall app
adb uninstall com.yourapp.package

# View logs
adb logcat

# Restart ADB server
adb kill-server
adb start-server

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/video.mp4
# (Press Ctrl+C to stop, then pull the file)
```

## Next Steps

Once connected:

1. Your phone will appear as a device option when running `npm start`
2. You can develop and test in real-time
3. Hot reload will work automatically
4. You can use Chrome DevTools for debugging

## Notes

- Keep USB debugging enabled only during development
- Disable it when not needed for security
- Some phones may require OEM-specific drivers (Samsung, Xiaomi, etc.)
- USB 3.0 ports sometimes work better than USB 2.0
