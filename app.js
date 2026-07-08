/**
 * Inventario Monarca - Application Controller
 * Handles state, local storage, UI rendering, sales cart, and dashboard analytics.
 */

class InventoryApp {
    constructor() {
        this.products = [];
        this.sales = [];
        this.cart = [];
        this.activeTab = 'dashboard';

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
        // Load data
        this.loadData();

        // Bind DOM events
        this.bindEvents();

        // Render initially
        this.switchTab('dashboard');
        this.renderAll();

        // Initialize Lucide Icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // --- DATA HANDLING ---

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

    updateOwnerAvatar(name) {
        const avatar = document.getElementById('owner-avatar');
        if (avatar && name) {
            const firstLetter = name.trim().charAt(0).toUpperCase();
            avatar.innerText = firstLetter || 'A';
        }
    }

    saveProducts() {
        localStorage.setItem('sv_products', JSON.stringify(this.products));
    }

    saveSales() {
        localStorage.setItem('sv_sales', JSON.stringify(this.sales));
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

        // Sales Panel Logic
        document.getElementById('sales-product-search').addEventListener('input', () => this.renderSalesGrid());
        document.getElementById('btn-clear-cart').addEventListener('click', () => this.clearCart());
        document.getElementById('btn-complete-sale').addEventListener('click', () => this.completeSale());

        // History Filters
        document.getElementById('history-filter-date').addEventListener('change', () => this.renderSalesHistory());
        document.getElementById('btn-clear-date-filter').addEventListener('click', () => {
            document.getElementById('history-filter-date').value = '';
            this.renderSalesHistory();
        });
        document.getElementById('btn-export-csv').addEventListener('click', () => this.exportSalesToCSV());

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
                break;
            case 'productos':
                pageTitle.innerText = 'Inventario';
                pageSubtitle.innerText = 'Gestiona, añade y edita tu catálogo de productos';
                break;
            case 'ventas':
                pageTitle.innerText = 'Registrar Venta';
                pageSubtitle.innerText = 'Añade artículos al carrito y factura en segundos';
                this.renderSalesGrid(); // Refresh grid state (stocks may have changed)
                break;
            case 'historial':
                pageTitle.innerText = 'Historial de Ventas';
                pageSubtitle.innerText = 'Consulta tus facturas registradas y exporta datos';
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
    }

    // --- DASHBOARD ANALYTICS ---

    renderDashboardStats() {
        // Income, sales count, stock counters
        const today = new Date().toISOString().split('T')[0];
        
        let ingresosTotales = 0;
        let totalCostosVentas = 0;
        let totalVentasHoy = 0;
        
        this.sales.forEach(sale => {
            ingresosTotales += sale.total;
            // Sum purchase costs of sold goods
            sale.items.forEach(item => {
                const itemCost = parseFloat(item.cost !== undefined ? item.cost : item.price * 0.6);
                totalCostosVentas += itemCost * item.qty;
            });
            if (sale.timestamp.startsWith(today)) {
                totalVentasHoy++;
            }
        });

        // We calculate net profit based on subtotal (revenue before tax) vs purchase costs
        let subtotalVentas = 0;
        this.sales.forEach(s => { subtotalVentas += s.subtotal; });
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
        document.getElementById('stat-ingresos').innerText = `$${ingresosTotales.toFixed(2)}`;
        document.getElementById('stat-ganancia').innerText = `$${gananciaNeta.toFixed(2)}`;
        document.getElementById('stat-ganancia-margin').innerText = `${margenPromedio.toFixed(1)}% Margen prom.`;
        document.getElementById('stat-ventas').innerText = this.sales.length;
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

        // Render Top Products List (Dashboard)
        this.renderTopProductsList();

        // Render Recent Sales (Dashboard)
        this.renderRecentSalesList();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    renderTopProductsList() {
        const container = document.getElementById('top-products-container');
        
        // Group quantities by product ID
        const productSales = {};
        this.sales.forEach(sale => {
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
            container.innerHTML = `<p class="muted-text text-center py-4">No hay datos de ventas hoy.</p>`;
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
                        <span class="top-product-sales">${item.qty} uds <span class="muted-text">($${item.revenue.toFixed(2)})</span></span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderRecentSalesList() {
        const tbody = document.getElementById('recent-sales-tbody');
        const recentSales = [...this.sales].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5);

        if (recentSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center muted-text py-4">No hay ventas registradas.</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = recentSales.map(sale => {
            const date = new Date(sale.timestamp);
            const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Generate list summary
            const itemsSummary = sale.items.map(i => `${i.qty}x ${i.name.split(' ')[0]}`).join(', ');

            return `
                <tr style="cursor:pointer;" onclick="app.showSaleDetail('${sale.id}')">
                    <td><strong>#${sale.id.substring(2, 8)}</strong></td>
                    <td>${formattedDate}</td>
                    <td class="text-truncate" style="max-width: 140px;">${itemsSummary}</td>
                    <td><span class="badge badge-success">$${sale.total.toFixed(2)}</span></td>
                </tr>
            `;
        }).join('');
    }

    // --- PRODUCTS MANAGEMENT (CRUD) ---

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

        if (filteredProducts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center muted-text py-4">No se encontraron productos que coincidan.</td>
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

            // Calculations
            const costVal = parseFloat(p.cost !== undefined ? p.cost : p.price * 0.6);
            const priceVal = parseFloat(p.price);
            const profit = priceVal - costVal;
            const margin = priceVal > 0 ? (profit / priceVal) * 100 : 0;

            return `
                <tr>
                    <td><code>${p.code}</code></td>
                    <td>
                        <strong>${p.name}</strong><br>
                        <span class="muted-text" style="font-size:0.85rem;">${p.description || 'Sin descripción'}</span>
                    </td>
                    <td>${p.category || 'General'}</td>
                    <td>
                        <span class="muted-text" style="font-size:0.75rem;">Compra:</span> $${costVal.toFixed(2)}<br>
                        <span class="muted-text" style="font-size:0.75rem;">Venta:</span> <strong>$${priceVal.toFixed(2)}</strong>
                    </td>
                    <td>
                        <span style="color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
                            ${margin.toFixed(1)}%
                        </span><br>
                        <span class="muted-text" style="font-size:0.75rem;">+$${profit.toFixed(2)}</span>
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

        // Validation for unique codes (exclude current edit id)
        const codeExists = this.products.some(p => p.code.toLowerCase() === code.toLowerCase() && p.id !== id);
        if (codeExists) {
            this.showToast('El código de producto o SKU ya existe', 'danger');
            return;
        }

        if (cost > price) {
            this.showToast('Nota: El precio de compra supera al precio de venta', 'warning');
        }

        if (id) {
            // Edit product
            const index = this.products.findIndex(p => p.id === id);
            if (index !== -1) {
                this.products[index] = { ...this.products[index], code, name, description, category, cost, price, stock };
                this.showToast('Producto actualizado correctamente', 'success');
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
            this.showToast('Producto agregado al catálogo', 'success');
        }

        this.saveProducts();
        this.closeProductModal();
        this.renderAll();
    }

    deleteProduct(id) {
        const p = this.products.find(item => item.id === id);
        if (!p) return;

        if (confirm(`¿Estás seguro de que quieres eliminar el producto "${p.name}" del inventario?`)) {
            this.products = this.products.filter(item => item.id !== id);
            // Also clean from active carts
            this.cart = this.cart.filter(item => item.id !== id);
            
            this.saveProducts();
            this.renderAll();
            this.showToast('Producto eliminado del catálogo', 'warning');
        }
    }

    // --- SALES INTERFACE & CART ---

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
                    <span class="picker-price">$${parseFloat(p.price).toFixed(2)}</span>
                    <span class="picker-stock ${stockClass}">${stockText}</span>
                </div>
            `;
        }).join('');
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Check if there is stock
        const stockLimit = parseInt(product.stock);
        if (stockLimit <= 0) {
            this.showToast('Este producto no tiene existencias en stock', 'danger');
            return;
        }

        const cartItemIndex = this.cart.findIndex(item => item.id === productId);

        if (cartItemIndex !== -1) {
            // Already in cart, verify stock limit
            if (this.cart[cartItemIndex].qty < stockLimit) {
                this.cart[cartItemIndex].qty++;
                this.showToast(`Cantidad incrementada en carrito`, 'success');
            } else {
                this.showToast(`Stock máximo alcanzado (${stockLimit} unidades)`, 'warning');
            }
        } else {
            // Add new cart item
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
            document.getElementById('cart-subtotal').innerText = '$0.00';
            document.getElementById('cart-tax').innerText = '$0.00';
            document.getElementById('cart-total').innerText = '$0.00';
            document.getElementById('btn-complete-sale').disabled = true;

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            return;
        }

        // Render cart list items
        container.innerHTML = this.cart.map(item => {
            const product = this.products.find(p => p.id === item.id);
            const maxStock = product ? parseInt(product.stock) : 999;
            const itemTotal = item.price * item.qty;

            return `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-price">$${item.price.toFixed(2)} c/u</span>
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
                    <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
                    <button class="btn-action delete" onclick="app.removeFromCart('${item.id}')" title="Quitar">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;
        }).join('');

        // Calculate checkout metrics (16% tax)
        let subtotal = 0;
        this.cart.forEach(item => {
            subtotal += item.price * item.qty;
        });

        const tax = subtotal * 0.16;
        const total = subtotal + tax;

        document.getElementById('cart-subtotal').innerText = `$${subtotal.toFixed(2)}`;
        document.getElementById('cart-tax').innerText = `$${tax.toFixed(2)}`;
        document.getElementById('cart-total').innerText = `$${total.toFixed(2)}`;
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
        this.showToast('Producto retirado del carrito', 'info');
    }

    clearCart() {
        if (this.cart.length === 0) return;
        if (confirm('¿Deseas vaciar todos los productos del carrito actual?')) {
            this.cart = [];
            this.renderCart();
            this.showToast('Carrito vaciado', 'info');
        }
    }

    completeSale() {
        if (this.cart.length === 0) return;

        // Deduct quantities from product stocks and record details
        const finalItems = [];
        let error = false;

        // Multi-stock validation before billing
        this.cart.forEach(cartItem => {
            const productIndex = this.products.findIndex(p => p.id === cartItem.id);
            if (productIndex !== -1) {
                const stockLeft = this.products[productIndex].stock - cartItem.qty;
                if (stockLeft < 0) {
                    this.showToast(`Stock insuficiente para "${cartItem.name}"`, 'danger');
                    error = true;
                }
            } else {
                this.showToast(`El producto "${cartItem.name}" ya no existe en el catálogo`, 'danger');
                error = true;
            }
        });

        if (error) return;

        // Execute billing & stock deduction
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
                cost: itemCost, // Preserve historic cost in the sale
                qty: cartItem.qty
            });
        });

        // Compute invoice sums
        let subtotal = 0;
        finalItems.forEach(item => {
            subtotal += item.price * item.qty;
        });
        const tax = subtotal * 0.16;
        const total = subtotal + tax;
        const paymentMethod = document.getElementById('payment-method').value;

        // Create Sale Entity
        const newSale = {
            id: 'V-' + Date.now(),
            timestamp: new Date().toISOString(),
            items: finalItems,
            subtotal,
            tax,
            total,
            paymentMethod
        };

        // Commit to store
        this.sales.push(newSale);
        this.saveProducts();
        this.saveSales();

        // Show invoice detail right away
        this.showSaleDetail(newSale.id);

        // Reset workspace
        this.cart = [];
        this.renderAll();
        this.showToast('¡Venta realizada con éxito!', 'success');
    }

    // --- SALES HISTORY LOG ---

    renderSalesHistory() {
        const tbody = document.getElementById('history-tbody');
        const filterDate = document.getElementById('history-filter-date').value;

        const filteredSales = this.sales.filter(sale => {
            if (!filterDate) return true;
            // Compare YYYY-MM-DD
            return sale.timestamp.startsWith(filterDate);
        }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (filteredSales.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center muted-text py-4">No se registraron ventas en esta fecha.</td>
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
                    <td><strong>#${sale.id.split('-')[1]}</strong></td>
                    <td>${dateStr}<br><span class="muted-text">${timeStr}</span></td>
                    <td style="font-size: 0.85rem; max-width: 280px; overflow: hidden; text-overflow: ellipsis;">
                        ${itemsStr}
                    </td>
                    <td>${sale.paymentMethod || 'Efectivo'}</td>
                    <td><strong>$${sale.total.toFixed(2)}</strong></td>
                    <td>
                        <button class="btn btn-outline btn-sm" onclick="app.showSaleDetail('${sale.id}')">
                            <i data-lucide="receipt"></i> Detalle
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    showSaleDetail(saleId) {
        const sale = this.sales.find(s => s.id === saleId);
        if (!sale) return;

        const modal = document.getElementById('sale-detail-modal');
        const date = new Date(sale.timestamp);
        
        document.getElementById('receipt-id').innerText = `#VENTA-${saleId.split('-')[1]}`;
        document.getElementById('receipt-date').innerText = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        document.getElementById('receipt-subtotal').innerText = `$${sale.subtotal.toFixed(2)}`;
        document.getElementById('receipt-tax').innerText = `$${sale.tax.toFixed(2)}`;
        document.getElementById('receipt-total').innerText = `$${sale.total.toFixed(2)}`;
        document.getElementById('receipt-payment-method').innerText = sale.paymentMethod || 'Efectivo';

        // Render receipt items
        const itemsContainer = document.getElementById('receipt-items-container');
        itemsContainer.innerHTML = sale.items.map(item => `
            <div class="receipt-item-row">
                <span>${item.qty}x ${item.name}</span>
                <span>$${(item.price * item.qty).toFixed(2)}</span>
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
        link.setAttribute('download', `Reporte_Ventas_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link); // Required for FF

        link.click();
        document.body.removeChild(link);
        this.showToast('Reporte CSV descargado con éxito', 'success');
    }

    // --- TOAST SYSTEM ---

    showToast(message, type = 'info') {
        // Create toast container if not exists
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

        // Remove toast animation triggers
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
}

// Instantiate App globally
const app = new InventoryApp();
