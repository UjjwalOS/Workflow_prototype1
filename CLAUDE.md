# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Product Designer Context

The owner of this project is a **product designer who is learning to code**. When making changes:
- Explain what you're doing and why in simple terms
- Keep code well-organized and commented
- Prefer clarity over cleverness
- If something might be confusing, add a brief explanation

## Project Overview

IDMS v6 (Integrated Document Management System) - A document workflow management interface for the Papua New Guinea Office of the Chief Secretary. The system allows different roles to process, review, and approve government documents.

## Commands

```bash
# Start the development server
npm start

# Build for production (creates optimized files in /dist)
npm run build

# Run both CSS and JS linting
npm run lint
```

## Project Structure

```
├── src/
│   ├── css/
│   │   ├── tokens.css       # Design tokens (colors, spacing, shadows)
│   │   ├── base.css         # Reset and base element styles
│   │   ├── components.css   # Reusable UI components (buttons, cards, badges)
│   │   ├── layout.css       # Page layout (sidebar, main content, panels)
│   │   └── utilities.css    # Helper classes
│   │
│   ├── js/
│   │   ├── config.js        # Roles, transitions, and settings
│   │   ├── state.js         # Application state management
│   │   ├── render.js        # UI rendering functions
│   │   ├── events.js        # Event handlers and user interactions
│   │   ├── modals.js        # Modal dialog logic
│   │   └── app.js           # Main entry point
│   │
│   └── index.html           # Main HTML file
│
├── dist/                    # Built files (generated)
├── package.json             # Project dependencies and scripts
└── CLAUDE.md               # This file
```

## Architecture Overview

### State Management
- Single source of truth in `state.js` with `getInitialState()` function
- State changes trigger `renderAll()` to update the entire UI
- Never modify DOM directly; always update state and re-render

### Role System
The app simulates 4 different user roles, each with different permissions:
- **DTO** (Document Transfer Officer): Registers new documents, routes to EA
- **EA** (Executive Assistant): Triages documents, forwards to CS
- **CS** (Chief Secretary): Reviews, delegates, approves, or closes cases
- **AO** (Action Officer): Completes assigned tasks, submits work back to CS

### Document Workflow
Documents flow through the system via transitions defined in `config.js`:
```
DTO → EA → CS → AO (delegation)
              → Close case
              → Send back
AO → CS (submission)
```

### Key Concepts

**Documents vs Drafts vs Submissions:**
- `documents[]` - Original case documents
- `drafts[]` - Work-in-progress docs (only visible to owner)
- `submissions[]` - Formally submitted docs with audit trail

**Events:** Every action creates an event in the timeline for audit

**Comments:** Notes attached to documents or cases

## CSS Organization

The CSS uses CSS Custom Properties (variables) for consistent theming:
```css
/* Example: All colors come from tokens.css */
--primary: #2563eb;
--success: #16a34a;
--gray-500: #6b7280;
```

## Adding New Features

1. Add any new state to `getInitialState()` in `state.js`
2. Add rendering logic in `render.js`
3. Add event handlers in `events.js`
4. If it needs a modal, add to `modals.js`

## Original Prototype

The original single-file prototype is preserved at `remixed-253b7902.html` for reference.
