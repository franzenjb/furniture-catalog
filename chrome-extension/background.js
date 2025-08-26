// Background service worker for the extension

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Furniture Price & Image Extractor installed');
});

// Handle messages between components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getFurnitureData') {
    chrome.storage.local.get(['lastExtractedFurniture'], (result) => {
      sendResponse(result.lastExtractedFurniture);
    });
    return true;
  }
});