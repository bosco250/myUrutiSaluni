# Quick Color Update Guide

## For Login Page Colors

Open your Figma login page and update these colors in `colors.ts`:

### Step-by-Step:

1. **Button Color** (`primary`):
   - In Figma: Click on the "Sign In" button
   - Right panel → Fill → Copy hex code
   - Update: `primary: '#YOUR_COLOR'`

2. **Background Color** (`background`):
   - In Figma: Click on the main screen background
   - Right panel → Fill → Copy hex code
   - Update: `background: '#YOUR_COLOR'`

3. **Title Text** (`text`):
   - In Figma: Click on "Welcome Back" text
   - Right panel → Text → Copy hex code
   - Update: `text: '#YOUR_COLOR'`

4. **Subtitle Text** (`textSecondary`):
   - In Figma: Click on "Sign in to continue" text
   - Right panel → Text → Copy hex code
   - Update: `textSecondary: '#YOUR_COLOR'`

5. **Input Background** (`backgroundSecondary`):
   - In Figma: Click on an input field
   - Right panel → Fill → Copy hex code
   - Update: `backgroundSecondary: '#YOUR_COLOR'`

6. **Input Border** (`border`):
   - In Figma: Click on an input field
   - Right panel → Stroke → Copy hex code
   - Update: `border: '#YOUR_COLOR'`

7. **Button Text** (`textInverse`):
   - In Figma: Click on button text ("Sign In")
   - Right panel → Text → Copy hex code
   - Update: `textInverse: '#YOUR_COLOR'`

### After Updating:

1. Save `colors.ts`
2. Restart your React Native app
3. Check if colors match Figma design

### File Location:
`mobile/src/theme/colors.ts`

