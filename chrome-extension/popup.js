// Popup script for the furniture extractor extension

let extractedData = null;

document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  const dataDiv = document.getElementById('extractedData');
  
  extractBtn.addEventListener('click', extractData);
  saveBtn.addEventListener('click', saveData);
  
  // Check if we're on a supported furniture site
  checkCurrentSite();
});

async function checkCurrentSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const statusDiv = document.getElementById('status');
  
  const supportedSites = [
    'ikea.com', 'wayfair.com', 'westelm.com', 'crateandbarrel.com',
    'potterybarn.com', 'restorationhardware.com', 'article.com', 'cb2.com',
    'homedepot.com', 'lowes.com', 'target.com', 'costco.com',
    'ashleyfurniture.com', 'walmart.com', 'amazon.com', 'overstock.com'
  ];
  
  const hostname = new URL(tab.url).hostname.replace('www.', '');
  
  if (supportedSites.includes(hostname)) {
    statusDiv.innerHTML = `
      <div class="status">
        ✅ Detected: <strong>${hostname}</strong><br>
        Ready to extract furniture data!
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div class="status">
        ⚠️ Unknown site: <strong>${hostname}</strong><br>
        Will try generic extraction (may not work perfectly)
      </div>
    `;
  }
}

async function extractData() {
  const extractBtn = document.getElementById('extractBtn');
  const statusDiv = document.getElementById('status');
  const dataDiv = document.getElementById('extractedData');
  const saveBtn = document.getElementById('saveBtn');
  
  // Show loading state
  extractBtn.disabled = true;
  extractBtn.textContent = 'Extracting...';
  statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Extracting data from page...</div>';
  
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extract' });
    
    if (response) {
      extractedData = response;
      
      // Display the extracted data
      let dataHtml = '<div class="extracted-data">';
      
      if (response.title) {
        dataHtml += `
          <div class="data-field">
            <label>Product Title</label>
            <div class="value">${response.title}</div>
          </div>
        `;
      }
      
      if (response.price) {
        dataHtml += `
          <div class="data-field">
            <label>Actual Price</label>
            <div class="value price-value">${response.price}</div>
          </div>
        `;
      } else {
        dataHtml += `
          <div class="data-field">
            <label>Price</label>
            <div class="value">No price found on page</div>
          </div>
        `;
      }
      
      if (response.image_url) {
        dataHtml += `
          <div class="data-field">
            <label>Product Image</label>
            <img src="${response.image_url}" class="image-preview" alt="Product">
          </div>
        `;
      } else {
        dataHtml += `
          <div class="data-field">
            <label>Image</label>
            <div class="value">No product image found</div>
          </div>
        `;
      }
      
      if (response.store) {
        dataHtml += `
          <div class="data-field">
            <label>Store</label>
            <div class="value">${response.store}</div>
          </div>
        `;
      }
      
      dataHtml += '</div>';
      
      dataDiv.innerHTML = dataHtml;
      statusDiv.innerHTML = '<div class="success">✅ Data extracted successfully!</div>';
      
      // Show save button if we got useful data
      if (response.price || response.image_url) {
        saveBtn.style.display = 'block';
      }
    } else {
      throw new Error('No response from page');
    }
  } catch (error) {
    console.error('Extraction error:', error);
    statusDiv.innerHTML = `
      <div class="error">
        ❌ Extraction failed: ${error.message}<br>
        Make sure you're on a product page.
      </div>
    `;
    dataDiv.innerHTML = '';
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = 'Extract Price & Image';
  }
}

async function saveData() {
  if (!extractedData) return;
  
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');
  
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';
  
  try {
    // Store in chrome.storage to share with the catalog app
    await chrome.storage.local.set({
      lastExtractedFurniture: extractedData,
      extractedAt: new Date().toISOString()
    });
    
    statusDiv.innerHTML = `
      <div class="success">
        ✅ Data saved!<br>
        Open your <a href="https://franzenjb.github.io/furniture-catalog/" target="_blank" style="color: white; text-decoration: underline;">Furniture Catalog</a> to see it.
      </div>
    `;
    
    saveBtn.textContent = 'Saved!';
    
    // Also try to send to the catalog if it's open
    chrome.tabs.query({}, function(tabs) {
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes('furniture-catalog')) {
          chrome.tabs.sendMessage(tab.id, {
            action: 'updateFurniture',
            data: extractedData
          });
        }
      });
    });
    
  } catch (error) {
    console.error('Save error:', error);
    statusDiv.innerHTML = `<div class="error">❌ Failed to save: ${error.message}</div>`;
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save to Catalog';
  }
}