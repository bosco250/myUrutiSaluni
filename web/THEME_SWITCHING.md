# Theme Switching Guide

## ✅ Light/Dark Mode Toggle Implemented

The dashboard now supports both **light** and **dark** modes with a toggle button in the header.

## Features

### 1. Theme Toggle Button
- **Location**: Header (next to notifications)
- **Icon**: 
  - 🌙 Moon icon in light mode (click to switch to dark)
  - ☀️ Sun icon in dark mode (click to switch to light)
- **Behavior**: 
  - Smooth transition between themes
  - Preference saved to localStorage
  - Persists across page reloads

### 2. Theme Detection
- **System Preference**: Automatically detects system theme on first visit
- **User Preference**: Remembers user's choice
- **Default**: Dark mode (if no preference set)

### 3. Components Updated
All components now support both themes:
- ✅ Header
- ✅ Command Palette
- ✅ Floating Navigation
- ✅ Dashboard
- ✅ All cards and UI elements

## How to Use

1. **Toggle Theme**: Click the sun/moon icon in the header
2. **Automatic**: Theme preference is saved automatically
3. **Persistent**: Your choice persists across sessions

## Technical Implementation

### Theme Context
- Location: `web/contexts/ThemeContext.tsx`
- Provides: `theme`, `toggleTheme()`, `setTheme()`
- Hook: `useTheme()`

### Usage Example
```tsx
import { useTheme } from '@/contexts/ThemeContext';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div className="bg-surface-light dark:bg-surface-dark">
      <button onClick={toggleTheme}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </div>
  );
}
```

### Tailwind Classes
All components use Tailwind's `dark:` prefix:
- `bg-surface-light dark:bg-surface-dark`
- `text-text-light dark:text-text-dark`
- `border-border-light dark:border-border-dark`

## Color Scheme

### Light Mode
- Background: `#f8fafc`
- Surface: `#ffffff`
- Text: `#111814`
- Border: `#e2e8f0`

### Dark Mode
- Background: `#0c1416`
- Surface: `#1e293b`
- Text: `#e2e8f0`
- Border: `#334155`

## Browser Support

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ All modern browsers

## Future Enhancements

- [ ] Theme transition animations
- [ ] Custom theme colors
- [ ] Theme preview
- [ ] Scheduled theme switching (auto dark at night)

