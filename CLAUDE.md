# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Furniture Catalog - A visual bookmark management system specifically designed for tracking furniture items from the "9 - Bayview Furnishings" Chrome bookmarks folder. The application has both server and static (GitHub Pages) versions.

## Key Commands

```bash
# Development (with backend)
npm install              # Install dependencies
npm start                # Start Express server on http://localhost:3000

# GitHub deployment
git add -A
git commit -m "commit message"
git push                 # ALWAYS push immediately after commits to keep GitHub Pages current
```

## Architecture

### Dual Architecture System

1. **Static Version (GitHub Pages)** - Primary deployment
   - `index.html` - Main catalog page
   - `app-static.js` - Client-side logic using localStorage
   - `budget.html` + `budget-app.js` - Budget dashboard
   - `quick-setup.html` - Bulk price/image entry interface
   - `rooms.html` - Room management (create, edit, delete rooms)
   - Data persistence: localStorage (`furnitureItems` key)

2. **Server Version (Development)** - Full-featured with SQLite
   - `server.js` - Express API server
   - `public/` directory - Server-side static files
   - Database: SQLite (`furniture.db`)
   - Includes image fetching attempts (limited by CORS)

### Critical Business Logic

#### Bookmark Import Deduplication
The app MUST only import from "9 - Bayview Furnishings" folder and prevent duplicates:
- Located in `app-static.js` handleFileImport()
- Compares URLs (case-insensitive) to detect duplicates
- Shows summary: "✅ Imported X new items | ⏭️ Skipped Y duplicates"
- Console logs duplicate URLs for debugging

#### Data Model
Each furniture item contains:
```javascript
{
  id: unique string,
  title: string,
  url: string (unique identifier for deduplication),
  price: string (format: "$X,XXX"),
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

## User's Special Requirements

1. **ALWAYS commit and push to GitHub immediately** - User wants GitHub Pages to stay current
2. **Duplicate prevention is critical** - User continuously adds bookmarks and re-imports
3. **9 - Bayview Furnishings folder only** - Ignore all other bookmark folders
4. **Manual image URLs required** - Browser CORS prevents automatic image fetching

## Key Features to Maintain

- Price overlays on furniture images (green badges)
- Quantity badges (×2, ×3) when multiple items
- Table view in budget dashboard with inline editing
- Room number assignments for organization
- CSV export functionality
- Quick Setup page for bulk editing
- Room management page for editing/deleting rooms

## GitHub Pages URL

Live site: https://franzenjb.github.io/furniture-catalog/

Updates deploy automatically within 2-3 minutes of push.