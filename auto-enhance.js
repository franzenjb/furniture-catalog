// Auto-enhancement system for furniture catalog
// Suggests prices based on furniture type and helps with images

// Price patterns based on common furniture types
const PRICE_PATTERNS = {
    // Seating
    'sofa': { min: 599, max: 2999, typical: 1299 },
    'couch': { min: 599, max: 2999, typical: 1299 },
    'sectional': { min: 999, max: 4999, typical: 2499 },
    'loveseat': { min: 399, max: 1999, typical: 899 },
    'chair': { min: 199, max: 999, typical: 399 },
    'recliner': { min: 399, max: 1999, typical: 799 },
    'ottoman': { min: 99, max: 599, typical: 299 },
    'bench': { min: 149, max: 799, typical: 349 },
    
    // Tables
    'dining table': { min: 599, max: 3999, typical: 1499 },
    'coffee table': { min: 199, max: 1499, typical: 599 },
    'end table': { min: 99, max: 599, typical: 249 },
    'side table': { min: 99, max: 599, typical: 249 },
    'console': { min: 299, max: 1499, typical: 699 },
    'desk': { min: 299, max: 1999, typical: 699 },
    'nightstand': { min: 149, max: 799, typical: 349 },
    'buffet': { min: 599, max: 2499, typical: 1199 },
    
    // Storage
    'dresser': { min: 399, max: 2499, typical: 999 },
    'chest': { min: 399, max: 1999, typical: 799 },
    'wardrobe': { min: 599, max: 2999, typical: 1499 },
    'bookshelf': { min: 149, max: 999, typical: 399 },
    'bookcase': { min: 149, max: 999, typical: 399 },
    'cabinet': { min: 299, max: 1999, typical: 799 },
    'hutch': { min: 699, max: 2999, typical: 1499 },
    
    // Bedroom
    'bed': { min: 599, max: 3999, typical: 1599 },
    'king bed': { min: 999, max: 4999, typical: 1999 },
    'queen bed': { min: 699, max: 3499, typical: 1499 },
    'mattress': { min: 399, max: 2999, typical: 999 },
    'headboard': { min: 199, max: 1499, typical: 599 },
    
    // Lighting
    'lamp': { min: 49, max: 499, typical: 149 },
    'floor lamp': { min: 99, max: 699, typical: 249 },
    'table lamp': { min: 49, max: 399, typical: 149 },
    'chandelier': { min: 299, max: 2999, typical: 899 },
    'pendant': { min: 99, max: 999, typical: 349 },
    
    // Decor
    'mirror': { min: 99, max: 799, typical: 299 },
    'rug': { min: 199, max: 1999, typical: 599 },
    'curtains': { min: 49, max: 499, typical: 149 },
    'artwork': { min: 99, max: 999, typical: 299 },
    'vase': { min: 29, max: 299, typical: 79 },
    
    // Office
    'office chair': { min: 199, max: 1499, typical: 499 },
    'filing cabinet': { min: 149, max: 799, typical: 349 },
    'standing desk': { min: 399, max: 1999, typical: 899 },
    
    // Outdoor
    'patio': { min: 299, max: 1999, typical: 799 },
    'outdoor': { min: 199, max: 1499, typical: 599 },
    'umbrella': { min: 99, max: 699, typical: 299 },
    'fire pit': { min: 199, max: 1499, typical: 599 }
};

// Store-specific price adjustments
const STORE_MULTIPLIERS = {
    // Luxury stores
    'restorationhardware.com': 2.5,
    'rh.com': 2.5,
    'westelm.com': 1.8,
    'potterybarn.com': 1.8,
    'crateandbarrel.com': 1.6,
    'cb2.com': 1.5,
    'dwr.com': 2.0, // Design Within Reach
    'article.com': 1.4,
    
    // Mid-range stores
    'wayfair.com': 1.0,
    'overstock.com': 0.9,
    'homedepot.com': 0.9,
    'lowes.com': 0.9,
    'target.com': 0.8,
    'costco.com': 0.9,
    'ashleyfurniture.com': 1.1,
    'raymour-flanigan.com': 1.2,
    
    // Budget stores
    'ikea.com': 0.7,
    'amazon.com': 0.8,
    'walmart.com': 0.6,
    'biglots.com': 0.6,
    
    // Specialty stores
    'etsy.com': 1.3, // Handmade premium
    'facebook.com': 0.5, // Marketplace deals
    'craigslist.org': 0.4, // Used items
    'nextdoor.com': 0.5 // Local deals
};

// Suggest price based on title and store
function suggestPrice(title, url) {
    if (!title) return null;
    
    const lowerTitle = title.toLowerCase();
    let basePrice = null;
    let matchedPattern = null;
    
    // Find matching furniture type
    for (const [pattern, prices] of Object.entries(PRICE_PATTERNS)) {
        if (lowerTitle.includes(pattern)) {
            basePrice = prices.typical;
            matchedPattern = pattern;
            break;
        }
    }
    
    // If no match, try partial matches
    if (!basePrice) {
        const words = lowerTitle.split(/\s+/);
        for (const word of words) {
            for (const [pattern, prices] of Object.entries(PRICE_PATTERNS)) {
                if (pattern.includes(word) || word.includes(pattern)) {
                    basePrice = prices.typical;
                    matchedPattern = pattern;
                    break;
                }
            }
            if (basePrice) break;
        }
    }
    
    // Apply store multiplier if we have a base price
    if (basePrice && url) {
        try {
            const hostname = new URL(url).hostname.replace('www.', '');
            const multiplier = STORE_MULTIPLIERS[hostname] || 1.0;
            basePrice = Math.round(basePrice * multiplier);
        } catch (e) {
            // Invalid URL, use base price
        }
    }
    
    return basePrice ? `$${basePrice.toLocaleString()}` : null;
}

// Apply smart prices to all items without prices
function applySmartPrices() {
    const stored = localStorage.getItem('furnitureItems');
    if (!stored) return;
    
    let items = JSON.parse(stored);
    let updated = 0;
    
    items = items.map(item => {
        if (!item.price || item.price === '') {
            const suggestedPrice = suggestPrice(item.title, item.url);
            if (suggestedPrice) {
                item.price = suggestedPrice;
                item.price_auto_suggested = true;
                updated++;
            }
        }
        return item;
    });
    
    if (updated > 0) {
        localStorage.setItem('furnitureItems', JSON.stringify(items));
        return { success: true, updated, message: `Applied smart prices to ${updated} items` };
    }
    
    return { success: false, message: 'No items needed price suggestions' };
}

// Get image URL suggestions based on store and item
function getImageUrlPattern(url, title) {
    if (!url) return null;
    
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        const lowerTitle = title ? title.toLowerCase() : '';
        
        // Store-specific image URL patterns
        const patterns = {
            'ikea.com': {
                hint: 'Right-click product image → Copy Image Address',
                example: 'https://www.ikea.com/us/en/images/products/*.jpg'
            },
            'wayfair.com': {
                hint: 'Right-click main product image → Copy Image Address',
                example: 'https://secure.img1-fg.wfcdn.com/im/*/image.jpg'
            },
            'target.com': {
                hint: 'Right-click product image → Copy Image Address',
                example: 'https://target.scene7.com/is/image/Target/*'
            },
            'westelm.com': {
                hint: 'Right-click hero image → Copy Image Address',
                example: 'https://assets.weimgs.com/weimgs/rk/images/*'
            },
            'crateandbarrel.com': {
                hint: 'Right-click product image → Copy Image Address',
                example: 'https://cb.scene7.com/is/image/Crate/*'
            },
            'potterybarn.com': {
                hint: 'Right-click main image → Copy Image Address',
                example: 'https://assets.pbimgs.com/pbimgs/rk/images/*'
            },
            'amazon.com': {
                hint: 'Click main image to zoom, then right-click → Copy Image Address',
                example: 'https://m.media-amazon.com/images/I/*.jpg'
            },
            'homedepot.com': {
                hint: 'Right-click product image → Copy Image Address',
                example: 'https://images.thdstatic.com/productImages/*'
            },
            'overstock.com': {
                hint: 'Right-click main product photo → Copy Image Address',
                example: 'https://ak1.ostkcdn.com/images/products/*'
            }
        };
        
        return patterns[hostname] || {
            hint: 'Right-click the main product image → Copy Image Address',
            example: 'Direct image URL ending in .jpg, .png, or .webp'
        };
    } catch (e) {
        return null;
    }
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { suggestPrice, applySmartPrices, getImageUrlPattern };
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.FurnitureEnhancer = { suggestPrice, applySmartPrices, getImageUrlPattern };
}