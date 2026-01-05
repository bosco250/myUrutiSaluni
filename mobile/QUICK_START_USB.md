# Quick Start: Connect Your Phone via USB

## ✅ ADB is Already Installed!

Your system already has ADB installed. Follow these steps:

## Step 1: Enable USB Debugging on Your Phone

1. **Enable Developer Options:**
   - Settings → About Phone → Tap "Build Number" 7 times

2. **Enable USB Debugging:**
   - Settings → Developer Options → Enable "USB Debugging"

## Step 2: Connect Your Phone

1. Connect phone to computer via USB cable
2. On phone, select "File Transfer" or "MTP" mode when prompted
3. Allow USB debugging when popup appears

## Step 3: Verify Connection

Run this command to check if your phone is detected:

```powershell
adb devices
```

You should see your device listed like:

```
List of devices attached
ABC123XYZ    device
```

## Step 4: Run Your App

### Option 1: Using Expo (Easiest)

```powershell
cd mobile
npm start
```

Then:

- Press `a` to open on Android device
- Or scan QR code with Expo Go app (if on same WiFi)

### Option 2: Direct Android Build

```powershell
cd mobile
npx expo run:android
```

This will automatically:

- Build the app
- Install on your connected phone
- Launch the app

## Troubleshooting

### Phone Not Showing in `adb devices`?

1. **Check USB cable** - Use a data cable, not charge-only
2. **Try different USB port**
3. **Restart ADB:**
   ```powershell
   adb kill-server
   adb start-server
   adb devices
   ```
4. **Check phone** - Look for "Allow USB debugging?" popup
5. **Install phone drivers** - Some brands (Samsung, Xiaomi) need specific drivers

### Still Not Working?

Run these commands to diagnose:

```powershell
# Check ADB version
adb version

# Check connected devices
adb devices -l

# View detailed connection info
adb devices -l -v
```

## View Logs

To see app logs in real-time:

```powershell
# All logs
adb logcat

# React Native logs only
adb logcat *:S ReactNative:V ReactNativeJS:V
```

## Quick Commands Reference

```powershell
# Check devices
adb devices

# Restart ADB
adb kill-server && adb start-server

# Install APK manually
adb install app.apk

# Uninstall app
adb uninstall com.yourapp.package

# Take screenshot
adb shell screencap -p /sdcard/screen.png
adb pull /sdcard/screen.png
```

## Next Steps

Once connected:

1. Your phone will be detected automatically
2. Run `npm start` and press `a` to launch
3. Changes will hot-reload automatically
4. Use Chrome DevTools for debugging (shake phone → Debug)

---

**Note:** Keep USB debugging enabled only during development for security.
