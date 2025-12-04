# Design System

This document defines the design system used across both the **Web** and **Mobile** applications.

## Color Palette

### Primary Colors
- **Primary (Deep Teal)**: `#0891b2`
- **Primary Variants**: 
  - Light: `#0891b2/20` (20% opacity)
  - Dark: `#0891b2/30` (30% opacity)

### Background Colors
- **Light Mode**:
  - Background: `#f8fafc` or `#f6f8f7`
  - Surface: `#ffffff`
  - Surface Accent: `#f0f5f2`
  
- **Dark Mode**:
  - Background: `#0c1416` or `#102218`
  - Surface: `#1e293b` or `#1a2c22`
  - Surface Accent: `#1c3a28`

### Text Colors
- **Light Mode**:
  - Primary: `#111814`
  - Secondary: `#608a72`
  - Muted: `#6B7280`
  
- **Dark Mode**:
  - Primary: `#e2e8f0` or `#e6edf3`
  - Secondary: `#848d97` or `#9DBFAF`
  - Muted: `#9CA3AF`

### Status Colors
- **Success**: `#10b981` or `#22c55e`
- **Warning**: `#f59e0b`
- **Danger**: `#ef4444`
- **Info**: `#0891b2`

### Border Colors
- **Light Mode**: `#e2e8f0` or `#dbe6df`
- **Dark Mode**: `#334155` or `#30363d`

## Typography

### Font Family
- **Primary**: Manrope (Web)
- **Fallback**: System fonts (Mobile)

### Font Weights
- Regular: 400
- Medium: 500
- Semi-bold: 600
- Bold: 700
- Extra-bold: 800

### Font Sizes
- **Headings**:
  - H1: 32px (2rem)
  - H2: 28px (1.75rem)
  - H3: 22px (1.375rem)
  - H4: 18px (1.125rem)
  
- **Body**:
  - Base: 16px (1rem)
  - Small: 14px (0.875rem)
  - Extra Small: 12px (0.75rem)

## Spacing

### Base Unit
- 4px (0.25rem)

### Common Spacing
- xs: 4px (0.25rem)
- sm: 8px (0.5rem)
- md: 12px (0.75rem)
- lg: 16px (1rem)
- xl: 24px (1.5rem)
- 2xl: 32px (2rem)

## Border Radius

- **Default**: 8px (0.5rem)
- **Large**: 12px (0.75rem)
- **Extra Large**: 16px (1rem)
- **Full**: 9999px (circular)

## Components

### Buttons
- **Height**: 
  - Small: 36px
  - Medium: 44px
  - Large: 56px
- **Padding**: Horizontal 20px, Vertical 12px
- **Border Radius**: 8px (0.5rem)

### Cards
- **Padding**: 16px (1rem)
- **Border**: 1px solid border color
- **Border Radius**: 12px (0.75rem)
- **Background**: Surface color

### Input Fields
- **Height**: 48px (3rem)
- **Padding**: 16px (1rem)
- **Border Radius**: 12px (0.75rem)
- **Border**: 1px solid border color

## Icons

- **Material Symbols Outlined** (Web)
- **React Native Vector Icons** (Mobile)
- **Size**: 24px default, 20px small, 18px extra small

## Dark Mode

Both applications support dark mode:
- **Web**: Class-based (`dark:` prefix in Tailwind)
- **Mobile**: Theme provider with context

## Responsive Design

### Breakpoints (Web)
- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Mobile App
- Optimized for mobile screens
- Minimum touch target: 44px x 44px

## Animation

- **Transitions**: 200ms ease-in-out
- **Hover Effects**: Subtle scale or color changes
- **Loading States**: Spinner animations

## Accessibility

- **Color Contrast**: WCAG AA compliant
- **Touch Targets**: Minimum 44x44px
- **Font Sizes**: Minimum 14px for body text
- **Focus States**: Visible focus indicators

