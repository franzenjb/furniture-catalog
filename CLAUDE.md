# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Furniture Catalog - A visual bookmark management system specifically designed for tracking furniture items from Chrome bookmarks. The application has dual deployment modes: static (GitHub Pages) and server (Express + SQLite).

## Key Commands

```bash
# Installation
npm install              # Install dependencies for server version

# Development
npm start                # Start Express server on http://localhost:3000 (server version)
# For static version, open index.html directly or use a local HTTP server

# GitHub Deployment
git add -A
git commit -m "commit message"
git push                 # ALWAYS push immediately after commits to keep GitHub Pages current
```

## Architecture

### Dual-Mode System

1. **Static Version (Primary - GitHub Pages)**
   - Entry: `index.html`
   - Logic: `app-static.js`
   - Data: localStorage (`furnitureItems` and `furnitureRooms` keys)
   - Deployment: https://franzenjb.github.io/furniture-catalog/

2. **Server Version (Development/Full-featured)**
   - Entry: `server.js` (Express)
   - Database: SQLite (`furniture.db`)
   - API: RESTful endpoints for CRUD operations
   - Frontend: `public/` directory

### Core Components

#### Pages & Their Purpose
- `index.html` - Main catalog with grid/list views
- `budget.html` / `budget-app.js` - Table view with inline editing, room-based budgeting
- `rooms.html` - Room management (create, edit, delete rooms)
- `quick-setup.html` - Bulk price/image entry interface
- `chrome-extension/` - Chrome extension to extract actual prices/images from furniture websites

#### Data Model
```javascript
{
  id: string,
  title: string,
  url: string (unique for deduplication),
  price: string ("$X,XXX"),
  quantity: number,
  room: string,
  room_number: number,
  image_url: string,
  store: string (extracted from URL),
  category: string,
  bookmark_folder: string,
  notes: string,
  favorite: boolean,
  date_added: ISO string,
  date_modified: ISO string
}
```

#### Room Storage
Rooms are stored separately in `furnitureRooms` localStorage key:
```javascript
{
  name: string,
  number: number
}
```

### Critical Business Logic

#### Bookmark Import Rules
- **MUST** only import from "9 - Bayview Furnishings" folder
- **MUST** prevent duplicates by comparing URLs (case-insensitive)
- Import logic in `app-static.js` → `handleFileImport()`
- Shows summary: "✅ Imported X new items | ⏭️ Skipped Y duplicates"

#### Chrome Extension Integration
- Extension bypasses CORS to extract actual prices/images
- Communicates with catalog via chrome.storage API
- Store-specific extractors for major furniture sites (IKEA, Wayfair, etc.)

## User Requirements

1. **GitHub Pages Synchronization** - ALWAYS commit and push immediately after changes
2. **No Duplicate Entries** - Critical for bookmark re-imports
3. **Room Persistence** - Rooms save independently and persist even when empty
4. **Manual Data Entry Required** - CORS prevents automatic price/image fetching in web app (use Chrome extension instead)
5. **No Example/Demo Data** - Only user's actual bookmarks and entries

## GitHub Pages Deployment

Live URL: https://franzenjb.github.io/furniture-catalog/

Updates deploy automatically within 2-3 minutes of push.

## Chrome Extension Installation

1. Navigate to `chrome://extensions/`
2. Enable Developer mode
3. Load unpacked → select `chrome-extension/` folder
4. Use on furniture sites to extract actual prices/images

## Price Enhancement System

The `auto-enhance.js` file contains an intelligent price suggestion engine with patterns for 50+ furniture types:
- Analyzes item titles to identify furniture type
- Provides min/max/typical price ranges
- Example: "sofa" → { min: $599, max: $2999, typical: $1299 }
- Falls back to store-specific defaults when type is unrecognized

## Development Notes

### Visual Features
- Price overlays render as green badges on furniture images (bottom-right corner)
- Quantity badges show as "×2", "×3" when multiple items
- Favorite stars turn gold when active
- Store domain automatically extracted and displayed

### Data Synchronization
- All pages read/write to same localStorage keys
- Changes reflect immediately across tabs via storage events
- CSV export creates timestamped files with complete item data

### Static Version Serving
```bash
python3 -m http.server 8000  # Recommended for local development
# Access at: http://localhost:8000
```

### Common Issues & Solutions

1. **Images Not Displaying**: CORS blocks external URLs
   - Solution: Use Chrome extension OR manually copy image URLs

2. **Duplicate Items After Import**: 
   - Ensure folder name exactly matches "9 - Bayview Furnishings"
   - Deduplication only works within same import session

3. **Price Suggestions Not Working**:
   - Check item titles contain furniture keywords
   - Reference `auto-enhance.js` PRICE_PATTERNS object