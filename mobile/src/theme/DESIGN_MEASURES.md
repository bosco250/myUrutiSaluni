# Design System Measures & Specifications

**Document Version:** 1.0  
**Last Updated:** 2024  
**Project:** URUTI Salon Association Mobile App

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing System](#spacing-system)
5. [Sizing System](#sizing-system)
6. [Component Specifications](#component-specifications)
7. [Border Radius](#border-radius)
8. [Shadows & Elevation](#shadows--elevation)
9. [Icons](#icons)
10. [Layout Guidelines](#layout-guidelines)
11. [Best Practices](#best-practices)

---

## Overview

This document defines all design measures, specifications, and standards used throughout the URUTI mobile application. All measurements are in **points (pt)** for React Native, which translate 1:1 to pixels on most devices.

**Design Tool Reference:**  
Figma Design: https://www.figma.com/design/LKgSURFglBrrUuvrRAXYCu/Salon-Association?node-id=61-102

---

## Color System

### Primary Brand Colors

| Color Name     | Hex Code  | Usage                                                  |
| -------------- | --------- | ------------------------------------------------------ |
| `primary`      | `#C89B68` | Main brand color - Links, accents, focus states, icons |
| `primaryDark`  | `#A67C52` | Pressed/hover states, darker variants                  |
| `primaryLight` | `#D4B896` | Subtle backgrounds, light accents                      |

### Button Colors

| Color Name            | Hex Code  | Usage                                             |
| --------------------- | --------- | ------------------------------------------------- |
| `buttonPrimary`       | `#000000` | Primary button background (Sign In, main actions) |
| `buttonPrimaryText`   | `#FFFFFF` | Primary button text color                         |
| `buttonSecondary`     | `#5856D6` | Secondary button background                       |
| `buttonSecondaryText` | `#FFFFFF` | Secondary button text color                       |

### Semantic Colors (Status & Feedback)

| Color Name     | Hex Code  | Usage                                        |
| -------------- | --------- | -------------------------------------------- |
| `success`      | `#34C759` | Success states, checkmarks, positive actions |
| `successLight` | `#5CD87A` | Light success backgrounds                    |
| `successDark`  | `#2AB04A` | Dark success variants                        |
| `warning`      | `#FF9500` | Warning messages, caution states             |
| `warningLight` | `#FFB340` | Light warning backgrounds                    |
| `warningDark`  | `#E68500` | Dark warning variants                        |
| `error`        | `#FF3B30` | Error states, validation errors              |
| `errorLight`   | `#FF6B63` | Light error backgrounds                      |
| `errorDark`    | `#E62E24` | Dark error variants                          |
| `info`         | `#C89B68` | Info messages (matches primary)              |
| `infoLight`    | `#D4B896` | Light info backgrounds                       |
| `infoDark`     | `#A67C52` | Dark info variants                           |

### Background Colors

| Color Name            | Hex Code  | Usage                            |
| --------------------- | --------- | -------------------------------- |
| `background`          | `#FFFFFF` | Main screen background           |
| `backgroundSecondary` | `#F5F5F5` | Input fields, cards background   |
| `backgroundTertiary`  | `#FAFAFA` | Subtle backgrounds, dividers     |
| `backgroundDark`      | `#000000` | Dark mode background (if needed) |

### Text Colors

| Color Name      | Hex Code  | Usage                                     |
| --------------- | --------- | ----------------------------------------- |
| `text`          | `#000000` | Primary text color (headings, body)       |
| `textSecondary` | `#8E8E93` | Secondary text (labels, hints, subtitles) |
| `textTertiary`  | `#C7C7CC` | Tertiary text (placeholders, disabled)    |
| `textInverse`   | `#FFFFFF` | Text on dark backgrounds (buttons)        |
| `textDisabled`  | `#C7C7CC` | Disabled text color                       |

### Border Colors

| Color Name    | Hex Code  | Usage                                  |
| ------------- | --------- | -------------------------------------- |
| `border`      | `#C6C6C8` | Default border color                   |
| `borderLight` | `#E5E5EA` | Light borders, dividers                |
| `borderDark`  | `#8E8E93` | Dark borders, emphasis                 |
| `borderFocus` | `#C89B68` | Focused input border (matches primary) |

### Social Media Colors

| Color Name     | Hex Code  | Usage                |
| -------------- | --------- | -------------------- |
| `facebookBlue` | `#1877F2` | Facebook brand color |

### Neutral Grays (Design System Scale)

| Color Name | Hex Code  | Usage             |
| ---------- | --------- | ----------------- |
| `white`    | `#FFFFFF` | Pure white        |
| `black`    | `#000000` | Pure black        |
| `gray50`   | `#FAFAFA` | Lightest gray     |
| `gray100`  | `#F5F5F5` | Very light gray   |
| `gray200`  | `#E5E5EA` | Light gray        |
| `gray300`  | `#D1D1D6` | Medium-light gray |
| `gray400`  | `#C7C7CC` | Medium gray       |
| `gray500`  | `#AEAEB2` | Medium-dark gray  |
| `gray600`  | `#8E8E93` | Dark gray         |
| `gray700`  | `#636366` | Darker gray       |
| `gray800`  | `#48484A` | Very dark gray    |
| `gray900`  | `#1C1C1E` | Darkest gray      |

### Overlay Colors

| Color Name     | Hex Code             | Usage                       |
| -------------- | -------------------- | --------------------------- |
| `overlay`      | `rgba(0, 0, 0, 0.5)` | Standard overlay for modals |
| `overlayLight` | `rgba(0, 0, 0, 0.3)` | Light overlay               |
| `overlayDark`  | `rgba(0, 0, 0, 0.7)` | Dark overlay for emphasis   |

---

## Typography

### Font Families

| Font Weight | Font Family | Usage                               |
| ----------- | ----------- | ----------------------------------- |
| `regular`   | `System`    | Body text, paragraphs, default text |
| `medium`    | `System`    | Buttons, labels, emphasized text    |
| `bold`      | `System`    | Headings, titles, strong emphasis   |

**Note:** Currently using system fonts. Custom fonts can be added later if needed.

### Font Sizes

| Size Name   | Value (pt) | Usage                                    |
| ----------- | ---------- | ---------------------------------------- |
| Extra Small | `12`       | Captions, helper text, divider labels    |
| Small       | `14`       | Secondary text, labels, small buttons    |
| Base        | `16`       | Body text, input fields, primary buttons |
| Large       | `18`       | Subheadings, emphasized text             |
| Extra Large | `20`       | Section headings, card titles            |
| XXL         | `24`       | Page titles, major headings              |
| XXXL        | `48`       | Success icons, large decorative elements |

### Font Weights

| Weight    | Value | Usage                          |
| --------- | ----- | ------------------------------ |
| Light     | `300` | Decorative text, close buttons |
| Regular   | `400` | Body text, default             |
| Medium    | `500` | Labels, emphasized text        |
| Semi-Bold | `600` | Buttons, links, important text |
| Bold      | `700` | Headings, titles               |

### Line Heights

| Context   | Line Height | Usage                         |
| --------- | ----------- | ----------------------------- |
| Body Text | `24`        | Paragraphs, descriptions      |
| Headings  | `1.2`       | Titles, headings (relative)   |
| Labels    | `1.0`       | Single-line labels (relative) |

### Letter Spacing

| Context      | Value | Usage               |
| ------------ | ----- | ------------------- |
| Divider Text | `0.5` | "OR" divider labels |

---

## Spacing System

The spacing system uses a **4pt base unit** for consistency and alignment.

| Spacing Name | Value (pt) | Usage                                          |
| ------------ | ---------- | ---------------------------------------------- |
| `xs`         | `4`        | Tight spacing, icon padding, minimal gaps      |
| `sm`         | `8`        | Small gaps, between related elements           |
| `md`         | `16`       | Medium spacing, section gaps, standard padding |
| `lg`         | `24`       | Large spacing, between major sections          |
| `xl`         | `32`       | Extra large spacing, screen margins            |

### Spacing Usage Examples

- **Input Fields:** `paddingHorizontal: md (16pt)`, `paddingVertical: xs (4pt)`
- **Buttons:** `paddingVertical: sm + 2 (10pt)`, `paddingHorizontal: lg (24pt)`
- **Cards:** `padding: lg (24pt)`
- **Screen Margins:** `paddingHorizontal: lg (24pt)` or `xl (32pt)`
- **Between Form Fields:** `marginBottom: sm + 2 (10pt)`
- **Section Gaps:** `marginBottom: lg (24pt)` or `xl (32pt)`

---

## Sizing System

The sizing system follows the same scale as spacing for consistency.

| Size Name | Value (pt) | Usage                           |
| --------- | ---------- | ------------------------------- |
| `xs`      | `4`        | Minimal sizes, thin borders     |
| `sm`      | `8`        | Small elements, icons           |
| `md`      | `16`       | Medium elements, standard icons |
| `lg`      | `24`       | Large elements, prominent icons |
| `xl`      | `32`       | Extra large elements            |
| `xxl`     | `48`       | Maximum size elements           |

### Component-Specific Sizes

| Component           | Property       | Value (pt) | Notes                           |
| ------------------- | -------------- | ---------- | ------------------------------- |
| Buttons             | `minHeight`    | `48`       | Touch target minimum            |
| Input Fields        | `minHeight`    | `44`       | Touch target minimum            |
| Icons (Default)     | `size`         | `20`       | Standard icon size              |
| Icons (Small)       | `size`         | `18`       | Eye icons, small indicators     |
| Icons (Large)       | `size`         | `24`       | Prominent icons                 |
| Success Icon Circle | `width/height` | `80`       | Modal success indicators        |
| Logo                | `height`       | `120`      | Login screen logo (approximate) |

---

## Component Specifications

### Buttons

#### Primary Button

- **Background:** `buttonPrimary` (`#000000`)
- **Text Color:** `textInverse` (`#FFFFFF`)
- **Font Size:** `16pt`
- **Font Weight:** `600` (Semi-Bold)
- **Font Family:** `medium`
- **Padding Vertical:** `10pt` (sm + 2)
- **Padding Horizontal:** `24pt` (lg)
- **Border Radius:** `8pt`
- **Min Height:** `48pt`
- **Active Opacity:** `0.7`

#### Secondary Button

- **Background:** `secondary` (`#5856D6`)
- **Text Color:** `textInverse` (`#FFFFFF`)
- **Font Size:** `16pt`
- **Font Weight:** `600` (Semi-Bold)
- **Font Family:** `medium`
- **Padding Vertical:** `10pt` (sm + 2)
- **Padding Horizontal:** `24pt` (lg)
- **Border Radius:** `8pt`
- **Min Height:** `48pt`
- **Active Opacity:** `0.7`

#### Outline Button

- **Background:** `transparent`
- **Border:** `1pt solid primary` (`#C89B68`)
- **Text Color:** `primary` (`#C89B68`)
- **Font Size:** `16pt`
- **Font Weight:** `600` (Semi-Bold)
- **Font Family:** `medium`
- **Padding Vertical:** `10pt` (sm + 2)
- **Padding Horizontal:** `24pt` (lg)
- **Border Radius:** `8pt`
- **Min Height:** `48pt`
- **Active Opacity:** `0.7`

#### Disabled State

- **Opacity:** `0.5`
- Applies to all button variants

### Input Fields

#### Default State

- **Background:** `backgroundSecondary` (`#F5F5F5`)
- **Border:** `1pt solid border` (`#C6C6C8`)
- **Border Radius:** `8pt`
- **Padding Horizontal:** `16pt` (md)
- **Padding Vertical:** `4pt` (xs)
- **Min Height:** `44pt`
- **Font Size:** `16pt`
- **Font Family:** `regular`
- **Text Color:** `text` (`#000000`)
- **Placeholder Color:** `textTertiary` (`#C7C7CC`)

#### Focused State

- **Background:** `background` (`#FFFFFF`)
- **Border:** `1pt solid borderFocus` (`#C89B68`)

#### Error State

- **Border:** `1pt solid error` (`#FF3B30`)
- **Error Text Color:** `error` (`#FF3B30`)
- **Error Text Size:** `12pt`
- **Error Text Margin Top:** `4pt` (xs)

#### Label

- **Font Size:** `14pt`
- **Font Weight:** `500` (Medium)
- **Font Family:** `medium`
- **Color:** `text` (`#000000`)
- **Margin Bottom:** `4pt` (xs)

#### Icon Spacing

- **Left Icon Margin Right:** `8pt` (sm)
- **Right Icon Margin Left:** `4pt` (xs)
- **Eye Icon Padding:** `4pt` (xs)

### Cards

#### Appointment Card

- **Border Radius:** `16pt`
- **Padding:** `24pt` (lg)
- **Margin Top:** `16pt` (md)
- **Background:** `background` (`#FFFFFF`)

#### Quick Action Button

- **Border Radius:** `12pt`
- **Padding:** `16pt` (md)
- **Min Height:** `100pt`
- **Margin Bottom:** `8pt` (sm)

### Modals

#### Modal Overlay

- **Background:** `overlay` (`rgba(0, 0, 0, 0.5)`)
- **Padding:** `24pt` (lg)

#### Modal Content

- **Background:** `background` (`#FFFFFF`)
- **Border Radius:** `16pt`
- **Padding:** `32pt` (xl)
- **Max Width:** `400pt`
- **Shadow:** See [Shadows & Elevation](#shadows--elevation)

#### Success Icon Circle

- **Width/Height:** `80pt`
- **Border Radius:** `40pt` (circular)
- **Background:** `#E6F7EA` (light green)
- **Margin Bottom:** `24pt` (lg)
- **Margin Top:** `16pt` (md)

#### Success Checkmark

- **Font Size:** `48pt`
- **Color:** `success` (`#34C759`)
- **Font Weight:** `bold`

#### Success Title

- **Font Size:** `24pt`
- **Font Weight:** `bold`
- **Font Family:** `bold`
- **Color:** `text` (`#000000`)
- **Margin Bottom:** `16pt` (md)
- **Text Align:** `center`

#### Success Message

- **Font Size:** `16pt`
- **Color:** `textSecondary` (`#8E8E93`)
- **Text Align:** `center`
- **Margin Bottom:** `32pt` (xl)
- **Line Height:** `24pt`
- **Font Family:** `regular`

### Bottom Navigation

#### Container

- **Padding Vertical:** `8pt` (sm)
- **Padding Horizontal:** `4pt` (xs)

#### Tab Label

- **Font Size:** `12pt`
- **Margin Top:** `4pt` (xs / 2)

---

## Border Radius

| Radius Value | Usage                                         |
| ------------ | --------------------------------------------- |
| `8pt`        | Buttons, input fields, standard components    |
| `12pt`       | Quick action buttons, medium cards            |
| `16pt`       | Appointment cards, modal content, large cards |
| `20pt`       | Badges, pills, rounded tags                   |
| `40pt`       | Circular elements (success icons, avatars)    |

---

## Shadows & Elevation

### Modal Shadows (iOS)

```javascript
shadowColor: "#000"
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.25
shadowRadius: 8
```

### Modal Elevation (Android)

```javascript
elevation: 8;
```

**Usage:** Modals, popups, elevated cards

---

## Icons

### Icon Library

- **Source:** `@expo/vector-icons`
- **Primary Set:** `MaterialIcons`
- **Standard Size:** `20pt`
- **Small Size:** `18pt` (Eye icons)
- **Large Size:** `24pt` (when needed)

### Icon Colors

- **Default:** `primary` (`#C89B68`)
- **Secondary:** `textSecondary` (`#8E8E93`)
- **Success:** `success` (`#34C759`)
- **Error:** `error` (`#FF3B30`)

### Available Icons

- `MailIcon` - Email input fields
- `LockIcon` - Password input fields
- `PersonIcon` - User/profile fields
- `EyeIcon` - Show password
- `EyeOffIcon` - Hide password
- `VerifiedIcon` - Verification status
- `SecurityIcon` - Security features

---

## Layout Guidelines

### Screen Structure

#### Login/Auth Screens

- **Logo Height:** `120pt` (approximate)
- **Header Margin Bottom:** `32pt` (xl)
- **Form Container Padding:** `24pt` (lg) horizontal
- **Between Form Fields:** `10pt` (sm + 2)
- **Button Margin Top:** `24pt` (lg)
- **Divider Margin:** `16pt` (md) vertical
- **Social Buttons Gap:** `8pt` (sm)
- **Sign Up Link Margin Top:** `8pt` (sm)

#### Home Screen

- **Screen Padding:** `24pt` (lg) horizontal
- **Section Gaps:** `24pt` (lg) or `32pt` (xl)

#### Modal Screens

- **Overlay Padding:** `24pt` (lg)
- **Content Padding:** `32pt` (xl)
- **Close Button Position:** `16pt` (md) from top and right

### Touch Targets

| Element Type      | Minimum Size | Recommended   |
| ----------------- | ------------ | ------------- |
| Buttons           | `48pt`       | `48pt - 56pt` |
| Input Fields      | `44pt`       | `44pt - 48pt` |
| Icons (Touchable) | `44pt`       | `44pt x 44pt` |
| Navigation Items  | `44pt`       | `44pt - 48pt` |

### Content Width

| Context       | Max Width                | Notes                |
| ------------- | ------------------------ | -------------------- |
| Modal Content | `400pt`                  | Centered modals      |
| Cards         | Full width minus padding | Responsive to screen |
| Forms         | Full width minus padding | Responsive to screen |

---

## Best Practices

### Spacing

1. **Always use theme spacing values** - Never hardcode spacing values
2. **Maintain consistent gaps** - Use the same spacing value for similar contexts
3. **Group related elements** - Use smaller spacing (sm) for related items
4. **Separate sections** - Use larger spacing (lg, xl) between major sections

### Colors

1. **Use semantic color names** - Always reference theme colors, never hardcode hex values
2. **Maintain contrast** - Ensure text meets accessibility contrast ratios
3. **Consistent states** - Use the same colors for the same states across the app

### Typography

1. **Hierarchy** - Use font sizes and weights to establish clear visual hierarchy
2. **Readability** - Maintain minimum 16pt for body text
3. **Consistency** - Use the same font sizes for the same content types

### Components

1. **Reuse components** - Use existing Button, Input, and other components
2. **Consistent styling** - Apply the same styles to similar components
3. **Touch targets** - Ensure all interactive elements meet minimum touch target sizes

### Responsive Design

1. **Flex layouts** - Use Flexbox for responsive layouts
2. **Percentage widths** - Use percentages for widths when appropriate
3. **Safe areas** - Account for device safe areas (notches, status bars)

### Accessibility

1. **Color contrast** - Ensure sufficient contrast between text and backgrounds
2. **Touch targets** - Maintain minimum 44pt touch targets
3. **Text sizes** - Use readable font sizes (minimum 12pt, recommended 16pt for body)

---

## Implementation Notes

### Theme Usage

All design measures are accessible through the theme object:

```typescript
import { theme } from "../../theme";

// Colors
theme.colors.primary;
theme.colors.text;
theme.colors.background;

// Spacing
theme.spacing.xs;
theme.spacing.sm;
theme.spacing.md;
theme.spacing.lg;
theme.spacing.xl;

// Sizes
theme.sizes.xs;
theme.sizes.sm;
theme.sizes.md;
theme.sizes.lg;
theme.sizes.xl;
theme.sizes.xxl;

// Fonts
theme.fonts.regular;
theme.fonts.medium;
theme.fonts.bold;
```

### Updating Design Measures

1. **Colors:** Update `src/theme/colors.ts`
2. **Spacing/Sizes:** Update `src/constants/index.ts`
3. **Fonts:** Update `src/constants/index.ts` (or add custom fonts)
4. **This Document:** Update this file when design system changes

---

## Version History

| Version | Date | Changes                             |
| ------- | ---- | ----------------------------------- |
| 1.0     | 2024 | Initial design system documentation |

---

**End of Document**
