/**
 * Inventario Monarca - Application Controller
 * Handles state, local storage, UI rendering, sales cart, backup/restore,
 * dashboard timeframe reports, and inventory valuation analytics.
 */

class InventoryApp {
    constructor() {
        this.products = [];
        this.sales = [];
        this.cart = [];
        this.activeTab = 'dashboard';
        this.isCodeManuallyEdited = false;
        this.editingSaleId = null;

        // Seed products list for demonstration (with purchase cost and selling price)
        this.defaultProducts = [
            { id: '1', code: 'PROD-001', name: 'Smartwatch Vibe Pro', description: 'Pantalla AMOLED 1.43", sensor ritmo cardíaco, resistencia al agua IP68.', category: 'Electrónica', cost: 75.00, price: 129.99, stock: 15 },
            { id: '2', code: 'PROD-002', name: 'Auriculares Inalámbricos SoundBuds', description: 'Cancelación activa de ruido (ANC), autonomía de 30 horas, Bluetooth 5.3.', category: 'Electrónica', cost: 45.00, price: 79.50, stock: 25 },
            { id: '3', code: 'PROD-003', name: 'Teclado Mecánico AeroKey', description: 'Layout 75%, switches mecánicos lineales, retroiluminación RGB configurable.', category: 'Electrónica', cost: 55.00, price: 95.00, stock: 4 },
            { id: '4', code: 'PROD-004', name: 'Camiseta de Algodón Minimalist', description: 'Algodón orgánico 100%, tacto ultrasuave, corte regular fit.', category: 'Ropa', cost: 12.00, price: 24.99, stock: 40 },
            { id: '5', code: 'PROD-005', name: 'Mochila Impermeable UrbanTech', description: 'Compartimiento acolchado para portátil de 15.6", puerto de carga USB.', category: 'Hogar', cost: 28.00, price: 49.99, stock: 2 }
        ];

        this.init();
    }

    init() {
        // Load data from localStorage
        this.loadData();

        // Bind DOM events
        this.bindEvents();

        // Render initially
        this.switchTab('dashboard');
        this.renderAll();
        this.bindQuickAdd();

        // Initialize Lucide Icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- CURRENCY FORMATTING UTILITY ---

    formatMoney(value) {
        const parsed = parseFloat(value) || 0;
        // Formats as e.g. $10.000 for integers, or $129,99 for decimals
        return '$' + new Intl.NumberFormat('es-CO', {
            minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
            maximumFractionDigits: 2
        }).format(parsed);
    }

    // --- DATA HANDLING & PERSISTENCE ---

    loadData() {
        const storedProducts = localStorage.getItem('sv_products');
        const storedSales = localStorage.getItem('sv_sales');
        const storedTheme = localStorage.getItem('sv_theme');
        const storedOwner = localStorage.getItem('sv_owner') || 'Administrador';

        // Load Products
        if (storedProducts) {
            this.products = JSON.parse(storedProducts);
        } else {
            this.products = [...this.defaultProducts];
            this.saveProducts();
        }

        // Load Sales
        if (storedSales) {
            this.sales = JSON.parse(storedSales);
        } else {
            this.sales = [];
            this.saveSales();
        }

        // Load Theme
        if (storedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
        }

        // Load Owner Name
        const ownerEl = document.getElementById('owner-name');
        if (ownerEl) {
            ownerEl.value = storedOwner;
            this.updateOwnerAvatar(storedOwner);
        }
    }

    saveProducts() {
        localStorage.setItem('sv_products', JSON.stringify(this.products));
    }

    saveSales() {
        localStorage.setItem('sv_sales', JSON.stringify(this.sales));
    }

    updateOwnerAvatar(name) {
        const avatar = document.getElementById('owner-avatar');
        if (avatar && name) {
            const firstLetter = name.trim().charAt(0).toUpperCase();
            avatar.innerText = firstLetter || 'A';
        }
    }

    // --- EVENT BINDING ---

    bindEvents() {
        // Sidebar Navigation
        document.querySelectorAll('.menu-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Theme Toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Owner Name Editable Setup
        const ownerNameEl = document.getElementById('owner-name');
        if (ownerNameEl) {
            ownerNameEl.addEventListener('change', (e) => {
                const newName = e.target.value.trim() || 'Administrador';
                e.target.value = newName;
                localStorage.setItem('sv_owner', newName);
                this.updateOwnerAvatar(newName);
                this.showToast('Nombre de dueño actualizado', 'success');
            });
            ownerNameEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    ownerNameEl.blur();
                }
            });
        }

        // Dashboard Report Filter
        const timeframeEl = document.getElementById('dashboard-timeframe');
        if (timeframeEl) {
            timeframeEl.addEventListener('change', () => this.renderDashboardStats());
        }

        // Dashboard buttons
        document.getElementById('btn-dashboard-view-all').addEventListener('click', () => {
            this.switchTab('historial');
        });

        // Products Search & Filter
        document.getElementById('product-search').addEventListener('input', () => this.renderProductsTable());
        document.getElementById('product-filter-stock').addEventListener('change', () => this.renderProductsTable());

        // Products Actions
        document.getElementById('btn-add-product').addEventListener('click', () => this.openProductModal());
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeProductModal());
        document.getElementById('btn-cancel-modal').addEventListener('click', () => this.closeProductModal());
        document.getElementById('product-form').addEventListener('submit', (e) => this.handleProductFormSubmit(e));

        // Auto-generate SKU from name initials
        const prodNameInput = document.getElementById('prod-name');
        const prodCodeInput = document.getElementById('prod-code');
        
        if (prodCodeInput) {
            prodCodeInput.addEventListener('input', () => {
                this.isCodeManuallyEdited = true;
            });
        }
        
        if (prodNameInput && prodCodeInput) {
            prodNameInput.addEventListener('input', (e) => {
                const id = document.getElementById('form-product-id').value;
                if (!id && !this.isCodeManuallyEdited) {
                    const nameVal = e.target.value;
                    const initials = this.getInitials(nameVal);
                    const suffix = String(this.products.length + 1).padStart(3, '0');
                    prodCodeInput.value = nameVal.trim() === '' ? 'PROD-' + suffix : `${initials}-${suffix}`;
                }
            });
        }

        // Sales Panel Logic
        document.getElementById('sales-product-search').addEventListener('input', () => this.renderSalesGrid());
        document.getElementById('btn-clear-cart').addEventListener('click', () => this.clearCart());
        document.getElementById('btn-complete-sale').addEventListener('click', () => this.completeSale());

        // History Filters & Backups
        document.getElementById('history-filter-date').addEventListener('change', () => this.renderSalesHistory());
        document.getElementById('btn-clear-date-filter').addEventListener('click', () => {
            document.getElementById('history-filter-date').value = '';
            this.renderSalesHistory();
        });
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportSalesToCSV());
        
        // Backup Button Click
        document.getElementById('btn-backup-data').addEventListener('click', () => this.backupData());
        
        // Restore Button Trigger hidden input
        document.getElementById('btn-restore-data').addEventListener('click', () => {
            document.getElementById('restore-file-input').click();
        });
        document.getElementById('restore-file-input').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.restoreData(file);
            }
        });

        // Receipt Modal
        document.getElementById('btn-close-receipt-modal').addEventListener('click', () => {
            document.getElementById('sale-detail-modal').classList.remove('show');
        });
        document.getElementById('btn-print-receipt').addEventListener('click', () => {
            window.print();
        });
    }

    // --- NAVIGATION & THEME ---

    switchTab(tabId) {
        this.activeTab = tabId;

        // Update active class in sidebar menu
        document.querySelectorAll('.menu-item').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update main content sections
        document.querySelectorAll('.tab-content').forEach(section => {
            if (section.id === `tab-${tabId}`) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });

        // Update header texts dynamically
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');

        switch (tabId) {
            case 'dashboard':
                pageTitle.innerText = 'Dashboard';
                pageSubtitle.innerText = 'Resumen del rendimiento de tu negocio hoy';
                this.renderDashboardStats();
                break;
            case 'productos':
                pageTitle.innerText = 'Inventario';
                pageSubtitle.innerText = 'Gestiona, añade y edita tu catálogo de productos';
                this.renderProductsTable();
                break;
            case 'ventas':
                pageTitle.innerText = 'Registrar Venta';
                pageSubtitle.innerText = 'Añade artículos al carrito y factura en segundos';
                this.renderSalesGrid();
                break;
            case 'historial':
                pageTitle.innerText = 'Historial de Ventas';
                pageSubtitle.innerText = 'Consulta tus facturas registradas y exporta datos';
                this.renderSalesHistory();
                break;
        }

        // Re-trigger icon rendering
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    toggleTheme() {
        const body = document.body;
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            body.classList.add('light-theme');
            localStorage.setItem('sv_theme', 'light');
            this.showToast('Modo Claro activado', 'info');
        } else {
            body.classList.remove('light-theme');
            body.classList.add('dark-theme');
            localStorage.setItem('sv_theme', 'dark');
            this.showToast('Modo Oscuro activado', 'info');
        }
    }

    // --- RENDER CONTROLLERS ---

    renderAll() {
        this.renderDashboardStats();
        this.renderProductsTable();
        this.renderSalesGrid();
        this.renderCart();
        this.renderSalesHistory();
        this.renderMonthlySales();
    }

    // --- QUICK ADD BY NAME (Venta Rápida) ---

    bindQuickAdd() {
        const nameInput = document.getElementById('quick-add-name');
        const dropdown = document.getElementById('quick-add-autocomplete');
        const btnAdd = document.getElementById('btn-quick-add');

        if (!nameInput) return;

        nameInput.addEventListener('input', () => {
            const q = nameInput.value.trim().toLowerCase();
            if (q.length < 1) {
                dropdown.style.display = 'none';
                dropdown.innerHTML = '';
                return;
            }
            const matches = this.products.filter(p =>
                p.name.toLowerCase().includes(q)
            );
            if (matches.length === 0) {
                dropdown.style.display = 'none';
                return;
            }
            dropdown.innerHTML = matches.slice(0, 6).map(p => {
                const stock = parseInt(p.stock);
                const outOfStock = stock <= 0;
                return `
                    <div class="autocomplete-option ${outOfStock ? 'opacity-50' : ''}"
                         style="${outOfStock ? 'opacity:0.45; cursor:not-allowed;' : ''}"
                         onclick="${outOfStock ? '' : `window.app.selectQuickProduct('${p.id}')`}">
                        <span>${p.name} ${outOfStock ? '<small style="color:var(--danger);">(Agotado)</small>' : ''}</span>
                        <span class="option-price">${this.formatMoney(p.price)}</span>
                    </div>
                `;
            }).join('');
            dropdown.style.display = 'block';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!nameInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });

        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const name = nameInput.value.trim();
                const qty = parseInt(document.getElementById('quick-add-qty').value) || 1;
                if (!name) {
                    this.showToast('Escribe el nombre del producto', 'warning');
                    return;
                }
                const product = this.products.find(p =>
                    p.name.toLowerCase() === name.toLowerCase()
                );
                if (!product) {
                    this.showToast('Producto no encontrado. Verifica el nombre', 'danger');
                    return;
                }
                if (parseInt(product.stock) <= 0) {
                    this.showToast('Este producto está agotado', 'danger');
                    return;
                }
                this.addToCartById(product.id, qty);
                nameInput.value = '';
                document.getElementById('quick-add-qty').value = 1;
                dropdown.style.display = 'none';
            });
        }
    }

    selectQuickProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        const nameInput = document.getElementById('quick-add-name');
        const dropdown = document.getElementById('quick-add-autocomplete');
        if (nameInput) nameInput.value = product.name;
        if (dropdown) dropdown.style.display = 'none';
    }

    addToCartById(productId, qty = 1) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        const stockLimit = parseInt(product.stock);
        if (stockLimit <= 0) {
            this.showToast('Este producto está agotado', 'danger');
            return;
        }
        const cartItemIndex = this.cart.findIndex(item => item.id === productId);
        if (cartItemIndex !== -1) {
            const newQty = this.cart[cartItemIndex].qty + qty;
            if (newQty <= stockLimit) {
                this.cart[cartItemIndex].qty = newQty;
            } else {
                this.cart[cartItemIndex].qty = stockLimit;
                this.showToast(`Stock máximo alcanzado (${stockLimit} unidades)`, 'warning');
            }
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                qty: Math.min(qty, stockLimit)
            });
        }
        this.showToast(`"${product.name}" agregado al carrito`, 'success');
        this.renderCart();
    }

    // --- MONTHLY CUMULATIVE SALES ---

    renderMonthlySales() {
        const container = document.getElementById('monthly-sales-container');
        if (!container) return;

        if (this.sales.length === 0) {
            container.innerHTML = `<p class="muted-text text-center py-4">No hay ventas registradas.</p>`;
            return;
        }

        // Group sales by year-month
        const monthMap = {};
        this.sales.forEach(sale => {
            const date = new Date(sale.timestamp);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) {
                monthMap[key] = { total: 0, count: 0 };
            }
            monthMap[key].total += sale.total;
            monthMap[key].count++;
        });

        // Sort months descending
        const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                            'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const sortedKeys = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));

        container.innerHTML = sortedKeys.map(key => {
            const [year, month] = key.split('-');
            const label = `${monthNames[parseInt(month) - 1]} ${year}`;
            const data = monthMap[key];
            return `
                <div style="display: flex; justify-content: space-between; align-items: center;
                            padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                    <div>
                        <span style="font-weight: 600; font-size: 0.9rem;">${label}</span><br>
                        <span class="muted-text" style="font-size: 0.78rem;">${data.count} venta(s)</span>
                    </div>
                    <span style="font-family: var(--font-display); font-weight: 700;
                                 font-size: 1.1rem; color: var(--success);">
                        ${this.formatMoney(data.total)}
                    </span>
                </div>
            `;
        }).join('');
    }

    // --- DASHBOARD ANALYTICS ---

    renderDashboardStats() {
        const timeframe = document.getElementById('dashboard-timeframe') ? document.getElementById('dashboard-timeframe').value : 'month';
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Filter sales array based on timeframe
        const filteredSales = this.sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            const diffTime = Math.abs(now - saleDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (timeframe === 'today') {
                return sale.timestamp.startsWith(todayStr);
            } else if (timeframe === 'week') {
                return diffDays <= 7;
            } else if (timeframe === 'month') {
                return diffDays <= 30;
            } else {
                return true; // all time
            }
        });

        // Income, cost of sales calculation
        let ingresosTotales = 0;
        let totalCostosVentas = 0;
        let subtotalVentas = 0;
        
        filteredSales.forEach(sale => {
            ingresosTotales += sale.total;
            subtotalVentas += sale.subtotal;
            sale.items.forEach(item => {
                const itemCost = parseFloat(item.cost !== undefined ? item.cost : item.price * 0.6);
                totalCostosVentas += itemCost * item.qty;
            });
        });

        const gananciaNeta = subtotalVentas - totalCostosVentas;
        const margenPromedio = subtotalVentas > 0 ? (gananciaNeta / subtotalVentas) * 100 : 0;

        // Stock count and Alerts
        let totalProductosTipos = this.products.length;
        let totalUnidadesStock = 0;
        let stockCritico = 0;

        this.products.forEach(p => {
            totalUnidadesStock += parseInt(p.stock);
            if (parseInt(p.stock) <= 5) {
                stockCritico++;
            }
        });

        // Bind dashboard values
        document.getElementById('stat-ingresos').innerText = this.formatMoney(ingresosTotales);
        document.getElementById('stat-ganancia').innerText = this.formatMoney(gananciaNeta);
        document.getElementById('stat-ganancia-margin').innerText = `${margenPromedio.toFixed(1)}% Margen prom.`;
        document.getElementById('stat-ventas').innerText = filteredSales.length;
        document.getElementById('stat-total-stock').innerText = totalUnidadesStock;
        document.getElementById('stat-alertas').innerText = stockCritico;
        document.getElementById('stat-productos').innerText = totalProductosTipos;

        // Style the alert card if critical stocks exist
        const alertCard = document.getElementById('alert-card');
        const alertTrend = document.getElementById('alert-trend');
        if (stockCritico > 0) {
            alertCard.classList.add('has-alerts');
            alertTrend.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;vertical-align:middle;"></i> ¡Acción requerida!`;
        } else {
            alertCard.classList.remove('has-alerts');
            alertTrend.innerHTML = `<span id="stat-productos">${totalProductosTipos}</span> productos`;
        }

        // Render lists with the filtered sales
        this.renderTopProductsList(filteredSales);
        this.renderRecentSalesList(filteredSales);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderTopProductsList(salesList) {
        const container = document.getElementById('top-products-container');
        
        // Group quantities by product ID
        const productSales = {};
        salesList.forEach(sale => {
            sale.items.forEach(item => {
                if (!productSales[item.id]) {
                    productSales[item.id] = {
                        name: item.name,
                        qty: 0,
                        revenue: 0
                    };
                }
                productSales[item.id].qty += item.qty;
                productSales[item.id].revenue += item.price * item.qty;
            });
        });

        // Convert to array and sort
        const topList = Object.keys(productSales).map(id => ({
            id,
            ...productSales[id]
        })).sort((a, b) => b.qty - a.qty).slice(0, 4);

        if (topList.length === 0) {
            container.innerHTML = `<p class="muted-text text-center py-4">No hay datos de ventas en este período.</p>`;
            return;
        }

        // Max sold quantity to represent progress bar percentages
        const maxQty = Math.max(...topList.map(p => p.qty));

        container.innerHTML = topList.map(item => {
            const percentage = maxQty > 0 ? (item.qty / maxQty) * 100 : 0;
            return `
                <div class="top-product-item">
                    <div class="top-product-info">
                        <span>${item.name}</span>
                        <span class="top-product-sales">${item.qty} uds <span class="muted-text">(${this.formatMoney(item.revenue)})</span></span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentSalesList(salesList) {
        const tbody = document.getElementById('recent-sales-tbody');
        const recentSales = [...salesList].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        if (recentSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center muted-text py-4">No hay ventas registradas en este período.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recentSales.map(sale => {
            const date = new Date(sale.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const itemsSummary = sale.items.map(i => `${i.qty}x ${i.name.split(' ')[0]}`).join(', ');

            return `
                <tr style="cursor:pointer;" onclick="app.showSaleDetail('${sale.id}')">
                    <td><strong>#${sale.id.split('-')[1].substring(4)}</strong></td>
                    <td>${formattedDate}</td>
                    <td class="text-truncate" style="max-width: 140px;">${itemsSummary}</td>
                    <td><span class="badge badge-success">${this.formatMoney(sale.total)}</span></td>
                </tr>
            `;
        }).join('');
    }

    // --- PRODUCTS MANAGEMENT & VALUATION ---

    renderProductsTable() {
        const tbody = document.getElementById('products-tbody');
        const searchQuery = document.getElementById('product-search').value.toLowerCase();
        const stockFilter = document.getElementById('product-filter-stock').value;

        // Filter products list
        const filteredProducts = this.products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.code.toLowerCase().includes(searchQuery);
            
            let matchesStock = true;
            if (stockFilter === 'low') {
                matchesStock = parseInt(p.stock) <= 5;
            } else if (stockFilter === 'out') {
                matchesStock = parseInt(p.stock) === 0;
            }

            return matchesSearch && matchesStock;
        });

        // 1. Calculate and update Total Inventory Valuation Metrics
        let totalValCost = 0;
        let totalValPrice = 0;

        this.products.forEach(p => {
            const stock = parseInt(p.stock) || 0;
            const cost = parseFloat(p.cost !== undefined ? p.cost : p.price * 0.6) || 0;
            const price = parseFloat(p.price) || 0;

            totalValCost += cost * stock;
            totalValPrice += price * stock;
        });

        const totalValProfit = totalValPrice - totalValCost;

        // Render valuation elements
        const valCostEl = document.getElementById('val-total-costo');
        const valPriceEl = document.getElementById('val-total-venta');
        const valProfitEl = document.getElementById('val-total-ganancia');

        if (valCostEl) valCostEl.innerText = this.formatMoney(totalValCost);
        if (valPriceEl) valPriceEl.innerText = this.formatMoney(totalValPrice);
        if (valProfitEl) valProfitEl.innerText = this.formatMoney(totalValProfit);

        // 2. Render Products list table rows
        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center muted-text py-4">No se encontraron productos en el inventario.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredProducts.map(p => {
            const stock = parseInt(p.stock);
            let badgeClass = 'badge-success';
            let statusText = 'Disponible';

            if (stock === 0) {
                badgeClass = 'badge-danger';
                statusText = 'Sin Stock';
            } else if (stock <= 5) {
                badgeClass = 'badge-warning';
                statusText = 'Stock Bajo';
            }

            // Calculations per product row
            const costVal = parseFloat(p.cost !== undefined ? p.cost : p.price * 0.6);
            const priceVal = parseFloat(p.price);
            const profit = priceVal - costVal;
            const margin = priceVal > 0 ? (profit / priceVal) * 100 : 0;

            return `
                <tr>
                    <td><code>${p.code}</code></td>
                    <td>
                        <strong>${p.name}</strong><br>
                        <span class="muted-text" style="font-size:0.82rem;">${p.description || 'Sin descripción'}</span>
                    </td>
                    <td>${p.category || 'General'}</td>
                    <td>
                        <span class="muted-text" style="font-size:0.75rem;">Compra:</span> ${this.formatMoney(costVal)}<br>
                        <span class="muted-text" style="font-size:0.75rem;">Venta:</span> <strong>${this.formatMoney(priceVal)}</strong>
                    </td>
                    <td>
                        <span style="color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
                            ${margin.toFixed(1)}%
                        </span><br>
                        <span class="muted-text" style="font-size:0.75rem;">+${this.formatMoney(profit)}</span>
                    </td>
                    <td><strong>${p.stock}</strong> unidades</td>
                    <td><span class="badge ${badgeClass}">${statusText}</span></td>
                    <td>
                        <div class="btn-action-group">
                            <button class="btn-action edit" onclick="app.openProductModal('${p.id}')" title="Editar">
                                <i data-lucide="edit-3"></i>
                            </button>
                            <button class="btn-action delete" onclick="app.deleteProduct('${p.id}')" title="Eliminar">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-form');
        const title = document.getElementById('modal-title');
        
        form.reset();
        document.getElementById('form-product-id').value = '';

        if (productId) {
            // Edit mode
            title.innerText = 'Editar Producto';
            const product = this.products.find(p => p.id === productId);
            if (product) {
                document.getElementById('form-product-id').value = product.id;
                document.getElementById('prod-code').value = product.code;
                document.getElementById('prod-name').value = product.name;
                document.getElementById('prod-desc').value = product.description;
                document.getElementById('prod-category').value = product.category || 'General';
                document.getElementById('prod-cost').value = product.cost !== undefined ? product.cost : (product.price * 0.6).toFixed(2);
                document.getElementById('prod-price').value = product.price;
                document.getElementById('prod-stock').value = product.stock;
            }
        } else {
            // Add mode
            title.innerText = 'Agregar Producto';
            this.isCodeManuallyEdited = false;
            // Suggest automatic SKU code
            document.getElementById('prod-code').value = 'PROD-' + String(this.products.length + 1).padStart(3, '0');
        }

        modal.classList.add('show');
    }

    closeProductModal() {
        document.getElementById('product-modal').classList.remove('show');
    }

    handleProductFormSubmit(e) {
        e.preventDefault();

        const id = document.getElementById('form-product-id').value;
        const code = document.getElementById('prod-code').value.trim();
        const name = document.getElementById('prod-name').value.trim();
        const description = document.getElementById('prod-desc').value.trim();
        const category = document.getElementById('prod-category').value;
        const cost = parseFloat(document.getElementById('prod-cost').value);
        const price = parseFloat(document.getElementById('prod-price').value);
        const stock = parseInt(document.getElementById('prod-stock').value);

        // Validation for unique SKU codes
        const codeExists = this.products.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== id);
        if (codeExists) {
            this.showToast('El código SKU ya existe en el inventario', 'danger');
            return;
        }

        if (cost > price) {
            this.showToast('Nota: El precio de compra supera al precio de venta', 'warning');
        }

        if (id) {
            // Edit existing product
            const index = this.products.findIndex(p => p.id === id);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], code, name, description, category, cost, price, stock };
                this.showToast('Producto actualizado en el inventario', 'success');
            }
        } else {
            // Create new product
            const newProduct = {
                id: 'p-' + Date.now(),
                code,
                name,
                description,
                category,
                cost,
                price,
                stock
            };
            this.products.push(newProduct);
            this.showToast('Producto guardado en el inventario', 'success');
        }

        this.saveProducts();
        this.closeProductModal();
        this.renderAll();
    }

    deleteProduct(id) {
        const p = this.products.find(item => item.id === id);
        if (!p) return;

        if (confirm(`¿Estás seguro de que deseas eliminar el producto "${p.name}"?`)) {
            this.products = this.products.filter(item => item.id !== id);
            this.cart = this.cart.filter(item => item.id !== id); // clean from active carts
            
            this.saveProducts();
            this.renderAll();
            this.showToast('Producto eliminado', 'warning');
        }
    }

    // --- SALES GRID & CART ---

    renderSalesGrid() {
        const grid = document.getElementById('picker-grid-container');
        const searchQuery = document.getElementById('sales-product-search').value.toLowerCase();

        const availableProducts = this.products.filter(p => 
            p.name.toLowerCase().includes(searchQuery) || p.code.toLowerCase().includes(searchQuery)
        );

        if (availableProducts.length === 0) {
            grid.innerHTML = `<p class="muted-text text-center py-4 w-100">No se encontraron productos disponibles.</p>`;
            return;
        }

        grid.innerHTML = availableProducts.map(p => {
            const stock = parseInt(p.stock);
            const isOutOfStock = stock === 0;

            let stockText = `${stock} disponibles`;
            let stockClass = '';

            if (isOutOfStock) {
                stockText = 'Agotado';
                stockClass = 'out';
            } else if (stock <= 5) {
                stockText = `¡Solo ${stock} en stock!`;
                stockClass = 'low';
            }

            return `
                <div class="picker-card ${isOutOfStock ? 'out-of-stock' : ''}" 
                     onclick="${isOutOfStock ? '' : `app.addToCart('${p.id}')`}">
                    <span class="picker-category">${p.category || 'General'}</span>
                    <span class="picker-name" title="${p.name}">${p.name}</span>
                    <span class="picker-price">${this.formatMoney(p.price)}</span>
                    <span class="picker-stock ${stockClass}">${stockText}</span>
                </div>
            `;
        }).join('');
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const stockLimit = parseInt(product.stock);
        if (stockLimit <= 0) {
            this.showToast('Este producto está agotado', 'danger');
            return;
        }

        const cartItemIndex = this.cart.findIndex(item => item.id === productId);

        if (cartItemIndex !== -1) {
            if (this.cart[cartItemIndex].qty < stockLimit) {
                this.cart[cartItemIndex].qty++;
                this.showToast('Cantidad incrementada en el carrito', 'success');
            } else {
                this.showToast(`Stock límite alcanzado (${stockLimit} unidades)`, 'warning');
            }
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                qty: 1
            });
            this.showToast('Producto agregado al carrito', 'success');
        }

        this.renderCart();
    }

    renderCart() {
        const container = document.getElementById('cart-items-container');
        
        if (this.cart.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-message">
                    <i data-lucide="shopping-cart" class="empty-icon"></i>
                    <p>El carrito está vacío</p>
                    <span class="muted-text">Agrega productos desde el panel de la derecha</span>
                </div>
            `;
            document.getElementById('cart-subtotal').innerText = this.formatMoney(0);
            document.getElementById('cart-tax').innerText = this.formatMoney(0);
            document.getElementById('cart-total').innerText = this.formatMoney(0);
            document.getElementById('btn-complete-sale').disabled = true;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        container.innerHTML = this.cart.map(item => {
            const product = this.products.find(p => p.id === item.id);
            const maxStock = product ? parseInt(product.stock) : 999;
            const itemTotal = item.price * item.qty;

            return `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">${this.formatMoney(item.price)} c/u</span>
                    </div>
                    <div class="cart-item-qty">
                        <button class="btn-action" onclick="app.updateCartQty('${item.id}', ${item.qty - 1})">
                            <i data-lucide="minus"></i>
                        </button>
                        <input type="number" class="cart-qty-input form-control" 
                               min="1" max="${maxStock}" value="${item.qty}"
                               onchange="app.updateCartQty('${item.id}', this.value)">
                        <button class="btn-action" onclick="app.updateCartQty('${item.id}', ${item.qty + 1})">
                            <i data-lucide="plus"></i>
                        </button>
                    </div>
                    <div class="cart-item-total">${this.formatMoney(itemTotal)}</div>
                    <button class="btn-action delete" onclick="app.removeFromCart('${item.id}')" title="Quitar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Calculate total (no tax/IVA)
        let total = 0;
        this.cart.forEach(item => {
            total += item.price * item.qty;
        });

        document.getElementById('cart-total').innerText = this.formatMoney(total);
        document.getElementById('btn-complete-sale').disabled = false;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateCartQty(productId, newQtyString) {
        const qty = parseInt(newQtyString);
        if (isNaN(qty) || qty < 1) {
            this.removeFromCart(productId);
            return;
        }

        const product = this.products.find(p => p.id === productId);
        const maxStock = product ? parseInt(product.stock) : 999;
        
        const cartIndex = this.cart.findIndex(item => item.id === productId);
        if (cartIndex === -1) return;

        if (qty <= maxStock) {
            this.cart[cartIndex].qty = qty;
        } else {
            this.cart[cartIndex].qty = maxStock;
            this.showToast(`Stock máximo alcanzado (${maxStock} unidades)`, 'warning');
        }

        this.renderCart();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
        this.showToast('Producto quitado del carrito', 'info');
    }

    clearCart() {
        if (this.cart.length === 0) return;
        if (confirm('¿Deseas vaciar los productos del carrito?')) {
            this.cart = [];
            this.renderCart();
            this.showToast('Carrito vaciado', 'info');
        }
    }

    editSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;
        // Restore stock from the original sale
        sale.items.forEach(item => {
            const prodIdx = this.products.findIndex(p => p.id === item.id);
            if (prodIdx !== -1) {
                this.products[prodIdx].stock = (parseInt(this.products[prodIdx].stock) + item.qty).toString();
            }
        });
        // Load items into cart for editing
        this.cart = sale.items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: item.qty
        }));
        this.editingSaleId = saleId;
        this.renderCart();
        this.showToast('Venta cargada para editar. Modifica y guarda.', 'info');
        // Switch to sales tab
        this.switchTab('ventas');
    }

    completeSale() {
        if (this.cart.length === 0) return;
        const finalItems = [];
        let error = false;
        // Verify stock limit on checkout
        this.cart.forEach(cartItem => {
            const productIndex = this.products.findIndex(p => p.id === cartItem.id);
            if (productIndex !== -1) {
                const stockLeft = this.products[productIndex].stock - cartItem.qty;
                if (stockLeft < 0) {
                    this.showToast(`Stock insuficiente para "${cartItem.name}"`, 'danger');
                    error = true;
                }
            } else {
                this.showToast(`El producto "${cartItem.name}" ya no existe`, 'danger');
                error = true;
            }
        });
        if (error) return;
        // Deduct quantities and build final invoice products
        this.cart.forEach(cartItem => {
            const productIndex = this.products.findIndex(p => p.id === cartItem.id);
            let itemCost = cartItem.price * 0.6; // Default fallback
            if (productIndex !== -1) {
                this.products[productIndex].stock -= cartItem.qty;
                itemCost = parseFloat(this.products[productIndex].cost !== undefined ? this.products[productIndex].cost : cartItem.price * 0.6);
            }
            finalItems.push({
                id: cartItem.id,
                name: cartItem.name,
                price: cartItem.price,
                cost: itemCost,
                qty: cartItem.qty
            });
        });
        let total = 0;
        finalItems.forEach(item => {
            total += item.price * item.qty;
        });
        const paymentMethod = 'Efectivo';
        // Create Sale
        const newSale = {
            id: 'V-' + Date.now(),
            timestamp: new Date().toISOString(),
            items: finalItems,
            subtotal: total,
            tax: 0,
            total,
            paymentMethod
        };
        // If editing, remove old sale first
        if (this.editingSaleId) {
            this.sales = this.sales.filter(s => s.id !== this.editingSaleId);
            this.editingSaleId = null;
        }
        this.sales.push(newSale);
        this.saveProducts();
        this.saveSales();
        this.clearCart();
        this.renderAll();
        this.showToast('Venta registrada', 'success');
    }

    // --- SALES HISTORY LOG ---

    renderSalesHistory() {
        const tbody = document.getElementById('history-tbody');
        const filterDate = document.getElementById('history-filter-date').value;

        const filteredSales = this.sales.filter(sale => {
            if (!filterDate) return true;
            return sale.timestamp.startsWith(filterDate);
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filteredSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center muted-text py-4">No se encontraron registros de ventas.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredSales.map(sale => {
            const date = new Date(sale.timestamp);
            const dateStr = date.toLocaleDateString();
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const itemsStr = sale.items.map(i => `${i.qty}x ${i.name}`).join('<br>');

            return `
                <tr>
                    <td><strong>#${sale.id.split('-')[1].substring(4)}</strong></td>
                    <td>${dateStr}<br><span class="muted-text">${timeStr}</span></td>
                    <td style="font-size: 0.85rem; max-width: 280px; overflow: hidden; text-overflow: ellipsis;">
                        ${itemsStr}
                    </td>
                    <td>${sale.paymentMethod || 'Efectivo'}</td>
                    <td><strong>${this.formatMoney(sale.total)}</strong></td>
                    <td>
                        <div class="btn-action-group">
                            <button class="btn btn-outline btn-sm" onclick="app.showSaleDetail('${sale.id}')">
                                <i data-lucide="receipt"></i> Detalle
                            </button>
                            <button class="btn btn-sm" style="background:var(--primary-light);color:var(--primary);border:1px solid var(--primary);" onclick="app.editSale('${sale.id}')" title="Editar venta">
                                <i data-lucide="edit-2"></i> Editar
                            </button>
                            <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:1px solid var(--danger);" onclick="app.deleteSale('${sale.id}')" title="Eliminar venta">
                                <i data-lucide="trash-2"></i> Eliminar
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    deleteSale(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;

        const fecha = new Date(sale.timestamp).toLocaleDateString();
        const totalStr = this.formatMoney(sale.total);

        if (!confirm(`¿Eliminar la venta del ${fecha} por ${totalStr}?\n\nEl stock de los productos se devolverá al inventario.`)) return;

        // Restore stock for each item in the deleted sale
        sale.items.forEach(item => {
            const productIndex = this.products.findIndex(p => p.id === item.id);
            if (productIndex !== -1) {
                this.products[productIndex].stock += item.qty;
            }
        });

        // Remove the sale from the list
        this.sales = this.sales.filter(s => s.id !== saleId);

        this.saveProducts();
        this.saveSales();
        this.renderAll();
        this.showToast('Venta eliminada y stock restaurado', 'success');
    }

    showSaleDetail(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;

        const modal = document.getElementById('sale-detail-modal');
        const date = new Date(sale.timestamp);
        
        document.getElementById('receipt-id').innerText = `#VENTA-${saleId.split('-')[1]}`;
        document.getElementById('receipt-date').innerText = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        document.getElementById('receipt-subtotal').innerText = this.formatMoney(sale.subtotal);
        document.getElementById('receipt-tax').innerText = this.formatMoney(sale.tax);
        document.getElementById('receipt-total').innerText = this.formatMoney(sale.total);
        document.getElementById('receipt-payment-method').innerText = sale.paymentMethod || 'Efectivo';

        // Render receipt items
        const itemsContainer = document.getElementById('receipt-items-container');
        itemsContainer.innerHTML = sale.items.map(item => `
            <div class="receipt-item-row">
                <span>${item.qty}x ${item.name}</span>
                <span>${this.formatMoney(item.price * item.qty)}</span>
            </div>
        `).join('');

        modal.classList.add('show');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- CSV EXPORT UTILITY ---

    exportSalesToCSV() {
        if (this.sales.length === 0) {
            this.showToast('No hay ventas registradas para exportar', 'warning');
            return;
        }

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += 'ID Venta,Fecha,Metodo de Pago,Productos,Monto Total\n';

        this.sales.forEach(sale => {
            const date = new Date(sale.timestamp).toLocaleString().replace(/,/g, '');
            const itemsStr = sale.items.map(i => `${i.qty}x ${i.name}`).join(' | ');
            csvContent += `"${sale.id}","${date}","${sale.paymentMethod}","${itemsStr.replace(/"/g, '""')}","${sale.total.toFixed(2)}"\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `Reporte_Ventas_Monarca_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);

        link.click();
        document.body.removeChild(link);
        this.showToast('Reporte CSV descargado con éxito', 'success');
    }

    // --- DATABASE BACKUP & RESTORE ---

    backupData() {
        const backup = {
            products: this.products,
            sales: this.sales,
            owner: localStorage.getItem('sv_owner') || 'Administrador',
            theme: localStorage.getItem('sv_theme') || 'dark'
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `Copia_Seguridad_Inventario_Monarca_${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.showToast('Copia de seguridad descargada correctamente', 'success');
    }

    restoreData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported.products) && Array.isArray(imported.sales)) {
                    this.products = imported.products;
                    this.sales = imported.sales;
                    
                    if (imported.owner) localStorage.setItem('sv_owner', imported.owner);
                    if (imported.theme) localStorage.setItem('sv_theme', imported.theme);
                    
                    this.saveProducts();
                    this.saveSales();
                    this.renderAll();
                    
                    // Reload owner name input
                    const ownerEl = document.getElementById('owner-name');
                    if (ownerEl && imported.owner) {
                        ownerEl.value = imported.owner;
                        this.updateOwnerAvatar(imported.owner);
                    }
                    
                    this.showToast('Base de datos restaurada con éxito', 'success');
                } else {
                    this.showToast('El archivo de respaldo no tiene un formato válido', 'danger');
                }
            } catch (err) {
                this.showToast('Error al leer el archivo de copia de seguridad', 'danger');
            }
        };
        reader.readAsText(file);
    }

    // --- TOAST SYSTEM ---

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'warning') iconName = 'alert-triangle';
        if (type === 'danger') iconName = 'x-circle';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => {
                toast.remove();
                if (container.children.length === 0) {
                    container.remove();
                }
            });
        }, 3000);
    }

    getInitials(name) {
        if (!name) return 'PROD';
        const stopwords = ['de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'con', 'sin', 'para', 'por', 'y', 'a', 'en', 'o', 'u'];
        const words = name.trim().split(/\s+/);
        const initials = words
            .filter(w => !stopwords.includes(w.toLowerCase()))
            .map(w => w.charAt(0))
            .join('')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
        return initials || 'PROD';
    }
}

// Instantiate App globally
window.app = new InventoryApp();
