class BudgetDashboard {
    constructor() {
        this.furnitureItems = [];
        this.currentView = 'table';
        this.loadFromStorage();
        this.setupEventListeners();
        this.loadBudget();
    }

    loadFromStorage() {
        const stored = localStorage.getItem('furnitureItems');
        if (stored) {
            this.furnitureItems = JSON.parse(stored);
            // Ensure all items have room_number field
            this.furnitureItems.forEach(item => {
                if (item.room_number === undefined) {
                    item.room_number = null;
                }
            });
        }
    }

    saveToStorage() {
        localStorage.setItem('furnitureItems', JSON.stringify(this.furnitureItems));
    }

    setupEventListeners() {
        document.getElementById('tableViewBtn').addEventListener('click', () => this.switchView('table'));
        document.getElementById('roomViewBtn').addEventListener('click', () => this.switchView('room'));
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
    }

    switchView(view) {
        this.currentView = view;
        
        document.getElementById('tableViewBtn').classList.toggle('active', view === 'table');
        document.getElementById('roomViewBtn').classList.toggle('active', view === 'room');
        
        document.getElementById('tableView').style.display = view === 'table' ? 'block' : 'none';
        document.getElementById('roomView').style.display = view === 'room' ? 'block' : 'none';
        
        if (view === 'room') {
            const budgetData = this.calculateBudget();
            this.renderChart(budgetData);
            this.renderRoomSections(budgetData);
        }
    }

    loadBudget() {
        const budgetData = this.calculateBudget();
        this.renderSummary(budgetData);
        this.renderTable(budgetData);
    }

    calculateBudget() {
        const items = this.furnitureItems;
        
        // Parse prices and calculate totals
        items.forEach(item => {
            if (item.price) {
                const priceStr = item.price.toString().replace(/[$,\s]/g, '');
                item.price_numeric = parseFloat(priceStr) || 0;
            } else {
                item.price_numeric = 0;
            }
            item.line_total = item.price_numeric * (item.quantity || 1);
        });
        
        // Calculate summary
        const totalItems = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        const totalCost = items.reduce((sum, item) => sum + (item.line_total || 0), 0);
        
        // Group by room
        const byRoom = {};
        items.forEach(item => {
            const room = item.room || 'Unassigned';
            if (!byRoom[room]) {
                byRoom[room] = {
                    items: [],
                    totalCost: 0,
                    itemCount: 0
                };
            }
            byRoom[room].items.push(item);
            byRoom[room].totalCost += item.line_total || 0;
            byRoom[room].itemCount += item.quantity || 1;
        });
        
        // Get unique room numbers
        const roomNumbers = [...new Set(items.map(i => i.room_number).filter(r => r))];
        
        return {
            totalItems,
            totalCost,
            byRoom,
            items,
            roomNumbers
        };
    }

    renderSummary(budgetData) {
        document.getElementById('totalItems').textContent = budgetData.totalItems;
        document.getElementById('totalCost').textContent = this.formatPrice(budgetData.totalCost);
        
        const roomsUsed = budgetData.roomNumbers.length;
        document.getElementById('totalRooms').textContent = roomsUsed;
        
        const avgPerItem = budgetData.totalItems > 0 
            ? budgetData.totalCost / budgetData.totalItems 
            : 0;
        document.getElementById('avgPerItem').textContent = this.formatPrice(avgPerItem);
    }

    renderTable(budgetData) {
        const tableBody = document.getElementById('tableBody');
        
        if (budgetData.items.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 40px; color: #999;">
                        No furniture items yet. Add items from the catalog to see them here.
                    </td>
                </tr>
            `;
            document.getElementById('footerQty').innerHTML = '<strong>0</strong>';
            document.getElementById('footerTotal').innerHTML = '<strong>$0.00</strong>';
            return;
        }
        
        // Load saved rooms from localStorage
        const savedRooms = localStorage.getItem('furnitureRooms');
        const roomsData = savedRooms ? JSON.parse(savedRooms) : [];
        const roomNames = roomsData.map(r => r.name);
        
        // Add Unassigned option and any rooms from items not in saved rooms
        const itemRooms = [...new Set(budgetData.items.map(i => i.room).filter(r => r))];
        itemRooms.forEach(room => {
            if (!roomNames.includes(room)) {
                roomNames.push(room);
            }
        });
        
        if (!roomNames.includes('Unassigned')) {
            roomNames.push('Unassigned');
        }
        
        const rooms = roomNames;
        
        tableBody.innerHTML = budgetData.items.map(item => `
            <tr data-id="${item.id}">
                <td>
                    ${item.image_url 
                        ? `<img src="${item.image_url}" alt="${item.title}" class="table-image" 
                            onerror="this.onerror=null; this.outerHTML='<div class=\\'table-no-image\\'>🪑</div>'">`
                        : '<div class="table-no-image">🪑</div>'
                    }
                </td>
                <td>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    ${item.url ? `<br><a href="${item.url}" target="_blank" class="store-link">View →</a>` : ''}
                </td>
                <td>${this.escapeHtml(item.store || '-')}</td>
                <td>
                    <input type="text" 
                           class="inline-input price-input" 
                           value="${item.price || ''}" 
                           placeholder="$0.00"
                           onchange="budget.updatePrice('${item.id}', this.value)">
                </td>
                <td>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="budget.updateQuantity('${item.id}', ${(item.quantity || 1) - 1})">−</button>
                        <span class="qty-display">${item.quantity || 1}</span>
                        <button class="qty-btn" onclick="budget.updateQuantity('${item.id}', ${(item.quantity || 1) + 1})">+</button>
                    </div>
                </td>
                <td>
                    <select class="room-select" onchange="budget.updateRoom('${item.id}', this.value)">
                        ${rooms.map(r => 
                            `<option value="${r}" ${r === (item.room || 'Unassigned') ? 'selected' : ''}>${r}</option>`
                        ).join('')}
                    </select>
                </td>
                <td>
                    <input type="number" 
                           class="room-number-input" 
                           value="${item.room_number || ''}" 
                           placeholder="#"
                           min="1"
                           max="99"
                           onchange="budget.updateRoomNumber('${item.id}', this.value)">
                </td>
                <td style="text-align: right; font-weight: bold;">
                    ${this.formatPrice(item.line_total || 0)}
                </td>
                <td>
                    <button class="delete-item-btn" onclick="budget.deleteItem('${item.id}')">Delete</button>
                </td>
            </tr>
        `).join('');
        
        // Update footer totals
        document.getElementById('footerQty').innerHTML = `<strong>${budgetData.totalItems}</strong>`;
        document.getElementById('footerTotal').innerHTML = `<strong>${this.formatPrice(budgetData.totalCost)}</strong>`;
    }

    updatePrice(id, newPrice) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            item.price = newPrice;
            this.saveToStorage();
            this.loadBudget();
        }
    }

    updateQuantity(id, newQuantity) {
        if (newQuantity < 0) return;
        
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            item.quantity = newQuantity;
            this.saveToStorage();
            this.loadBudget();
        }
    }

    updateRoom(id, newRoom) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            item.room = newRoom;
            this.saveToStorage();
            this.loadBudget();
        }
    }

    updateRoomNumber(id, newRoomNumber) {
        const item = this.furnitureItems.find(i => i.id === id);
        if (item) {
            item.room_number = newRoomNumber ? parseInt(newRoomNumber) : null;
            this.saveToStorage();
            this.loadBudget();
        }
    }

    deleteItem(id) {
        if (confirm('Remove this item from your catalog?')) {
            this.furnitureItems = this.furnitureItems.filter(i => i.id !== id);
            this.saveToStorage();
            this.loadBudget();
            this.showToast('Item removed', 'success');
        }
    }

    renderChart(budgetData) {
        const chartContainer = document.getElementById('roomChart');
        const roomData = Object.entries(budgetData.byRoom)
            .filter(([_, data]) => data.totalCost > 0)
            .sort((a, b) => b[1].totalCost - a[1].totalCost)
            .slice(0, 8);
        
        if (roomData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #999;">No budget data available. Add prices to see charts.</p>';
            return;
        }
        
        const maxCost = Math.max(...roomData.map(([_, data]) => data.totalCost));
        
        chartContainer.innerHTML = roomData.map(([room, data]) => {
            const height = (data.totalCost / maxCost) * 250;
            return `
                <div class="bar" style="height: ${height}px">
                    <div class="bar-value">${this.formatPrice(data.totalCost)}</div>
                    <div class="bar-label">${this.escapeHtml(room)}</div>
                </div>
            `;
        }).join('');
    }

    renderRoomSections(budgetData) {
        const container = document.getElementById('roomSections');
        
        const roomsWithItems = Object.entries(budgetData.byRoom)
            .filter(([_, data]) => data.items.length > 0)
            .sort((a, b) => b[1].totalCost - a[1].totalCost);
        
        if (roomsWithItems.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No items assigned to rooms yet</h3>
                    <p>Assign rooms to your furniture items to see them organized here</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = roomsWithItems.map(([room, data]) => `
            <div class="room-section">
                <div class="room-header">
                    <h2 class="room-title">${this.escapeHtml(room)} (${data.itemCount} items)</h2>
                    <div class="room-total">${this.formatPrice(data.totalCost)}</div>
                </div>
                <div class="room-items">
                    ${data.items.map(item => this.renderRoomItem(item)).join('')}
                </div>
            </div>
        `).join('');
    }

    renderRoomItem(item) {
        return `
            <div class="budget-item">
                ${item.image_url 
                    ? `<img src="${item.image_url}" alt="${item.title}" class="item-image" 
                        onerror="this.onerror=null; this.outerHTML='<div class=\\'item-no-image\\'>🪑</div>'">`
                    : '<div class="item-no-image">🪑</div>'
                }
                <div>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    ${item.store ? `<br><small>${this.escapeHtml(item.store)}</small>` : ''}
                    ${item.room_number ? `<br><small>Room #${item.room_number}</small>` : ''}
                </div>
                <div>${this.escapeHtml(item.price || 'No price')}</div>
                <div>Qty: ${item.quantity || 1}</div>
                <div>${this.escapeHtml(item.room || 'Unassigned')}</div>
                <div style="text-align: right; font-weight: bold;">
                    ${this.formatPrice(item.line_total || 0)}
                </div>
            </div>
        `;
    }

    exportCSV() {
        const items = this.furnitureItems;
        
        const headers = ['Item Name', 'Store', 'URL', 'Price', 'Quantity', 'Room', 'Room #', 'Subtotal', 'Category', 'Notes'];
        
        const rows = items.map(item => [
            item.title,
            item.store || '',
            item.url || '',
            item.price || '',
            item.quantity || 1,
            item.room || 'Unassigned',
            item.room_number || '',
            this.formatPrice(item.line_total || 0),
            item.category || '',
            item.notes || ''
        ]);
        
        // Add total row
        const budgetData = this.calculateBudget();
        rows.push(['', '', '', 'TOTAL', budgetData.totalItems, '', '', this.formatPrice(budgetData.totalCost), '', '']);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `furniture-budget-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Budget exported to CSV', 'success');
    }

    formatPrice(price) {
        if (typeof price === 'number') {
            return '$' + price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return price || '$0';
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
        return text.toString().replace(/[&<>"']/g, m => map[m]);
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
}

// Initialize the budget dashboard
const budget = new BudgetDashboard();