// Local Storage based Furniture Catalog App
class FurnitureCatalog {
    constructor() {
        this.currentView = 'grid';
        this.furnitureItems = [];
        this.loadFromStorage();
        this.setupEventListeners();
        this.loadFurniture();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('furnitureItems');
        if (stored) {
            this.furnitureItems = JSON.parse(stored);
        }
    }

    saveToStorage() {
        localStorage.setItem('furnitureItems', JSON.stringify(this.furnitureItems));
    }

    setupEventListeners() {
        document.getElementById('addItemBtn').addEventListener('click', () => this.openModal());
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('furnitureForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.querySelector('.close-detail').addEventListener('click', () => this.closeDetailModal());
        
        document.getElementById('searchInput').addEventListener('input', () => this.loadFurniture());
        document.getElementById('categoryFilter').addEventListener('change', () => this.loadFurniture());
        document.getElementById('favoritesOnly').addEventListener('change', () => this.loadFurniture());
        
        document.getElementById('gridViewBtn').addEventListener('click', () => this.setView('grid'));
        document.getElementById('listViewBtn').addEventListener('click', () => this.setView('list'));
        
        window.addEventListener('click', (e) => {
            if (e.target.className === 'modal') {
                this.closeModal();
                this.closeDetailModal();
            }
        });
        
        // Listen for messages from the Chrome extension
        window.addEventListener('message', (event) => {
            if (event.data && event.data.action === 'updateFurniture') {
                this.handleExtensionData(event.data.data);
            }
        });
        
        // Check for extension data on page load
        this.checkForExtensionData();
    }

    setView(view) {
        this.currentView = view;
        document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
        this.renderFurniture();
    }

    loadFurniture() {
        const search = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const favoriteOnly = document.getElementById('favoritesOnly').checked;
        
        let filtered = [...this.furnitureItems];
        
        if (search) {
            filtered = filtered.filter(item => 
                item.title.toLowerCase().includes(search) ||
                (item.notes && item.notes.toLowerCase().includes(search)) ||
                (item.store && item.store.toLowerCase().includes(search))
            );
        }
        
        if (category) {
            filtered = filtered.filter(item => item.category === category);
        }
        
        if (favoriteOnly) {
            filtered = filtered.filter(item => item.favorite);
        }
        
        this.renderFurniture(filtered);
        this.updateCategories();
    }

    updateCategories() {
        const categories = [...new Set(this.furnitureItems.map(item => item.category).filter(c => c))];
        const categoryFilter = document.getElementById('categoryFilter');
        const categoryList = document.getElementById('categoryList');
        
        const currentValue = categoryFilter.value;
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categoryList.innerHTML = '';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === currentValue) option.selected = true;
            categoryFilter.appendChild(option);
            
            const listOption = document.createElement('option');
            listOption.value = category;
            categoryList.appendChild(listOption);
        });
    }

    renderFurniture(items = null) {
        const displayItems = items || this.furnitureItems;
        const grid = document.getElementById('furnitureGrid');
        
        if (displayItems.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <h3>No furniture items yet</h3>
                    <p>Add items manually or import your bookmarks to get started!</p>
                </div>
            `;
            return;
        }
        
        grid.className = this.currentView === 'list' ? 'furniture-grid list-view' : 'furniture-grid';
        
        grid.innerHTML = displayItems.map(item => {
            // Create image container with price overlay
            const imageHtml = item.image_url 
                ? `<div class="card-image-container">
                       <img src="${item.image_url}" alt="${item.title}" class="card-image" 
                            onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'card-no-image\\'>🪑</div>${item.price ? `<span class=\\'price-overlay\\'>${this.escapeHtml(item.price)}</span>` : ''}'">
                       ${item.price ? `<span class="price-overlay">${this.escapeHtml(item.price)}</span>` : ''}
                       ${item.quantity > 1 ? `<span class="quantity-badge">×${item.quantity}</span>` : ''}
                   </div>`
                : `<div class="card-image-container">
                       <div class="card-no-image">🪑</div>
                       ${item.price ? `<span class="price-overlay">${this.escapeHtml(item.price)}</span>` : '<span class="price-overlay no-price">No price</span>'}
                       ${item.quantity > 1 ? `<span class="quantity-badge">×${item.quantity}</span>` : ''}
                   </div>`;
            
            return `
                <div class="furniture-card ${this.currentView === 'list' ? 'list-view' : ''}" onclick="catalog.showDetail('${item.id}')">
                    ${imageHtml}
                    <div class="card-content">
                        <div class="card-header">
                            <h3 class="card-title">${this.escapeHtml(item.title)}</h3>
                            <button class="favorite-btn ${item.favorite ? 'active' : ''}" 
                                    onclick="event.stopPropagation(); catalog.toggleFavorite('${item.id}')">
                                ${item.favorite ? '❤️' : '🤍'}
                            </button>
                        </div>
                        <div class="card-meta">
                            ${item.store ? `<span class="card-store">${this.escapeHtml(item.store)}</span>` : ''}
                            ${item.category ? `<span class="card-category">${this.escapeHtml(item.category)}</span>` : ''}
                            ${item.room ? `<span class="card-category" style="background: rgba(255, 107, 107, 0.1); color: #ff6b6b;">📍 ${this.escapeHtml(item.room)}</span>` : ''}
                        </div>
                        ${item.notes ? `<p class="card-notes">${this.escapeHtml(item.notes)}</p>` : ''}
                        <div class="card-actions">
                            <button class="card-btn edit-btn" onclick="event.stopPropagation(); catalog.editItem('${item.id}')">Edit</button>
                            <button class="card-btn delete-btn" onclick="event.stopPropagation(); catalog.deleteItem('${item.id}')">Delete</button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    showDetail(id) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (!item) return;
        
        const detailContent = document.getElementById('detailContent');
        detailContent.innerHTML = `
            <div class="detail-content">
                <div>
                    ${item.image_url 
                        ? `<img src="${item.image_url}" alt="${item.title}" class="detail-image" onerror="this.onerror=null; this.outerHTML='<div class=\\'card-no-image\\'>🪑</div>'">`
                        : '<div class="card-no-image">🪑</div>'
                    }
                </div>
                <div class="detail-info">
                    <h2>${this.escapeHtml(item.title)}</h2>
                    <div class="detail-meta">
                        ${item.price ? `<p><strong>Price:</strong> ${this.escapeHtml(item.price)}</p>` : ''}
                        ${item.store ? `<p><strong>Store:</strong> ${this.escapeHtml(item.store)}</p>` : ''}
                        ${item.category ? `<p><strong>Category:</strong> ${this.escapeHtml(item.category)}</p>` : ''}
                        ${item.quantity ? `<p><strong>Quantity:</strong> ${item.quantity}</p>` : ''}
                        ${item.room ? `<p><strong>Room:</strong> ${this.escapeHtml(item.room)}</p>` : ''}
                        <p><strong>Added:</strong> ${new Date(item.date_added).toLocaleDateString()}</p>
                    </div>
                    ${item.notes ? `
                        <div class="detail-notes">
                            <h4>Notes</h4>
                            <p>${this.escapeHtml(item.notes)}</p>
                        </div>
                    ` : ''}
                    <div class="detail-actions">
                        <a href="${item.url}" target="_blank" class="btn btn-primary">Visit Website</a>
                        <button class="btn btn-secondary" onclick="catalog.editItem('${item.id}')">Edit</button>
                        <button class="btn delete-btn" onclick="catalog.deleteItem('${item.id}')">Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('detailModal').classList.add('show');
    }

    closeDetailModal() {
        document.getElementById('detailModal').classList.remove('show');
    }

    openModal(item = null) {
        const modal = document.getElementById('modal');
        const form = document.getElementById('furnitureForm');
        const modalTitle = document.getElementById('modalTitle');
        
        form.reset();
        
        // Populate room dropdown
        this.populateRoomDropdown();
        
        if (item) {
            modalTitle.textContent = 'Edit Item';
            document.getElementById('itemId').value = item.id;
            document.getElementById('title').value = item.title;
            document.getElementById('url').value = item.url;
            document.getElementById('price').value = item.price || '';
            document.getElementById('store').value = item.store || '';
            document.getElementById('category').value = item.category || '';
            document.getElementById('room').value = item.room || '';
            document.getElementById('image_url').value = item.image_url || '';
            document.getElementById('notes').value = item.notes || '';
        } else {
            modalTitle.textContent = 'Add New Item';
            document.getElementById('itemId').value = '';
        }
        
        modal.classList.add('show');
    }
    
    populateRoomDropdown() {
        const roomSelect = document.getElementById('room');
        
        // Load saved rooms from localStorage
        const savedRooms = localStorage.getItem('furnitureRooms');
        const roomsData = savedRooms ? JSON.parse(savedRooms) : [];
        
        // Clear existing options except the first one
        roomSelect.innerHTML = '<option value="">-- Select Room --</option>';
        
        // Add saved rooms sorted by number
        roomsData.sort((a, b) => (a.number || 999) - (b.number || 999));
        roomsData.forEach(room => {
            const option = document.createElement('option');
            option.value = room.name;
            option.textContent = room.number ? `${room.number}. ${room.name}` : room.name;
            roomSelect.appendChild(option);
        });
        
        // Add any unique rooms from existing items not in saved rooms
        const existingRooms = [...new Set(this.furnitureItems.map(i => i.room).filter(r => r))];
        existingRooms.forEach(room => {
            if (!roomsData.find(r => r.name === room)) {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = room;
                roomSelect.appendChild(option);
            }
        });
    }

    closeModal() {
        document.getElementById('modal').classList.remove('show');
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        const itemId = document.getElementById('itemId').value;
        const formData = {
            id: itemId || this.generateId(),
            title: document.getElementById('title').value,
            url: document.getElementById('url').value,
            price: document.getElementById('price').value,
            store: document.getElementById('store').value,
            category: document.getElementById('category').value,
            room: document.getElementById('room').value,
            image_url: document.getElementById('image_url').value,
            notes: document.getElementById('notes').value,
            date_added: itemId ? 
                this.furnitureItems.find(i => i.id === itemId).date_added : 
                new Date().toISOString(),
            date_modified: new Date().toISOString(),
            quantity: 1,
            favorite: itemId ? this.furnitureItems.find(i => i.id === itemId).favorite : false
        };
        
        // Try to auto-detect image if not provided
        if (!formData.image_url && formData.url) {
            formData.image_url = await this.tryDetectImage(formData.url);
        }
        
        // Extract store from URL if not provided
        if (!formData.store && formData.url) {
            try {
                const urlObj = new URL(formData.url);
                formData.store = urlObj.hostname.replace('www.', '');
            } catch (e) {
                console.error('Invalid URL');
            }
        }
        
        if (itemId) {
            // Update existing item
            const index = this.furnitureItems.findIndex(i => i.id === itemId);
            if (index !== -1) {
                this.furnitureItems[index] = {...this.furnitureItems[index], ...formData};
            }
        } else {
            // Add new item
            this.furnitureItems.push(formData);
        }
        
        this.saveToStorage();
        this.closeModal();
        this.showToast(itemId ? 'Item updated successfully' : 'Item added successfully', 'success');
        this.loadFurniture();
    }

    async tryDetectImage(url) {
        // In a static site, we can't fetch external URLs directly due to CORS
        // This would need a proxy or manual entry
        return '';
    }

    editItem(id) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            this.closeDetailModal();
            this.openModal(item);
        }
    }

    deleteItem(id) {
        if (!confirm('Are you sure you want to delete this item?')) return;
        
        this.furnitureItems = this.furnitureItems.filter(i => i.id !== id);
        this.saveToStorage();
        this.closeDetailModal();
        this.showToast('Item deleted successfully', 'success');
        this.loadFurniture();
    }

    toggleFavorite(id) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            item.favorite = !item.favorite;
            this.saveToStorage();
            this.loadFurniture();
        }
    }

    async handleFileImport(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        this.showToast('Analyzing bookmarks...', 'info');
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(event.target.result, 'text/html');
            
            const bookmarks = [];
            
            // Function to recursively parse bookmark structure
            const parseBookmarks = (element, currentFolder = '') => {
                const dts = element.querySelectorAll(':scope > dt');
                dts.forEach(dt => {
                    const h3 = dt.querySelector('h3');
                    if (h3) {
                        // This is a folder
                        const folderName = h3.textContent.trim();
                        const dl = dt.querySelector('dl');
                        if (dl) {
                            parseBookmarks(dl, folderName);
                        }
                    } else {
                        // This is a bookmark
                        const a = dt.querySelector('a');
                        if (a) {
                            const url = a.getAttribute('href');
                            const title = a.textContent.trim();
                            const icon = a.getAttribute('icon');
                            if (url && title && url.startsWith('http')) {
                                bookmarks.push({
                                    title,
                                    url,
                                    folder: currentFolder,
                                    icon: icon
                                });
                            }
                        }
                    }
                });
            };
            
            // Start parsing
            const mainDL = doc.querySelector('dl');
            if (mainDL) {
                parseBookmarks(mainDL);
            }
            
            // Filter for Bayview folder ONLY
            const targetFolder = '9 - Bayview Furnishings';
            const bayviewBookmarks = bookmarks.filter(b => 
                b.folder === targetFolder || b.folder.includes('Bayview')
            );
            
            // If no Bayview folder found, notify user
            if (bayviewBookmarks.length === 0 && bookmarks.length > 0) {
                this.showToast(`No "${targetFolder}" folder found. No items imported.`, 'error');
                return;
            }
            
            // Check for duplicates - compare by URL (most reliable)
            const existingUrls = new Set(this.furnitureItems.map(item => item.url.toLowerCase()));
            const newBookmarks = [];
            const duplicates = [];
            
            for (const bookmark of bayviewBookmarks) {
                if (existingUrls.has(bookmark.url.toLowerCase())) {
                    duplicates.push(bookmark);
                } else {
                    newBookmarks.push(bookmark);
                }
            }
            
            // Import only NEW bookmarks
            let imported = 0;
            for (const bookmark of newBookmarks) {
                const store = new URL(bookmark.url).hostname.replace('www.', '');
                
                const item = {
                    id: this.generateId(),
                    title: bookmark.title,
                    url: bookmark.url,
                    store: store,
                    category: bookmark.folder || 'Imported',
                    bookmark_folder: bookmark.folder,
                    date_added: new Date().toISOString(),
                    date_modified: new Date().toISOString(),
                    quantity: 1,
                    room_number: null,
                    favorite: false,
                    price: '',
                    notes: '',
                    image_url: ''
                };
                
                this.furnitureItems.push(item);
                imported++;
            }
            
            // Save if we imported anything
            if (imported > 0) {
                this.saveToStorage();
                this.loadFurniture();
            }
            
            // Show detailed import summary
            const summaryParts = [];
            if (imported > 0) {
                summaryParts.push(`✅ Imported ${imported} new items`);
            }
            if (duplicates.length > 0) {
                summaryParts.push(`⏭️ Skipped ${duplicates.length} duplicates`);
            }
            
            if (summaryParts.length > 0) {
                this.showToast(summaryParts.join(' | '), 'success');
                
                // Show tip for new items only
                if (imported > 0) {
                    setTimeout(() => {
                        this.showToast('💡 Use Quick Setup to add prices and images to new items', 'info');
                    }, 2500);
                }
            } else {
                this.showToast('No new items to import from Bayview folder', 'info');
            }
            
            // Log details for user reference
            console.log('Import Summary:', {
                folder: targetFolder,
                totalInFolder: bayviewBookmarks.length,
                newItems: imported,
                duplicatesSkipped: duplicates.length,
                duplicateUrls: duplicates.map(d => d.url)
            });
        };
        
        reader.readAsText(file);
        e.target.value = '';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Handle data from Chrome extension
    async checkForExtensionData() {
        // Check if we have the Chrome extension API available
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            try {
                chrome.storage.local.get(['lastExtractedFurniture'], (result) => {
                    if (result.lastExtractedFurniture) {
                        this.handleExtensionData(result.lastExtractedFurniture);
                        // Clear after processing
                        chrome.storage.local.remove(['lastExtractedFurniture']);
                    }
                });
            } catch (e) {
                console.log('Chrome storage not available - extension not installed');
            }
        }
    }

    handleExtensionData(data) {
        if (!data || !data.url) return;
        
        // Check if this item already exists
        const existingIndex = this.furnitureItems.findIndex(item => 
            item.url.toLowerCase() === data.url.toLowerCase()
        );
        
        if (existingIndex >= 0) {
            // Update existing item with extracted data
            const existingItem = this.furnitureItems[existingIndex];
            
            if (data.price && !existingItem.price) {
                existingItem.price = data.price;
                existingItem.price_extracted = true;
            }
            
            if (data.image_url && !existingItem.image_url) {
                existingItem.image_url = data.image_url;
                existingItem.image_extracted = true;
            }
            
            existingItem.date_modified = new Date().toISOString();
            
            this.saveToStorage();
            this.loadFurniture();
            
            this.showNotification(`✅ Updated ${data.title} with extracted price and image!`);
        } else {
            // Add as new item
            const newItem = {
                id: Date.now().toString(),
                title: data.title || 'New Furniture Item',
                url: data.url,
                price: data.price || '',
                quantity: 1,
                room: '',
                room_number: null,
                image_url: data.image_url || '',
                store: data.store || '',
                category: '',
                bookmark_folder: 'Chrome Extension',
                notes: 'Added via Chrome Extension',
                favorite: false,
                date_added: new Date().toISOString(),
                date_modified: new Date().toISOString(),
                price_extracted: !!data.price,
                image_extracted: !!data.image_url
            };
            
            this.furnitureItems.push(newItem);
            this.saveToStorage();
            this.loadFurniture();
            
            this.showNotification(`✅ Added ${newItem.title} with actual price and image!`);
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        `;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize the app
const catalog = new FurnitureCatalog();