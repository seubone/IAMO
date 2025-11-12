# Design Guidelines: AI Monitoring System (N8N Integration)

## Design Approach
**System-Based Approach** - Utility-focused dashboard application prioritizing efficiency, data density, and operational clarity. Design inspiration from Linear (clean typography), Vercel Dashboard (minimal aesthetic), and Datadog (monitoring clarity).

## Core Design Principles
1. **Operational Clarity**: Every element serves a monitoring function
2. **High Contrast**: Ensure readability in mission-critical contexts  
3. **Visual Hierarchy**: Guide users from status overview → investigation → action
4. **Real-time Feedback**: Immediate visual response to system state changes

## Color Palette

### Dark Mode (Primary)
- **Background Base**: `#0B0B0D` (near-black canvas)
- **Surface**: `#1A1A1C` (elevated cards/panels)
- **Border**: `#2A2A2C` (subtle divisions)
- **Text Primary**: `#F5F6F7` (high contrast)
- **Text Muted**: `#A0A0A3` (secondary information)
- **Brand Accent**: `#FBC000` (yellow - CTAs and critical highlights only)
- **Brand Contrast**: `#050403` (deep black for text on yellow)

### Light Mode
- **Background Base**: `#FFFFFF` (clean white)
- **Surface**: `#F8F8F9` (subtle elevation)
- **Border**: `#E5E5E7` (defined boundaries)
- **Text Primary**: `#0A0A0A` (sharp readability)
- **Text Muted**: `#6B6B6D` (de-emphasized content)

### Semantic Colors
- **Success**: `142 76% 36%` (green - active status)
- **Warning**: `43 96% 56%` (amber - paused/attention)
- **Error**: `0 84% 60%` (red - inactive/critical)
- **Info**: `217 91% 60%` (blue - informational)

## Typography

### Font Families
- **Primary**: Inter (UI, data, metrics)
- **Accent**: Poppins (headings, emphasis)

### Type Scale
- **Display**: 32px/40px (page titles)
- **Heading 1**: 24px/32px (section headers)
- **Heading 2**: 20px/28px (card titles)
- **Body**: 14px/20px (primary content)
- **Caption**: 12px/16px (metadata, timestamps)
- **Code/Mono**: 13px/18px (IDs, technical data)

### Font Weights
- Regular: 400 (body text)
- Medium: 500 (emphasis, labels)
- Semibold: 600 (headings, buttons)
- Bold: 700 (critical alerts, primary CTAs)

## Layout System

### Spacing Scale (Tailwind Units)
- **Micro**: 2, 4 (inline elements, icon gaps)
- **Component**: 6, 8 (internal padding)
- **Section**: 12, 16 (card spacing, margins)
- **Major**: 24, 32 (page sections, large gaps)

### Grid System
- **12-column responsive grid**
- Container max-width: 1440px
- Gutter: 24px (desktop), 16px (mobile)

### Component Dimensions
- **Border Radius**: rounded-lg (8px cards), rounded-2xl (16px modals)
- **Shadows**: Subtle elevation (0 1px 3px rgba(0,0,0,0.1))
- **Borders**: 1px solid with theme-aware colors

## Layout Architecture

### Top Ticker Bar (Fixed)
- Height: 48px
- Horizontal scroll of IA status chips
- Status indicators: 🟢 Active, 🟡 Paused, 🔴 Inactive
- Smooth auto-scroll with hover-pause

### Left Sidebar (280px)
- Collapsible to 64px (icon-only)
- Sections: Settings, IA List, Tags, Advanced Filters
- Sticky filters with clear/reset affordance

### Main Content Panel
- Virtualized feed (handles 10k+ tickets)
- Card-based ticket display with hover states
- Quick actions on card hover (view, assign, resolve)
- Search bar with real-time filtering (<100ms response)

### Right Context Panel (360px)
- Slides in on ticket selection
- Sections: Details, History Timeline, Action Buttons
- Clear visual separation between info and controls

## Component Library

### Navigation
- **Top Bar**: Brand, global search, notifications, user menu
- **Sidebar**: Icon + label, active state with accent border-left
- **Breadcrumbs**: Context path with separator chevrons

### Data Display
- **Status Badge**: Pill shape, colored dot + label
- **Metric Card**: Large number, subtitle, trend indicator (↑↓)
- **Table**: Striped rows, sortable headers, sticky header on scroll
- **Timeline**: Vertical line connector, event cards with timestamps
- **Kanban Column**: Title + count, draggable cards, visual drop zones

### Forms & Inputs
- **Text Input**: Border focus state, clear icon, helper text below
- **Select**: Chevron indicator, dropdown with search for >10 items
- **Checkbox/Radio**: Custom styled, yellow accent when checked
- **Toggle**: Pill-shaped switch for binary states (theme, IA status)

### Feedback & Overlays
- **Toast Notification**: Top-right slide-in, auto-dismiss, action button
- **Modal**: Centered, backdrop blur, escape to close
- **Loading**: Spinner for actions, skeleton for content
- **Empty State**: Illustration + message + CTA

### Interactive Elements
- **Primary Button**: Yellow fill (#FBC000), black text, bold
- **Secondary Button**: Transparent, border, white/black text
- **Ghost Button**: No border, hover background
- **Icon Button**: 40x40 touch target, subtle hover state

## Chat Interface

### Message Bubbles
- **IA Messages**: Left-aligned, neutral background
- **User Messages**: Right-aligned, subtle brand tint
- **System Messages**: Centered, italic, muted
- **Tags**: Inline pills (Lead engajado, Orçamento, Pago)

### Chat Controls
- **Input Bar**: Fixed bottom, auto-expand, send button
- **Notes Panel**: Collapsible, yellow highlight on new note
- **IA Toggle**: Prominent switch with confirmation modal

## Dashboard Metrics

### KPI Cards (2x4 Grid)
- Large number (32px bold)
- Metric label (14px muted)
- Trend graph (sparkline, 60px height)
- Period selector (Last 7/30/90 days)

### Charts
- Line/Bar: Minimal grid, axis labels, tooltip on hover
- Pie/Donut: Segment labels, legend with percentages
- Heatmap: Time blocks, intensity color scale

## Tickets & Kanban

### Kanban Columns
- **Header**: Title + count badge + filter icon
- **Cards**: Compact view (thumbnail + title + meta)
- **Drag Indicator**: Subtle grab handle on hover
- **Add Button**: Bottom of column, dashed border

### Ticket Categories (Color-Coded)
- Falha Automação: Red border-left
- Falha Prompt: Orange border-left  
- Falha Negociação: Blue border-left

## Accessibility Features
- **Keyboard Navigation**: Tab order, focus indicators (2px yellow outline)
- **Screen Reader**: ARIA labels, live regions for updates
- **Contrast**: Minimum 4.5:1 ratio for text
- **Interactive Targets**: 44x44px minimum touch area
- **Theme Toggle**: System preference detection, persistent choice

## Animation & Transitions
- **Duration**: 150ms micro, 250ms standard, 400ms complex
- **Easing**: ease-out for entrances, ease-in for exits
- **Real-time Updates**: Slide-in from top (ticker), pulse (new ticket)
- **Page Transitions**: Fade + slight slide (150ms)

## States & Feedback

### Loading States
- Skeleton screens for content areas
- Spinner for button actions
- Progress bar for file operations

### Empty States  
- Illustration (simple line art)
- Helpful message
- Primary CTA (yellow button)

### Error States
- Red alert banner with icon
- Clear error message
- Retry/Contact support actions

### Success States
- Green checkmark toast
- Subtle confetti for major actions
- Auto-dismiss after 3s

## Responsive Breakpoints
- Mobile: < 768px (stacked layout, bottom nav)
- Tablet: 768px - 1024px (collapsed sidebar)
- Desktop: > 1024px (full three-panel layout)

---

**Critical Implementation Notes:**
- Yellow accent ONLY for CTAs, highlights, and interactive focus states
- Never use yellow as text background for long-form content
- Maintain consistent 8px spacing grid throughout
- Virtualize all lists with >100 items for performance
- Persist theme preference to localStorage/user settings
- All interactive elements must have accessible labels
- Real-time updates use WebSocket with optimistic UI updates