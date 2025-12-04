# Windows Setup Guide for better-sqlite3

## Problem
The `better-sqlite3` package requires native compilation on Windows, which needs Visual Studio Build Tools.

## Solution: Install Visual Studio Build Tools

### Option 1: Visual Studio Build Tools (Recommended - Smaller Download)

1. **Download Visual Studio Build Tools:**
   - Visit: https://visualstudio.microsoft.com/downloads/
   - Scroll down to "Tools for Visual Studio"
   - Download "Build Tools for Visual Studio 2022"

2. **Install with Required Components:**
   - Run the installer
   - Select "Desktop development with C++" workload
   - Make sure these components are included:
     - MSVC v143 - VS 2022 C++ x64/x86 build tools
     - Windows 10/11 SDK (latest version)
     - C++ CMake tools for Windows

3. **Restart your terminal/PowerShell** after installation

4. **Try installing again:**
   ```powershell
   npm install
   ```

### Option 2: Full Visual Studio (If you need IDE)

1. **Download Visual Studio Community 2022:**
   - Visit: https://visualstudio.microsoft.com/downloads/
   - Download "Community 2022" (free)

2. **During installation, select:**
   - "Desktop development with C++" workload

3. **Restart your terminal/PowerShell** after installation

4. **Try installing again:**
   ```powershell
   npm install
   ```

## Alternative: Use Prebuilt Binaries (If Available)

If you want to try using prebuilt binaries instead of compiling:

```powershell
npm install better-sqlite3 --build-from-source=false
```

Note: Prebuilt binaries may not be available for all Node.js versions.

## Verify Installation

After installing Visual Studio Build Tools, verify it works:

```powershell
npm install better-sqlite3
```

If successful, you should see the package install without errors.

## Troubleshooting

If you still encounter issues after installing Build Tools:

1. **Close and reopen your terminal/PowerShell**
2. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```
3. **Delete node_modules and reinstall:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item package-lock.json
   npm install
   ```

## Additional Notes

- The Build Tools installation is approximately 3-6 GB
- You only need to install this once
- The installation is required because `better-sqlite3` is a native Node.js addon that needs to be compiled for your specific system

