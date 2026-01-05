# Figma Color Extraction Guide for Login Page

## How to Extract Colors from Your Figma Login Page

Follow these steps to extract colors from your Figma design and update the theme:

### Step 1: Open Your Figma Design
- Navigate to: https://www.figma.com/design/LKgSURFglBrrUuvrRAXYCu/Salon-Association?node-id=61-102
- Make sure you're viewing the login page

### Step 2: Extract Each Color

#### Background Color
1. Select the main background of the login screen
2. In the right panel, find the Fill color
3. Copy the hex code (e.g., `#FFFFFF` or `#F8F9FA`)
4. Update `background` in `colors.ts`

#### Primary Button Color
1. Select the "Sign In" / "Login" button
2. Check the Fill color in the right panel
3. Copy the hex code
4. Update `primary` in `colors.ts`

#### Text Colors
1. **Main Title** ("Welcome Back" or similar):
   - Select the title text
   - Check the Text color
   - Update `text` or `textPrimary` in `colors.ts`

2. **Subtitle/Secondary Text**:
   - Select subtitle text
   - Check the Text color
   - Update `textSecondary` in `colors.ts`

#### Input Field Colors
1. **Input Background**:
   - Select an input field
   - Check the Fill/Background color
   - Update `backgroundSecondary` in `colors.ts`

2. **Input Border**:
   - Select an input field
   - Check the Border/Stroke color
   - Update `border` in `colors.ts`

3. **Input Focus Border**:
   - If there's a different color when input is focused
   - Update `primary` (usually same as button color)

#### Link Colors
1. **"Forgot Password" link**:
   - Select the link text
   - Check the Text color
   - Usually same as `primary`, but update if different

2. **"Sign Up" link**:
   - Select the link text
   - Check the Text color
   - Update `primary` if different

### Step 3: Update colors.ts

Open `mobile/src/theme/colors.ts` and replace the values:

```typescript
export const colors = {
  primary: '#YOUR_BUTTON_COLOR',        // From Sign In button
  background: '#YOUR_BACKGROUND_COLOR',  // From screen background
  text: '#YOUR_TITLE_COLOR',            // From main title
  textSecondary: '#YOUR_SUBTITLE_COLOR', // From subtitle
  backgroundSecondary: '#YOUR_INPUT_BG', // From input field background
  border: '#YOUR_BORDER_COLOR',         // From input border
  // ... etc
};
```

### Step 4: Verify

After updating, restart your app and check if colors match the Figma design.

## Quick Color Checklist

- [ ] Background color
- [ ] Primary button color
- [ ] Title text color
- [ ] Subtitle text color
- [ ] Input background color
- [ ] Input border color
- [ ] Link text color
- [ ] Error text color (if visible)

