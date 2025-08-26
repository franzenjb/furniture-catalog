# Furniture Price & Image Extractor Chrome Extension

This Chrome extension extracts **actual prices and product images** directly from furniture websites, solving the CORS limitation that prevents the web app from accessing this data.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `chrome-extension` folder from this repository
5. The extension icon (🛋️) will appear in your toolbar

## How to Use

1. **Navigate to any furniture product page** on sites like:
   - IKEA
   - Wayfair
   - West Elm
   - Crate & Barrel
   - Pottery Barn
   - Restoration Hardware
   - Target
   - Amazon
   - And many more...

2. **Click the extension icon** in your Chrome toolbar

3. **Click "Extract Price & Image"**
   - The extension will automatically find and extract:
     - The actual product price
     - The main product image
     - The product title
     - The store name

4. **Click "Save to Catalog"** to store the data

5. **Open your Furniture Catalog** to see the extracted data with real prices and images!

## Features

- ✅ Extracts ACTUAL prices (not suggestions)
- ✅ Extracts ACTUAL product images (not generic icons)
- ✅ Works on all major furniture websites
- ✅ Bypasses CORS restrictions
- ✅ One-click extraction
- ✅ Automatic store detection

## Supported Websites

The extension has specific extractors for:
- IKEA
- Wayfair
- West Elm
- Crate & Barrel
- Pottery Barn
- Restoration Hardware
- Article
- CB2
- Home Depot
- Lowe's
- Target
- Costco
- Ashley Furniture
- Walmart
- Amazon
- Overstock

For other furniture sites, it uses intelligent generic extraction that looks for common price and image patterns.

## How It Works

The extension runs directly on the furniture website pages, so it can access all the content without CORS restrictions. It:

1. Identifies the store from the URL
2. Uses store-specific selectors to find prices and images
3. Falls back to generic extraction for unknown sites
4. Sends the data to your Furniture Catalog app

This solves the problem where the web app couldn't fetch data from other websites due to browser security!