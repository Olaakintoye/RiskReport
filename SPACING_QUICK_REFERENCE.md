# Spacing Quick Reference Guide

## Standardized Spacing Values

| Constant | Value | Use Case |
|----------|-------|----------|
| `SPACING.xs` | 4pt | Micro spacing (very tight elements) |
| `SPACING.sm` | 8pt | Small spacing (related items like icon-to-text) |
| `SPACING.md` | 16pt | Medium spacing (content items, screen edges) |
| `SPACING.lg` | 24pt | Large spacing (between sections) |
| `SPACING.xl` | 32pt | Extra large (major page divisions) |
| `SPACING.screenPadding` | 16pt | Standard screen edge margin |
| `SPACING.cardPadding` | 16pt | Standard card internal padding |
| `SPACING.sectionTop` | 24pt | Section header top margin |
| `SPACING.sectionBottom` | 12pt | Section header bottom margin |
| `SPACING.cardGap` | 16pt | Space between cards |

## Visual Spacing Guide

```
┌─────────────────────────────────────┐
│ Screen Edge (16pt padding)          │
│   ┌─────────────────────────────┐   │
│   │ Card (16pt internal padding)│   │
│   │                             │   │
│   │  Content (16pt spacing)     │   │
│   │                             │   │
│   └─────────────────────────────┘   │
│   │                                 │
│   └─16pt gap (cardGap)              │
│   │                                 │
│   ┌─────────────────────────────┐   │
│   │ Another Card                │   │
│   └─────────────────────────────┘   │
│                                     │
│   ▼ 24pt (sectionTop)              │
│   ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓   │
│   ┃ Section Header              ┃   │
│   ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛   │
│   ▼ 12pt (sectionBottom)           │
│   ┌─────────────────────────────┐   │
│   │ Section Content             │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Common Patterns

### Screen Layout
```typescript
{
  paddingHorizontal: SPACING.screenPadding,  // 16pt from edges
  paddingTop: SPACING.sm,                    // 8pt from top
  paddingBottom: 40,                          // Extra for scroll
}
```

### Card Component
```typescript
{
  marginHorizontal: SPACING.screenPadding,   // 16pt from edges
  marginBottom: SPACING.cardGap,             // 16pt between cards
  padding: SPACING.cardPadding,              // 16pt internal
  borderRadius: 16,                          // Match padding
}
```

### Section Header
```typescript
{
  marginTop: SPACING.sectionTop,             // 24pt above
  marginBottom: SPACING.sectionBottom,       // 12pt below
  paddingHorizontal: SPACING.screenPadding,  // 16pt from edges
}
```

### Related Content
```typescript
{
  gap: SPACING.md,                           // 16pt between items
}
```

### Tight Grouping (icon + label)
```typescript
{
  gap: SPACING.sm,                           // 8pt between
}
```

## Before & After Comparison

### Dashboard Screen

| Element | Before | After | Constant |
|---------|--------|-------|----------|
| Card margin horizontal | 16 | 16 | `screenPadding` |
| Card margin bottom | 16 | 16 | `cardGap` |
| Section margin top | 28 | 24 | `sectionTop` |
| Section margin bottom | 12 | 12 | `sectionBottom` |
| Card padding | 16 | 16 | `cardPadding` |
| Portfolio card gap | 12 | 8 | `sm` |

**Result**: More consistent, section spacing reduced from 28→24 (iOS standard), tighter card gaps

### Risk Report Screen

| Element | Before | After | Constant |
|---------|--------|-------|----------|
| Card margin horizontal | 16 | 16 | `screenPadding` |
| Card margin vertical | 8 | 8 | `sm` |
| Card padding | 16 | 16 | `cardPadding` |
| Card header margin | 16 | 16 | `md` |
| Content gap | 16 | 16 | `md` |

**Result**: Consistently using named constants, easier to maintain

### Portfolio Screen  

| Element | Before | After | Constant |
|---------|--------|-------|----------|
| Header padding horizontal | 16 | 16 | `screenPadding` |
| Header padding top | 16 | 16 | `md` |
| Header padding bottom | 8 | 8 | `sm` |
| Summary padding | 16 | 16 | `md` |

**Result**: Semantic naming makes intent clear

## iOS Design Principles

### 8-Point Grid System
All spacing values are multiples of 4 or 8:
- 4, 8, 12, 16, 24, 32, 40, 48...
- Creates visual rhythm and consistency
- Aligns with pixel grid on Retina displays

### Touch Targets
- Minimum: 44×44 points (Apple guideline)
- Spacing ensures targets don't overlap
- Padding around interactive elements

### Visual Hierarchy
- More space = more importance
- Sections: 24pt separation (major breaks)
- Cards: 16pt separation (related content)
- Items: 8pt separation (tight groups)

### Breathing Room
- 16pt screen padding prevents edge collision
- Cards have internal padding matching their gaps
- Content doesn't feel cramped

## Migration Guide

### Adding New Screens

1. Import the spacing constant:
```typescript
import SPACING from '../constants/spacing';
```

2. Replace hardcoded values:
```typescript
// Before
paddingHorizontal: 16,
marginTop: 20,
gap: 12,

// After
paddingHorizontal: SPACING.screenPadding,
marginTop: SPACING.lg,
gap: SPACING.sm,
```

3. Use semantic names for clarity:
- Screen edges → `SPACING.screenPadding`
- Between sections → `SPACING.sectionTop` / `sectionBottom`
- Between cards → `SPACING.cardGap`
- Inside cards → `SPACING.cardPadding`
- Related content → `SPACING.md`
- Tight elements → `SPACING.sm`

### Updating Existing Screens

1. Search for hardcoded spacing values
2. Replace with appropriate SPACING constant
3. Test visual appearance
4. Verify touch targets remain accessible

## Best Practices

✅ **DO:**
- Use SPACING constants for all spacing
- Choose semantic names (screenPadding vs md)
- Maintain visual hierarchy
- Test on actual devices

❌ **DON'T:**
- Use arbitrary values (13pt, 17pt, etc.)
- Mix constant and hardcoded values
- Create inconsistent patterns
- Forget about safe areas on notched devices

## Additional Resources

- [Apple HIG - Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [Apple HIG - Spacing](https://developer.apple.com/design/human-interface-guidelines/foundations/layout)
- [Material Design - Spacing](https://material.io/design/layout/spacing-methods.html)

