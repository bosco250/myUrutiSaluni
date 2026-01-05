# Design System Documentation

## Comprehensive Guide for Salon Association Platform

---

## Table of Contents

1. [Theme Configuration](#theme-configuration)
2. [Typography System](#typography-system)
3. [Color System](#color-system)
4. [Spacing System](#spacing-system)
5. [Component Library](#component-library)
6. [Layout Patterns](#layout-patterns)
7. [Responsive Design](#responsive-design)
8. [Tables & Data Display](#tables--data-display)
9. [Forms & Inputs](#forms--inputs)
10. [Cards & Containers](#cards--containers)
11. [Borders & Dividers](#borders--dividers)
12. [Advanced Filtering](#advanced-filtering)
13. [Pagination](#pagination)
14. [Interactive States](#interactive-states)
15. [Accessibility](#accessibility)

---

## Theme Configuration

### Theme Variables

The system uses a dual-theme approach (Light/Dark) with semantic color tokens.

#### Primary Theme Colors

```javascript
primary: '#0891b2'; // Deep Teal - Main brand color
success: '#10b981'; // Green - Success states
warning: '#f59e0b'; // Amber - Warning states
danger: '#ef4444'; // Red - Error/danger states
```

#### Background Colors

```javascript
// Light Mode
background-light: '#f8fafc'    // Page background
surface-light: '#ffffff'       // Card/container background

// Dark Mode
background-dark: '#0c1416'     // Page background
surface-dark: '#1e293b'        // Card/container background
```

#### Text Colors

```javascript
// Light Mode
text-light: '#111814'          // Primary text

// Dark Mode
text-dark: '#e2e8f0'           // Primary text
```

#### Border Colors

```javascript
// Light Mode
border-light: '#e2e8f0'        // Default borders

// Dark Mode
border-dark: '#334155'         // Default borders
```

### Theme Usage Pattern

Always use semantic tokens instead of hardcoded colors:

- ✅ `bg-surface-light dark:bg-surface-dark`
- ❌ `bg-white dark:bg-gray-800`

---

## Typography System

### Font Sizes (Reduced by 20%)

#### Headings

| Level | Class                  | Size (px)   | Line Height | Weight          | Usage             |
| ----- | ---------------------- | ----------- | ----------- | --------------- | ----------------- |
| H1    | `text-3xl md:text-4xl` | 24px / 30px | 1.2         | `font-bold`     | Page titles       |
| H2    | `text-2xl`             | 20px        | 1.3         | `font-bold`     | Section titles    |
| H3    | `text-xl`              | 18px        | 1.4         | `font-bold`     | Subsection titles |
| H4    | `text-lg`              | 16px        | 1.5         | `font-semibold` | Card titles       |
| H5    | `text-base`            | 14px        | 1.5         | `font-semibold` | Small headings    |
| H6    | `text-sm`              | 12px        | 1.5         | `font-medium`   | Labels            |

#### Body Text

| Type  | Class         | Size (px) | Line Height | Weight        | Usage               |
| ----- | ------------- | --------- | ----------- | ------------- | ------------------- |
| Large | `text-base`   | 14px      | 1.6         | `font-normal` | Important body text |
| Base  | `text-sm`     | 12px      | 1.5         | `font-normal` | Default body text   |
| Small | `text-xs`     | 10px      | 1.4         | `font-normal` | Secondary text      |
| Tiny  | `text-[10px]` | 8px       | 1.3         | `font-normal` | Captions            |

#### Font Weights

- `font-light`: 300 - Light text
- `font-normal`: 400 - Default body text
- `font-medium`: 500 - Emphasized text
- `font-semibold`: 600 - Headings, labels
- `font-bold`: 700 - Strong emphasis

#### Font Family

- Primary: System font stack (sans-serif)
- Display: `'Manrope', sans-serif` (for headings)

### Typography Examples

```tsx
// Page Title
<h1 className="text-3xl md:text-4xl font-bold text-text-light dark:text-text-dark">
  Page Title
</h1>

// Section Title
<h2 className="text-2xl font-bold text-text-light dark:text-text-dark mb-4">
  Section Title
</h2>

// Body Text
<p className="text-sm text-text-light/80 dark:text-text-dark/80 leading-relaxed">
  Body content goes here
</p>

// Small Text
<span className="text-xs text-text-light/60 dark:text-text-dark/60">
  Helper text
</span>
```

---

## Color System

### Primary Colors

```css
/* Primary - Brand Color */
bg-primary              /* #0891b2 */
text-primary           /* #0891b2 */
border-primary         /* #0891b2 */

/* Primary Variants */
bg-primary/10          /* 10% opacity background */
bg-primary/20          /* 20% opacity background */
bg-primary/30          /* 30% opacity background */
bg-primary/50          /* 50% opacity background */
bg-primary/90          /* 90% opacity (hover states) */
```

### Status Colors

```css
/* Success */
bg-success             /* #10b981 */
text-success           /* #10b981 */
bg-success/10          /* Light background */

/* Warning */
bg-warning             /* #f59e0b */
text-warning           /* #f59e0b */
bg-warning/10          /* Light background */

/* Danger */
bg-danger              /* #ef4444 */
text-danger            /* #ef4444 */
bg-danger/10           /* Light background */
```

### Neutral Colors (Gray Scale)

```css
/* Light Mode */
bg-gray-50             /* Very light backgrounds */
bg-gray-100            /* Light backgrounds, borders */
bg-gray-200            /* Subtle borders */
bg-gray-300            /* Disabled states */
text-gray-400          /* Placeholders, icons */
text-gray-500          /* Secondary text */
text-gray-600          /* Body text */
text-gray-700          /* Headings */
text-gray-900          /* Strong text */

/* Dark Mode */
bg-gray-700            /* Borders, dividers */
bg-gray-800            /* Cards, containers */
bg-gray-900            /* Backgrounds */
text-gray-300          /* Body text */
text-gray-400          /* Secondary text */
text-gray-500          /* Muted text */
```

### Semantic Color Tokens

Always use semantic tokens for theme consistency:

```tsx
// ✅ Correct
className = 'bg-surface-light dark:bg-surface-dark';
className = 'text-text-light dark:text-text-dark';
className = 'border-border-light dark:border-border-dark';

// ❌ Incorrect
className = 'bg-white dark:bg-gray-800';
className = 'text-gray-900 dark:text-white';
```

---

## Spacing System

### Scale (Base: 4px)

| Size | Value | Class                    | Usage               |
| ---- | ----- | ------------------------ | ------------------- |
| 0    | 0px   | `p-0`, `m-0`, `gap-0`    | Reset               |
| 1    | 4px   | `p-1`, `m-1`, `gap-1`    | Tight spacing       |
| 2    | 8px   | `p-2`, `m-2`, `gap-2`    | Small spacing       |
| 3    | 12px  | `p-3`, `m-3`, `gap-3`    | Default spacing     |
| 4    | 16px  | `p-4`, `m-4`, `gap-4`    | Medium spacing      |
| 5    | 20px  | `p-5`, `m-5`, `gap-5`    | Large spacing       |
| 6    | 24px  | `p-6`, `m-6`, `gap-6`    | Extra large spacing |
| 8    | 32px  | `p-8`, `m-8`, `gap-8`    | Section spacing     |
| 10   | 40px  | `p-10`, `m-10`, `gap-10` | Page spacing        |
| 12   | 48px  | `p-12`, `m-12`, `gap-12` | Large sections      |

### Padding Patterns

```tsx
// Card padding
className = 'p-4 md:p-6'; // Responsive padding

// Section padding
className = 'px-4 sm:px-6 py-6'; // Responsive horizontal, fixed vertical

// Container padding
className = 'p-6 md:p-8'; // Larger containers
```

### Margin Patterns

```tsx
// Section spacing
className = 'mb-6 md:mb-8'; // Responsive margins

// Element spacing
className = 'mt-4 mb-2'; // Vertical rhythm
```

### Gap Patterns

```tsx
// Flex/Grid gaps
className = 'gap-3 md:gap-4'; // Responsive gaps
className = 'gap-x-4 gap-y-2'; // Different x/y gaps
```

---

## Component Library

### Button Component

#### Variants

```tsx
<Button variant="primary">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="danger">Destructive Action</Button>
<Button variant="outline">Outline Button</Button>
```

#### Sizes

```tsx
<Button size="sm">Small</Button>    // h-9, px-3, py-1.5, text-sm
<Button size="md">Medium</Button>   // h-12, px-5, py-2, text-base (default)
<Button size="lg">Large</Button>     // h-14, px-5, py-3, text-base
```

#### Button Styles

```css
/* Base */
font-bold rounded-lg transition-all
focus:outline-none focus:ring-2 focus:ring-offset-2
disabled:opacity-50 disabled:cursor-not-allowed
flex items-center justify-center gap-2

/* Primary */
bg-primary text-white hover:bg-primary/90
focus:ring-primary

/* Secondary */
bg-slate-200 dark:bg-slate-700
text-text-light dark:text-text-dark
hover:bg-slate-300 dark:hover:bg-slate-600

/* Danger */
bg-danger text-white hover:bg-danger/90
focus:ring-danger

/* Outline */
border border-border-light dark:border-border-dark
text-text-light dark:text-text-dark
hover:bg-surface-accent-light dark:hover:bg-surface-accent-dark
```

#### Usage Examples

```tsx
// Primary CTA
<Button variant="primary" size="md" className="w-full">
  Submit
</Button>

// Icon Button
<Button variant="outline" size="sm">
  <Plus className="w-4 h-4" />
  Add Item
</Button>

// Destructive Action
<Button variant="danger" size="sm">
  Delete
</Button>
```

---

### Card Component

#### Base Card Structure

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl border border-border-light dark:border-border-dark 
                shadow-sm hover:shadow-md transition-shadow"
>
  {/* Card Content */}
</div>
```

#### Card Variants

**Standard Card**

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl p-4 md:p-6 
                border border-border-light dark:border-border-dark 
                shadow-sm"
>
  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-2">Card Title</h3>
  <p className="text-sm text-text-light/80 dark:text-text-dark/80">Card content</p>
</div>
```

**Interactive Card**

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl p-4 md:p-6 
                border border-border-light dark:border-border-dark 
                hover:border-primary/30 
                hover:shadow-lg hover:shadow-primary/5 
                transition-all duration-300 cursor-pointer"
>
  {/* Content */}
</div>
```

**Card with Header**

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl border border-border-light dark:border-border-dark 
                shadow-sm overflow-hidden"
>
  <div
    className="p-4 md:p-6 border-b border-border-light dark:border-border-dark 
                  bg-gray-50/50 dark:bg-gray-800/50"
  >
    <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Card Header</h3>
  </div>
  <div className="p-4 md:p-6">{/* Card Body */}</div>
</div>
```

**Card Padding Guidelines**

- Small cards: `p-4` (16px)
- Medium cards: `p-4 md:p-6` (16px / 24px)
- Large cards: `p-6 md:p-8` (24px / 32px)

---

### Input Component

#### Base Input

```tsx
<input
  type="text"
  className="w-full px-3 py-2 
            bg-background-light dark:bg-background-dark
            border border-border-light dark:border-border-dark
            rounded-lg
            text-sm text-text-light dark:text-text-dark
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-primary/50 
            focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all"
  placeholder="Enter text..."
/>
```

#### Input Sizes

```tsx
// Small
className = 'px-2 py-1.5 text-xs h-8';

// Medium (default)
className = 'px-3 py-2 text-sm h-10';

// Large
className = 'px-4 py-2.5 text-base h-12';
```

#### Input with Icon

```tsx
<div className="relative">
  <Search
    className="absolute left-3 top-1/2 -translate-y-1/2 
                     w-4 h-4 text-gray-400 pointer-events-none"
  />
  <input
    type="text"
    className="w-full pl-10 pr-3 py-2 
              bg-background-light dark:bg-background-dark
              border border-border-light dark:border-border-dark
              rounded-lg text-sm
              focus:outline-none focus:ring-2 focus:ring-primary/50"
  />
</div>
```

#### Input States

```tsx
// Error State
className = 'border-danger focus:ring-danger/50';

// Success State
className = 'border-success focus:ring-success/50';

// Disabled State
className = 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800';
```

---

### Table Component

#### Base Table Structure

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl border border-border-light dark:border-border-dark 
                shadow-sm overflow-hidden"
>
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-border-light dark:border-border-dark">
        <tr>
          <th
            className="px-4 py-3 text-left text-xs font-semibold 
                        text-text-light dark:text-text-dark uppercase tracking-wider"
          >
            Column Header
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border-light dark:divide-border-dark">
        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <td className="px-4 py-3 text-sm text-text-light dark:text-text-dark">Cell Content</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

#### Table Styling Guidelines

- **Header**: `bg-gray-50 dark:bg-gray-800/50`, `text-xs font-semibold uppercase`
- **Cells**: `px-4 py-3`, `text-sm`
- **Rows**: `hover:bg-gray-50 dark:hover:bg-gray-800/50`
- **Dividers**: `divide-y divide-border-light dark:divide-border-dark`
- **Responsive**: Wrap in `overflow-x-auto` container

#### Table with Actions

```tsx
<td className="px-4 py-3">
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm">
      Edit
    </Button>
    <Button variant="danger" size="sm">
      Delete
    </Button>
  </div>
</td>
```

---

### Badge Component

#### Badge Variants

```tsx
// Primary Badge
<span className="px-2 py-1 text-xs font-medium
                 bg-primary/10 text-primary
                 rounded-full">
  New
</span>

// Success Badge
<span className="px-2 py-1 text-xs font-medium
                 bg-success/10 text-success
                 rounded-full">
  Active
</span>

// Warning Badge
<span className="px-2 py-1 text-xs font-medium
                 bg-warning/10 text-warning
                 rounded-full">
  Pending
</span>

// Danger Badge
<span className="px-2 py-1 text-xs font-medium
                 bg-danger/10 text-danger
                 rounded-full">
  Inactive
</span>
```

#### Badge Sizes

```tsx
// Small
className = 'px-1.5 py-0.5 text-[10px]';

// Medium (default)
className = 'px-2 py-1 text-xs';

// Large
className = 'px-3 py-1.5 text-sm';
```

---

### Modal Component

#### Modal Structure

```tsx
{
  /* Overlay */
}
<div
  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 
                flex items-center justify-center p-4"
>
  {/* Modal */}
  <div
    className="bg-surface-light dark:bg-surface-dark 
                  rounded-2xl shadow-2xl 
                  w-full max-w-2xl max-h-[90vh] 
                  overflow-hidden flex flex-col"
  >
    {/* Header */}
    <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
      <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Modal Title</h2>
    </div>

    {/* Content */}
    <div className="flex-1 overflow-y-auto p-4 md:p-6">{/* Modal content */}</div>

    {/* Footer */}
    <div
      className="p-4 md:p-6 border-t border-border-light dark:border-border-dark 
                    flex items-center justify-end gap-3"
    >
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onConfirm}>
        Confirm
      </Button>
    </div>
  </div>
</div>;
```

#### Modal Sizes

```tsx
// Small
className = 'max-w-md';

// Medium (default)
className = 'max-w-2xl';

// Large
className = 'max-w-4xl';

// Full Screen
className = 'max-w-7xl';
```

---

## Layout Patterns

### Page Container

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8">{/* Page content */}</div>
```

### Two-Column Layout

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
  {/* Main Content - 2 columns */}
  <div className="lg:col-span-2">{/* Content */}</div>

  {/* Sidebar - 1 column */}
  <div className="lg:col-span-1">{/* Sidebar */}</div>
</div>
```

### Three-Column Layout

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">{/* Columns */}</div>
```

### Flex Layouts

```tsx
// Horizontal
<div className="flex items-center justify-between gap-4">
  {/* Items */}
</div>

// Vertical
<div className="flex flex-col gap-4">
  {/* Items */}
</div>

// Responsive
<div className="flex flex-col md:flex-row gap-4">
  {/* Items */}
</div>
```

---

## Responsive Design

### Breakpoints

| Breakpoint | Min Width | Usage               |
| ---------- | --------- | ------------------- |
| `sm`       | 640px     | Small tablets       |
| `md`       | 768px     | Tablets             |
| `lg`       | 1024px    | Desktops            |
| `xl`       | 1280px    | Large desktops      |
| `2xl`      | 1536px    | Extra large screens |

### Responsive Patterns

#### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
// ✅ Correct - Mobile first
className = 'text-sm md:text-base lg:text-lg';
className = 'p-4 md:p-6 lg:p-8';
className = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

// ❌ Incorrect - Desktop first
className = 'text-lg md:text-base sm:text-sm';
```

#### Common Responsive Patterns

```tsx
// Typography
className = 'text-2xl md:text-3xl lg:text-4xl';

// Spacing
className = 'p-4 md:p-6 lg:p-8';
className = 'gap-3 md:gap-4 lg:gap-6';

// Grid
className = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

// Flex Direction
className = 'flex-col md:flex-row';

// Visibility
className = 'hidden md:block'; // Hide on mobile
className = 'block md:hidden'; // Show only on mobile

// Width
className = 'w-full md:w-auto';
className = 'w-full md:w-96 lg:w-[500px]';
```

#### Container Queries (Future)

When supported, use container queries for component-level responsiveness.

---

## Tables & Data Display

### Table Structure

#### Complete Table with Pagination

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl border border-border-light dark:border-border-dark 
                shadow-sm overflow-hidden"
>
  {/* Table Header with Filters */}
  <div className="p-4 md:p-6 border-b border-border-light dark:border-border-dark">
    <div
      className="flex flex-col md:flex-row md:items-center 
                    md:justify-between gap-4"
    >
      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Table Title</h3>
      <div className="flex items-center gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Search..."
          className="px-3 py-2 text-sm border rounded-lg"
        />
        {/* Filter Button */}
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>
    </div>
  </div>

  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-gray-800/50">
        <tr>
          <th
            className="px-4 py-3 text-left text-xs font-semibold 
                        text-text-light dark:text-text-dark uppercase tracking-wider"
          >
            Column 1
          </th>
          {/* More headers */}
        </tr>
      </thead>
      <tbody className="divide-y divide-border-light dark:divide-border-dark">{/* Rows */}</tbody>
    </table>
  </div>

  {/* Pagination */}
  <div
    className="p-4 md:p-6 border-t border-border-light dark:border-border-dark 
                  flex flex-col sm:flex-row items-center justify-between gap-4"
  >
    <div className="text-sm text-text-light/60 dark:text-text-dark/60">
      Showing 1-10 of 100 results
    </div>
    {/* Pagination Controls */}
  </div>
</div>
```

### Table Row States

```tsx
// Default Row
<tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

// Selected Row
<tr className="bg-primary/5 dark:bg-primary/10 border-l-2 border-primary">

// Disabled Row
<tr className="opacity-50 cursor-not-allowed">
```

### Empty State

```tsx
<tr>
  <td colSpan={columns.length} className="px-4 py-12 text-center">
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 
                      flex items-center justify-center"
      >
        <Inbox className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm text-text-light/60 dark:text-text-dark/60">No data available</p>
    </div>
  </td>
</tr>
```

---

## Advanced Filtering

### Filter Panel Structure

```tsx
<div
  className="bg-surface-light dark:bg-surface-dark 
                rounded-xl border border-border-light dark:border-border-dark 
                p-4 md:p-6"
>
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-base font-semibold text-text-light dark:text-text-dark">Filters</h3>
    <Button variant="outline" size="sm" onClick={clearFilters}>
      Clear All
    </Button>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{/* Filter Inputs */}</div>

  {/* Active Filters */}
  {activeFilters.length > 0 && (
    <div className="mt-4 pt-4 border-t border-border-light dark:border-border-dark">
      <div className="flex flex-wrap gap-2">
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="px-2 py-1 text-xs bg-primary/10 text-primary 
                          rounded-full flex items-center gap-1"
          >
            {filter.label}
            <button onClick={() => removeFilter(filter.key)}>
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )}
</div>
```

### Filter Types

#### Text Filter

```tsx
<div>
  <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
    Search
  </label>
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search..."
    className="w-full px-3 py-2 text-sm border rounded-lg"
  />
</div>
```

#### Select Filter

```tsx
<div>
  <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
    Status
  </label>
  <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="w-full px-3 py-2 text-sm border rounded-lg"
  >
    <option value="">All Status</option>
    <option value="active">Active</option>
    <option value="inactive">Inactive</option>
  </select>
</div>
```

#### Date Range Filter

```tsx
<div className="grid grid-cols-2 gap-2">
  <div>
    <label className="block text-xs font-medium mb-1">From</label>
    <input
      type="date"
      value={dateFrom}
      onChange={(e) => setDateFrom(e.target.value)}
      className="w-full px-3 py-2 text-sm border rounded-lg"
    />
  </div>
  <div>
    <label className="block text-xs font-medium mb-1">To</label>
    <input
      type="date"
      value={dateTo}
      onChange={(e) => setDateTo(e.target.value)}
      className="w-full px-3 py-2 text-sm border rounded-lg"
    />
  </div>
</div>
```

#### Multi-Select Filter

```tsx
<div>
  <label className="block text-xs font-medium mb-1">Categories</label>
  <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2">
    {categories.map((category) => (
      <label key={category.id} className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selectedCategories.includes(category.id)}
          onChange={(e) => handleCategoryToggle(category.id, e.target.checked)}
          className="rounded border-gray-300"
        />
        <span>{category.name}</span>
      </label>
    ))}
  </div>
</div>
```

#### Range Slider Filter

```tsx
<div>
  <label className="block text-xs font-medium mb-2">
    Price Range: ${priceRange[0]} - ${priceRange[1]}
  </label>
  <input
    type="range"
    min={0}
    max={1000}
    value={priceRange[1]}
    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
    className="w-full"
  />
</div>
```

### Filter State Management

```tsx
// Filter state
const [filters, setFilters] = useState({
  search: '',
  status: '',
  dateFrom: '',
  dateTo: '',
  categories: [],
  priceRange: [0, 1000],
});

// Active filters count
const activeFiltersCount = Object.values(filters).filter(
  (value) => value !== '' && value !== null && (Array.isArray(value) ? value.length > 0 : true)
).length;

// Clear all filters
const clearFilters = () => {
  setFilters({
    search: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    categories: [],
    priceRange: [0, 1000],
  });
};
```

---

## Pagination

### Pagination Component

```tsx
<div
  className="flex flex-col sm:flex-row items-center justify-between gap-4 
                p-4 md:p-6 border-t border-border-light dark:border-border-dark"
>
  {/* Results Info */}
  <div className="text-sm text-text-light/60 dark:text-text-dark/60">
    Showing <span className="font-medium">{start}</span> to{' '}
    <span className="font-medium">{end}</span> of <span className="font-medium">{total}</span>{' '}
    results
  </div>

  {/* Pagination Controls */}
  <div className="flex items-center gap-2">
    {/* Previous Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => goToPage(currentPage - 1)}
      disabled={currentPage === 1}
    >
      <ChevronLeft className="w-4 h-4" />
      Previous
    </Button>

    {/* Page Numbers */}
    <div className="flex items-center gap-1">
      {pageNumbers.map((page) => (
        <button
          key={page}
          onClick={() => goToPage(page)}
          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
            page === currentPage
              ? 'bg-primary text-white'
              : 'bg-surface-light dark:bg-surface-dark text-text-light dark:text-text-dark hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          {page}
        </button>
      ))}
    </div>

    {/* Next Button */}
    <Button
      variant="outline"
      size="sm"
      onClick={() => goToPage(currentPage + 1)}
      disabled={currentPage === totalPages}
    >
      Next
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>

  {/* Items Per Page */}
  <div className="flex items-center gap-2">
    <span className="text-xs text-text-light/60 dark:text-text-dark/60">Per page:</span>
    <select
      value={itemsPerPage}
      onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
      className="px-2 py-1 text-xs border rounded-lg"
    >
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
      <option value={100}>100</option>
    </select>
  </div>
</div>
```

### Pagination Logic

```tsx
// Calculate pagination
const itemsPerPage = 10;
const totalPages = Math.ceil(totalItems / itemsPerPage);
const start = (currentPage - 1) * itemsPerPage + 1;
const end = Math.min(currentPage * itemsPerPage, totalItems);

// Generate page numbers
const getPageNumbers = () => {
  const pages = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    }
  }

  return pages;
};
```

---

## Borders & Dividers

### Border Styles

#### Card Borders

```tsx
// Standard border
className="border border-border-light dark:border-border-dark"

// Subtle border
className="border border-gray-100 dark:border-gray-700"

// Strong border
className="border-2 border-border-light dark:border-border-dark"

// Colored border (accent)
className="border border-primary/30"

// Hover border
className="border border-border-light dark:border-border-dark
           hover:border-primary/50"
```

#### Border Radius

```tsx
// Small
className = 'rounded'; // 4px

// Medium
className = 'rounded-lg'; // 8px

// Large
className = 'rounded-xl'; // 12px

// Extra Large
className = 'rounded-2xl'; // 16px

// Full
className = 'rounded-full'; // 9999px
```

### Dividers

#### Horizontal Divider

```tsx
// Standard
<div className="border-t border-border-light dark:border-border-dark" />

// Subtle
<div className="border-t border-gray-100 dark:border-gray-700" />

// With spacing
<div className="my-4 border-t border-border-light dark:border-border-dark" />
```

#### Vertical Divider

```tsx
<div className="border-l border-border-light dark:border-border-dark h-full" />
```

#### Divider with Text

```tsx
<div className="flex items-center gap-4 my-6">
  <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
  <span className="text-xs text-text-light/60 dark:text-text-dark/60">OR</span>
  <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
</div>
```

### Border Patterns

#### Card with Border Accent

```tsx
<div
  className="border-l-4 border-primary 
                bg-surface-light dark:bg-surface-dark 
                rounded-lg p-4"
>
  {/* Content */}
</div>
```

#### Dashed Border

```tsx
<div
  className="border-2 border-dashed border-border-light dark:border-border-dark 
                rounded-xl p-8 text-center"
>
  {/* Drop zone or empty state */}
</div>
```

---

## Forms & Inputs

### Form Structure

```tsx
<form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
  {/* Form Fields */}
</form>
```

### Form Field Structure

```tsx
<div>
  <label className="block text-xs font-medium text-text-light dark:text-text-dark mb-1">
    Label Text
    {required && <span className="text-danger ml-1">*</span>}
  </label>
  <input type="text" className="w-full px-3 py-2 text-sm border rounded-lg" required={required} />
  <p className="mt-1 text-xs text-text-light/60 dark:text-text-dark/60">Helper text</p>
</div>
```

### Form Validation States

```tsx
// Error State
<div>
  <label className="block text-xs font-medium text-danger mb-1">
    Email
  </label>
  <input
    type="email"
    className="w-full px-3 py-2 text-sm border border-danger rounded-lg
              focus:ring-danger/50"
  />
  <p className="mt-1 text-xs text-danger">
    Please enter a valid email address
  </p>
</div>

// Success State
<div>
  <label className="block text-xs font-medium text-success mb-1">
    Email
  </label>
  <input
    type="email"
    className="w-full px-3 py-2 text-sm border border-success rounded-lg
              focus:ring-success/50"
  />
  <p className="mt-1 text-xs text-success">
    ✓ Email is valid
  </p>
</div>
```

### Form Layouts

#### Single Column

```tsx
<div className="space-y-4">{/* Fields */}</div>
```

#### Two Column

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">{/* Fields */}</div>
```

#### Three Column

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{/* Fields */}</div>
```

---

## Interactive States

### Hover States

```tsx
// Buttons
className = 'hover:bg-primary/90';
className = 'hover:shadow-md';

// Cards
className = 'hover:shadow-lg hover:border-primary/30';

// Links
className = 'hover:text-primary hover:underline';
```

### Active States

```tsx
// Buttons
className = 'active:scale-95';

// Selected Items
className = 'bg-primary/10 border-primary';
```

### Focus States

```tsx
// Inputs
className = 'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';

// Buttons
className = 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary';
```

### Disabled States

```tsx
className = 'opacity-50 cursor-not-allowed';
```

### Loading States

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>
```

---

## Accessibility

### Focus Management

- All interactive elements must have visible focus states
- Use `focus:ring-2 focus:ring-primary/50` for focus indicators
- Ensure keyboard navigation works for all interactive elements

### ARIA Labels

```tsx
<button aria-label="Close modal" onClick={onClose}>
  <X className="w-5 h-5" />
</button>
```

### Semantic HTML

- Use proper heading hierarchy (h1 → h2 → h3)
- Use semantic elements (`<nav>`, `<main>`, `<section>`, `<article>`)
- Use `<label>` for form inputs
- Use `<button>` for actions, not `<div>`

### Color Contrast

- Ensure minimum contrast ratio of 4.5:1 for text
- Use `text-text-light dark:text-text-dark` for primary text
- Use opacity variants for secondary text: `text-text-light/60`

### Screen Reader Support

```tsx
// Loading state
<div role="status" aria-live="polite">
  <Loader2 className="w-4 h-4 animate-spin" />
  <span className="sr-only">Loading...</span>
</div>

// Error message
<div role="alert" className="text-danger">
  Error message
</div>
```

---

## Best Practices

### Component Reusability

1. Create reusable components in `/components/ui/`
2. Use consistent prop interfaces
3. Support theme variants through className props
4. Document component usage

### Performance

1. Use `useMemo` for expensive calculations
2. Implement virtual scrolling for long lists
3. Lazy load images and heavy components
4. Debounce search and filter inputs

### Code Organization

1. Keep components small and focused
2. Extract reusable logic into custom hooks
3. Use TypeScript for type safety
4. Follow consistent naming conventions

### Testing Considerations

1. Ensure components are testable
2. Use data-testid for important elements
3. Keep components pure when possible
4. Mock external dependencies

---

## Quick Reference

### Common Class Combinations

#### Card

```tsx
className="bg-surface-light dark:bg-surface-dark
          rounded-xl p-4 md:p-6
          border border-border-light dark:border-border-dark
          shadow-sm"
```

#### Button

```tsx
className="px-4 py-2 text-sm font-semibold
          bg-primary text-white rounded-lg
          hover:bg-primary/90 transition-all"
```

#### Input

```tsx
className="w-full px-3 py-2 text-sm
          bg-background-light dark:bg-background-dark
          border border-border-light dark:border-border-dark
          rounded-lg
          focus:outline-none focus:ring-2 focus:ring-primary/50"
```

#### Container

```tsx
className = 'max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8';
```

---

## Version History

- **v1.0.0** - Initial design system documentation
- Font sizes reduced by 20% from original
- Comprehensive component library
- Advanced filtering and pagination patterns

---

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- Component examples in `/components/ui/`
