/**
 * Standardized spacing system for iOS mobile app
 * Following Apple Human Interface Guidelines
 */

export const SPACING = {
  // Micro spacing for very tight elements
  xs: 4,
  
  // Small spacing - between related small elements (buttons, icons, labels)
  sm: 8,
  
  // Medium spacing - between related content items
  md: 16,
  
  // Large spacing - between different sections or cards
  lg: 24,
  
  // Extra large spacing - between major page sections
  xl: 32,
  
  // Screen edge padding/margin
  screenPadding: 16,
  
  // Card padding
  cardPadding: 16,
  
  // Section header spacing
  sectionTop: 24,
  sectionBottom: 12,
  
  // Card spacing between cards
  cardGap: 16,
} as const;

export type Spacing = typeof SPACING;

export default SPACING;

