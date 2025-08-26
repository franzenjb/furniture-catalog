class BudgetDashboard {
    constructor() {
        this.furnitureItems = [];
        this.loadFromStorage();
        this.loadBudget();
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

    loadBudget() {
        const budgetData = this.calculateBudget();
        this.renderBudget(budgetData);
    }

    calculateBudget() {
        const items = this.furnitureItems.filter(item => item.price);
        
        // Parse prices and calculate totals
        items.forEach(item => {
            const priceStr = item.price.replace(/[$,\s]/g, '');
            item.price_numeric = parseFloat(priceStr) || 0;
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
        
        return {
            totalItems,
            totalCost,
            byRoom,
            items
        };
    }

    renderBudget(budgetData) {
        // Update summary cards
        document.getElementById('totalItems').textContent = budgetData.totalItems;
        document.getElementById('totalCost').textContent = this.formatPrice(budgetData.totalCost);
        
        const roomCount = Object.keys(budgetData.byRoom).length;
        document.getElementById('totalRooms').textContent = roomCount;
        document.getElementById('avgPerRoom').textContent = 
            roomCount > 0 ? this.formatPrice(budgetData.totalCost / roomCount) : '$0';
        
        // Render room chart
        this.renderChart(budgetData);
        
        // Render room sections
        this.renderRoomSections(budgetData);
    }

    renderChart(budgetData) {
        const chartContainer = document.getElementById('roomChart');
        const roomData = Object.entries(budgetData.byRoom)
            .sort((a, b) => b[1].totalCost - a[1].totalCost)
            .slice(0, 8);
        
        if (roomData.length === 0) {
            chartContainer.innerHTML = '<p style="text-align: center; color: #999;">No budget data available. Add prices to your furniture items.</p>';
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
        
        if (Object.keys(budgetData.byRoom).length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No budget data yet</h3>
                    <p>Add prices to your furniture items to see budget breakdown</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = Object.entries(budgetData.byRoom)
            .sort((a, b) => b[1].totalCost - a[1].totalCost)
            .map(([room, data]) => `
                <div class="room-section">
                    <div class="room-header">
                        <h2 class="room-title">${this.escapeHtml(room)} (${data.itemCount} items)</h2>
                        <div class="room-total">${this.formatPrice(data.totalCost)}</div>
                    </div>
                    <div class="room-items">
                        ${data.items.map(item => this.renderBudgetItem(item)).join('')}
                    </div>
                </div>
            `).join('');
    }

    renderBudgetItem(item) {
        const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Dining Room', 'Office', 'Bathroom', 'Garage', 'Patio', 'Guest Room', 'Master Bedroom', 'Kids Room', 'Unassigned'];
        
        return `
            <div class="budget-item">
                ${item.image_url 
                    ? `<img src="${item.image_url}" alt="${item.title}" class="item-image" onerror="this.onerror=null; this.outerHTML='<div class=\\'item-no-image\\'>🪑</div>'">`
                    : '<div class="item-no-image">🪑</div>'
                }
                <div>
                    <strong>${this.escapeHtml(item.title)}</strong>
                    ${item.store ? `<br><small>${this.escapeHtml(item.store)}</small>` : ''}
                </div>
                <div>${this.escapeHtml(item.price || 'N/A')}</div>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="budget.updateQuantity('${item.id}', ${(item.quantity || 1) - 1})">−</button>
                    <span class="quantity-value">${item.quantity || 1}</span>
                    <button class="quantity-btn" onclick="budget.updateQuantity('${item.id}', ${(item.quantity || 1) + 1})">+</button>
                </div>
                <select class="room-select" onchange="budget.updateRoom('${item.id}', this.value)">
                    ${rooms.map(r => 
                        `<option value="${r}" ${r === (item.room || 'Unassigned') ? 'selected' : ''}>${r}</option>`
                    ).join('')}
                </select>
                <div style="text-align: right; font-weight: bold;">
                    ${this.formatPrice(item.line_total || 0)}
                </div>
            </div>
        `;
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
        return text.replace(/[&<>"']/g, m => map[m]);
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