# Theme Configuration Guide

## How to Update Colors from Figma

To match your app's colors with your Figma design:

1. **Open your Figma design file**
   - Navigate to: https://www.figma.com/design/LKgSURFglBrrUuvrRAXYCu/Salon-Association

2. **Extract colors from Figma:**
   - Select any element in your design
   - Check the color value in the right panel (Design tab)
   - Copy the hex code (e.g., `#FF5733`) or RGB value

3. **Update colors in `src/theme/colors.ts`:**
   - Open `mobile/src/theme/colors.ts`
   - Find the color you want to update (e.g., `primary`, `background`, `text`)
   - Replace the hex value with the color from your Figma design
   - Look for `TODO` comments to identify which colors need updating

4. **Common colors to update:**
   - `primary` - Main brand/primary button color
   - `secondary` - Secondary brand color
   - `background` - Main screen background
   - `backgroundSecondary` - Input fields, cards background
   - `text` - Main text color
   - `textSecondary` - Secondary text (labels, hints)
   - `border` - Default border color
   - `error` - Error messages color
   - `success` - Success messages color

## Example

If your Figma primary color is `#FF6B9D`, update:

```typescript
export const colors = {
  primary: '#FF6B9D', // Updated from Figma
  // ... other colors
};
```

## Color Structure

All colors are organized in `src/theme/colors.ts` and accessed through the theme object:

```typescript
import { theme } from '../theme';

// Use in components
backgroundColor: theme.colors.primary
color: theme.colors.text
```

**Important:** Never hardcode colors in components. Always use `theme.colors.*` to maintain consistency and make updates easier.

