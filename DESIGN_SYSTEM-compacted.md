# Uruti Saluni - Design System (Compacted Styles)

> **Reference document for applying consistent, compacted styles across the application.**

---

## 1. Layout & Spacing

### Page Container
```tsx
className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6"
```

### Grid Systems
| Type | Classes |
|------|---------|
| 2-column | `grid grid-cols-1 lg:grid-cols-2 gap-4` |
| 3-column | `grid grid-cols-1 lg:grid-cols-3 gap-6` |
| 4-column stats | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3` |
| Quick actions | `grid grid-cols-2 gap-3` |

### Spacing Tokens
| Token | Value | Usage |
|-------|-------|-------|
| `gap-3` | 0.75rem | Tight grid layouts, stat cards |
| `gap-4` | 1rem | Standard grid layouts |
| `gap-6` | 1.5rem | Section separation |
| `space-y-3` | 0.75rem | List items |
| `space-y-4` | 1rem | Card stacks |
| `space-y-6` | 1.5rem | Major sections |
| `mb-4` | 1rem | Section header margin |

---

## 2. Typography

### Text Sizes
| Element | Classes |
|---------|---------|
| Page title | `text-2xl font-bold` |
| Section header | `text-lg font-bold` |
| Card title | `text-sm font-semibold` or `font-bold` |
| Stat value | `text-xl font-bold` |
| Body text | `text-sm` |
| Secondary text | `text-xs text-text-light/60 dark:text-text-dark/60` |
| Meta/badge text | `text-[10px] font-semibold` |
| Tiny labels | `text-[10px] uppercase tracking-wide` |

### Text Colors
```tsx
// Primary text
className="text-text-light dark:text-text-dark"

// Secondary/muted text
className="text-text-light/60 dark:text-text-dark/60"

// Very muted (placeholders)
className="text-text-light/40 dark:text-text-dark/40"
```

---

## 3. Cards & Containers

### Standard Card
```tsx
className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-4"
```

### Metric/Stat Card (with gradient)
```tsx
className="group relative bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 hover:shadow-lg transition-all flex-1"
```

### List Item Card
```tsx
className="block p-4 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl hover:border-primary/50 hover:shadow-md transition-all group"
```

### Alert/Warning Card
```tsx
className="bg-warning/10 border border-warning/20 rounded-xl p-4"
// or with stronger border:
className="mb-4 bg-warning/10 border-2 border-warning rounded-xl p-3"
```

### Chart Container
```tsx
className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl p-6"
```

---

## 4. Buttons

### Button Sizes
| Size | Classes |
|------|---------|
| sm | `size="sm"` → `h-7 px-2 text-xs` |
| md (default) | `h-8 px-3 text-sm` |
| lg | `h-10 px-4 text-base` |

### Button Patterns
```tsx
// Primary action
<Button variant="primary" className="flex items-center gap-2">
  <Plus className="w-4 h-4" />
  Add Item
</Button>

// Secondary action
<Button variant="secondary" className="flex items-center gap-2 text-sm">
  View All
  <ArrowUpRight className="w-4 h-4" />
</Button>

// Small outline button
<Button variant="outline" size="sm" className="h-7 text-xs px-2">
  See all
</Button>
```

---

## 5. Icons

### Icon Sizes
| Context | Size |
|---------|------|
| In buttons | `w-4 h-4` |
| In stat cards (gradient bg) | `w-4 h-4` (inside `p-2` container) |
| Quick action cards | `w-4 h-4` (inside `w-8 h-8` container) |
| Inline with text | `w-3 h-3` |
| Empty state | `w-10 h-10` |
| Large decorative | `w-5 h-5` |

### Icon Container Patterns
```tsx
// Gradient icon box (stat card)
<div className="p-2 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg">
  <DollarSign className="w-4 h-4 text-white" />
</div>

// Quick action icon box
<div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
  <Calendar className="w-4 h-4 text-white" />
</div>

// Large feature icon box
<div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
  <Building2 className="w-5 h-5 text-white" />
</div>
```

---

## 6. Color Gradients

### Semantic Gradients
| Meaning | Gradient |
|---------|----------|
| Revenue/Money | `from-green-500 to-emerald-500` |
| Calendar/Time | `from-blue-500 to-cyan-500` |
| Salon/Building | `from-purple-500 to-pink-500` |
| Alerts/Urgent | `from-orange-500 to-red-500` |
| Primary action | `from-primary to-primary/80` |

### Background Tints
```tsx
// Light tint for cards
className="bg-gradient-to-br from-green-500/10 to-emerald-500/10"

// Border matching tint
className="border border-green-500/20 dark:border-green-500/30"
```

---

## 7. Badges & Status

### Status Badge
```tsx
<span className="text-[10px] font-semibold text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
  Today
</span>
```

### Trend Indicator
```tsx
<div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-green-500/20 text-green-400">
  <ArrowUpRight className="w-3 h-3" />
  +12%
</div>
```

### Status Pills
```tsx
// Success
className="bg-success/10 text-success px-2 py-0.5 rounded-full text-[10px] font-semibold"

// Warning
className="bg-warning/10 text-warning px-2 py-0.5 rounded-full text-[10px] font-semibold"

// Primary
className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-semibold"
```

---

## 8. Interactive States

### Hover Effects
```tsx
// Card hover
className="hover:border-primary/50 hover:shadow-md transition-all"

// Strong hover
className="hover:shadow-lg transition-all"

// Link hover
className="group-hover:text-primary transition"

// Scale effect (icons/buttons)
className="group-hover:scale-110 transition-transform"
```

### Empty States
```tsx
<div className="text-center py-8">
  <Calendar className="w-10 h-10 text-text-light/20 dark:text-text-dark/20 mx-auto mb-3" />
  <p className="text-sm text-text-light/60 dark:text-text-dark/60 mb-4">
    No items found
  </p>
  <Button variant="primary" className="flex items-center gap-2 mx-auto">
    <Plus className="w-4 h-4" />
    Add Item
  </Button>
</div>
```

### Loading States
```tsx
// Inline spinner
<div className="inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />

// Full section loading
<div className="flex items-center justify-center py-8">
  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
</div>
```

---

## 9. Border Radius

| Element | Radius |
|---------|--------|
| Cards | `rounded-xl` (0.75rem) |
| Charts | `rounded-2xl` (1rem) |
| Buttons | `rounded-lg` (0.5rem) |
| Small badges | `rounded` (0.25rem) or `rounded-full` |
| Icon containers | `rounded-lg` |

---

## 10. Quick Reference

### Padding Standard
- Card: `p-4`
- Chart container: `p-6`
- Quick action: `p-3`
- Alert banner: `p-3`
- Icon container: `p-2`

### Margin Standard
- Section header bottom: `mb-4`
- Alert bottom: `mb-4`
- Stats grid bottom: `mb-6`
- Icon box bottom: `mb-2`

### Gap Standard
- Stat cards: `gap-3`
- Content grid: `gap-4` to `gap-6`
- Button icons: `gap-2`
- List items: `gap-3`
