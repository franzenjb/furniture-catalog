// Content script that extracts actual prices and images from furniture websites
// This runs directly on the furniture website pages

// Store-specific extractors for actual prices and images
const EXTRACTORS = {
  'ikea.com': {
    price: () => {
      // Multiple selectors for different IKEA page layouts
      const selectors = [
        '.pip-price__sr-text',
        '.pip-price-module__price',
        '.range-revamp-price__integer',
        '.price__value',
        '[data-price]',
        '.product-pip__price-value'
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el.textContent.trim();
      }
      return null;
    },
    image: () => {
      const selectors = [
        '.pip-media-grid__media-container img',
        '.range-revamp-media-grid__media-container img',
        '.product-pip__image img',
        '.pip-product-carousel__image img'
      ];
      for (const selector of selectors) {
        const img = document.querySelector(selector);
        if (img && img.src) return img.src;
      }
      return null;
    }
  },
  
  'wayfair.com': {
    price: () => {
      const selectors = [
        '[data-enzyme-id="PriceBlock"] .SFPrice',
        '.ProductDetailsPriceBlock .SFPrice',
        '[data-testid="product-price"]',
        '.pl-Price-V2'
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el.textContent.trim();
      }
      return null;
    },
    image: () => {
      const img = document.querySelector('[data-enzyme-id="carousel-image"] img, .ProductDetailImageCarousel img');
      return img ? img.src : null;
    }
  },
  
  'westelm.com': {
    price: () => {
      const el = document.querySelector('.product-price .price-amount, .price-state .price-amount');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.hero-image img, .pip-summary-hero-image img');
      return img ? img.src : null;
    }
  },
  
  'crateandbarrel.com': {
    price: () => {
      const el = document.querySelector('.product-pricing .regPrice, .product-pricing .salePrice');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.hero-image-container img, .product-image img');
      return img ? img.src : null;
    }
  },
  
  'potterybarn.com': {
    price: () => {
      const el = document.querySelector('.product-price .price-amount, .price-state .price-amount');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.hero-image img, .pip-summary-hero-image img');
      return img ? img.src : null;
    }
  },
  
  'restorationhardware.com': {
    price: () => {
      const el = document.querySelector('.product-price-wrapper .price, .product-pricing');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.product-image-main img, .pdp-hero-image img');
      return img ? img.src : null;
    }
  },
  
  'article.com': {
    price: () => {
      const el = document.querySelector('[data-testid="product-price"], .product-price');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.product-hero-image img, [data-testid="product-image"] img');
      return img ? img.src : null;
    }
  },
  
  'cb2.com': {
    price: () => {
      const el = document.querySelector('.product-pricing .price');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.hero-image img, .product-image img');
      return img ? img.src : null;
    }
  },
  
  'homedepot.com': {
    price: () => {
      const el = document.querySelector('.price-format__main-price, [data-testid="product-price"]');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.mediagallery__mainimage img, [data-testid="product-image"] img');
      return img ? img.src : null;
    }
  },
  
  'lowes.com': {
    price: () => {
      const el = document.querySelector('[data-testid="item-price"], .main-price');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('[data-testid="image-carousel-container"] img, .main-image img');
      return img ? img.src : null;
    }
  },
  
  'target.com': {
    price: () => {
      const el = document.querySelector('[data-test="product-price"], .style__PriceFontSize-sc-17wlxvr-0');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('[data-test="product-image"] img, .slideDeckPicture img');
      return img ? img.src : null;
    }
  },
  
  'costco.com': {
    price: () => {
      const el = document.querySelector('.price [automation-id="productPriceOutput"], .your-price .value');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('#productImageContainer img, .product-image-main img');
      return img ? img.src : null;
    }
  },
  
  'ashleyfurniture.com': {
    price: () => {
      const el = document.querySelector('.price-block .price, .product-price');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.main-product-image img, .product-image-main img');
      return img ? img.src : null;
    }
  },
  
  'walmart.com': {
    price: () => {
      const el = document.querySelector('[itemprop="price"], .price-now, span[data-automation-id="product-price"]');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.hover-zoom-hero-image img, [data-testid="hero-image"] img');
      return img ? img.src : null;
    }
  },
  
  'amazon.com': {
    price: () => {
      const selectors = [
        '.a-price-whole',
        '.a-price.a-text-price.a-size-medium',
        '.a-price-range',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-price.reinventPricePriceToPayMargin'
      ];
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) return el.textContent.trim();
      }
      return null;
    },
    image: () => {
      const img = document.querySelector('#landingImage, #imgBlkFront, .a-dynamic-image');
      return img ? img.src : null;
    }
  },
  
  'overstock.com': {
    price: () => {
      const el = document.querySelector('.monetary-price-value, .price-block .price');
      return el ? el.textContent.trim() : null;
    },
    image: () => {
      const img = document.querySelector('.main-image img, .product-image img');
      return img ? img.src : null;
    }
  }
};

// Generic fallback extractor for unknown sites
const GENERIC_EXTRACTOR = {
  price: () => {
    // Common price patterns and meta tags
    const metaPrice = document.querySelector('meta[property="product:price:amount"], meta[name="twitter:data1"]');
    if (metaPrice) return metaPrice.content;
    
    // Look for common price classes
    const priceSelectors = [
      '.price',
      '.product-price',
      '[class*="price"]',
      '[data-price]',
      '[itemprop="price"]',
      '.cost',
      '.amount'
    ];
    
    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.match(/\$[\d,]+/)) {
        return el.textContent.trim();
      }
    }
    return null;
  },
  image: () => {
    // Try Open Graph image first
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) return ogImage.content;
    
    // Look for product images
    const imageSelectors = [
      '.product-image img',
      '.product-photo img',
      '[class*="product"] img',
      '.main-image img',
      '.hero-image img',
      'main img'
    ];
    
    for (const selector of imageSelectors) {
      const img = document.querySelector(selector);
      if (img && img.src && !img.src.includes('placeholder')) {
        return img.src;
      }
    }
    return null;
  }
};

// Extract data from the current page
function extractFurnitureData() {
  const hostname = window.location.hostname.replace('www.', '');
  const extractor = EXTRACTORS[hostname] || GENERIC_EXTRACTOR;
  
  const title = document.title;
  const url = window.location.href;
  const price = extractor.price();
  const imageUrl = extractor.image();
  
  // Clean up price format
  let cleanPrice = price;
  if (price) {
    // Extract just the dollar amount
    const match = price.match(/\$[\d,]+\.?\d*/);
    if (match) {
      cleanPrice = match[0];
    }
  }
  
  return {
    title,
    url,
    price: cleanPrice,
    image_url: imageUrl,
    store: hostname,
    extracted_at: new Date().toISOString()
  };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const data = extractFurnitureData();
    sendResponse(data);
  }
  return true;
});