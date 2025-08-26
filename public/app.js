let currentView = 'grid';
let furnitureItems = [];

document.addEventListener('DOMContentLoaded', () => {
    loadFurniture();
    loadCategories();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('addItemBtn').addEventListener('click', () => openModal());
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', handleFileImport);
    document.getElementById('furnitureForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    
    document.querySelector('.close').addEventListener('click', closeModal);
    document.querySelector('.close-detail').addEventListener('click', closeDetailModal);
    
    document.getElementById('searchInput').addEventListener('input', debounce(loadFurniture, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadFurniture);
    document.getElementById('favoritesOnly').addEventListener('change', loadFurniture);
    
    document.getElementById('gridViewBtn').addEventListener('click', () => setView('grid'));
    document.getElementById('listViewBtn').addEventListener('click', () => setView('list'));
    
    window.addEventListener('click', (e) => {
        if (e.target.className === 'modal') {
            closeModal();
            closeDetailModal();
        }
    });
}

function setView(view) {
    currentView = view;
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    renderFurniture();
}

async function loadFurniture() {
    const search = document.getElementById('searchInput').value;
    const category = document.getElementById('categoryFilter').value;
    const favoriteOnly = document.getElementById('favoritesOnly').checked;
    
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (category) params.append('category', category);
    if (favoriteOnly) params.append('favorite', 'true');
    
    try {
        const response = await fetch(`/api/furniture?${params}`);
        furnitureItems = await response.json();
        renderFurniture();
    } catch (error) {
        showToast('Failed to load furniture items', 'error');
    }
}

async function loadCategories() {
    try {
        const response = await fetch('/api/categories');
        const categories = await response.json();
        
        const categoryFilter = document.getElementById('categoryFilter');
        const categoryList = document.getElementById('categoryList');
        
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        categoryList.innerHTML = '';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
            
            const listOption = document.createElement('option');
            listOption.value = category;
            categoryList.appendChild(listOption);
        });
    } catch (error) {
        console.error('Failed to load categories:', error);
    }
}

function renderFurniture() {
    const grid = document.getElementById('furnitureGrid');
    
    if (furnitureItems.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No furniture items yet</h3>
                <p>Add items manually or import your bookmarks to get started!</p>
            </div>
        `;
        return;
    }
    
    grid.className = currentView === 'list' ? 'furniture-grid list-view' : 'furniture-grid';
    
    grid.innerHTML = furnitureItems.map(item => `
        <div class="furniture-card ${currentView === 'list' ? 'list-view' : ''}" onclick="showDetail(${item.id})">
            ${item.image_url 
                ? `<img src="${item.image_url}" alt="${item.title}" class="card-image" onerror="this.onerror=null; this.outerHTML='<div class=\\'card-no-image\\'>🪑</div>'">`
                : '<div class="card-no-image">🪑</div>'
            }
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${escapeHtml(item.title)}</h3>
                    <button class="favorite-btn ${item.favorite ? 'active' : ''}" 
                            onclick="toggleFavorite(event, ${item.id}, ${item.favorite ? 'true' : 'false'})">
                        ${item.favorite ? '❤️' : '🤍'}
                    </button>
                </div>
                <div class="card-meta">
                    ${item.price ? `<span class="card-price">${escapeHtml(item.price)}</span>` : ''}
                    ${item.store ? `<span class="card-store">${escapeHtml(item.store)}</span>` : ''}
                    ${item.category ? `<span class="card-category">${escapeHtml(item.category)}</span>` : ''}
                </div>
                ${item.notes ? `<p class="card-notes">${escapeHtml(item.notes)}</p>` : ''}
                <div class="card-actions">
                    <button class="card-btn edit-btn" onclick="editItem(event, ${item.id})">Edit</button>
                    <button class="card-btn delete-btn" onclick="deleteItem(event, ${item.id})">Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function showDetail(id) {
    try {
        const response = await fetch(`/api/furniture/${id}`);
        const item = await response.json();
        
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
                    <h2>${escapeHtml(item.title)}</h2>
                    <div class="detail-meta">
                        ${item.price ? `<p><strong>Price:</strong> ${escapeHtml(item.price)}</p>` : ''}
                        ${item.store ? `<p><strong>Store:</strong> ${escapeHtml(item.store)}</p>` : ''}
                        ${item.category ? `<p><strong>Category:</strong> ${escapeHtml(item.category)}</p>` : ''}
                        <p><strong>Added:</strong> ${new Date(item.date_added).toLocaleDateString()}</p>
                        <p><strong>Modified:</strong> ${new Date(item.date_modified).toLocaleDateString()}</p>
                    </div>
                    ${item.notes ? `
                        <div class="detail-notes">
                            <h4>Notes</h4>
                            <p>${escapeHtml(item.notes)}</p>
                        </div>
                    ` : ''}
                    <div class="detail-actions">
                        <a href="${item.url}" target="_blank" class="btn btn-primary">Visit Website</a>
                        <button class="btn btn-secondary" onclick="editItem(event, ${item.id})">Edit</button>
                        <button class="btn delete-btn" onclick="deleteItem(event, ${item.id})">Delete</button>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('detailModal').classList.add('show');
    } catch (error) {
        showToast('Failed to load item details', 'error');
    }
}

function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('show');
}

function openModal(item = null) {
    const modal = document.getElementById('modal');
    const form = document.getElementById('furnitureForm');
    const modalTitle = document.getElementById('modalTitle');
    
    form.reset();
    
    if (item) {
        modalTitle.textContent = 'Edit Item';
        document.getElementById('itemId').value = item.id;
        document.getElementById('title').value = item.title;
        document.getElementById('url').value = item.url;
        document.getElementById('price').value = item.price || '';
        document.getElementById('store').value = item.store || '';
        document.getElementById('category').value = item.category || '';
        document.getElementById('notes').value = item.notes || '';
    } else {
        modalTitle.textContent = 'Add New Item';
        document.getElementById('itemId').value = '';
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const itemId = document.getElementById('itemId').value;
    const formData = {
        title: document.getElementById('title').value,
        url: document.getElementById('url').value,
        price: document.getElementById('price').value,
        store: document.getElementById('store').value,
        category: document.getElementById('category').value,
        notes: document.getElementById('notes').value
    };
    
    try {
        const url = itemId ? `/api/furniture/${itemId}` : '/api/furniture';
        const method = itemId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            closeModal();
            showToast(itemId ? 'Item updated successfully' : 'Item added successfully', 'success');
            loadFurniture();
            loadCategories();
        } else {
            throw new Error('Failed to save item');
        }
    } catch (error) {
        showToast('Failed to save item', 'error');
    }
}

async function editItem(event, id) {
    event.stopPropagation();
    closeDetailModal();
    
    try {
        const response = await fetch(`/api/furniture/${id}`);
        const item = await response.json();
        openModal(item);
    } catch (error) {
        showToast('Failed to load item', 'error');
    }
}

async function deleteItem(event, id) {
    event.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`/api/furniture/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            closeDetailModal();
            showToast('Item deleted successfully', 'success');
            loadFurniture();
        } else {
            throw new Error('Failed to delete item');
        }
    } catch (error) {
        showToast('Failed to delete item', 'error');
    }
}

async function toggleFavorite(event, id, currentStatus) {
    event.stopPropagation();
    
    try {
        const response = await fetch(`/api/furniture/${id}`);
        const item = await response.json();
        
        const updateResponse = await fetch(`/api/furniture/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...item,
                favorite: !currentStatus
            })
        });
        
        if (updateResponse.ok) {
            loadFurniture();
        }
    } catch (error) {
        showToast('Failed to update favorite status', 'error');
    }
}

async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('bookmarks', file);
    
    showToast('Importing bookmarks... This may take a moment.', 'success');
    
    try {
        const response = await fetch('/api/import-bookmarks', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success');
            loadFurniture();
            loadCategories();
        } else {
            throw new Error(result.error || 'Import failed');
        }
    } catch (error) {
        showToast('Failed to import bookmarks', 'error');
    }
    
    e.target.value = '';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function escapeHtml(text) {
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}