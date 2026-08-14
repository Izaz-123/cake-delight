const ordersElement = document.getElementById("orders");

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

function money(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
}

async function loadOrders() {
    try {
        const response = await apiRequest("/orders");
        const orders = response.content || (Array.isArray(response) ? response : []);

        if (orders.length === 0) {
            ordersElement.innerHTML = `
                <div class="empty">
                    <h3>No orders found 📦</h3>
                    <p style="margin: 16px 0;">You haven't placed any orders yet.</p>
                    <a href="cakes.html" class="button">Browse Cakes 🎂</a>
                </div>
            `;
            return;
        }

        ordersElement.innerHTML = orders.map(order => {
            const statusClass = `badge-${(order.status || "pending").toLowerCase()}`;

            const placedAt = order.placedAt
                ? new Date(order.placedAt).toLocaleString()
                : "N/A";

            const items = (order.items || []).map(item => `
                <li>
                    <span>${escapeHtml(item.cakeName)} × ${item.quantity}</span>
                    <span>${money(item.lineTotal)}</span>
                </li>
            `).join("");

            return `
                <div class="card order-card">
                    <div class="order-header">
                        <div>
                            <h3>Order #${escapeHtml(order.orderNumber)}</h3>
                            <span class="order-meta">Placed on ${placedAt}</span>
                        </div>
                        <span class="badge ${statusClass}">${escapeHtml(order.status)}</span>
                    </div>

                    <div class="order-body">
                        <p><strong>Delivery Address:</strong>
                           ${escapeHtml(order.deliveryAddress || "N/A")}</p>

                        ${items ? `
                            <strong>Items Purchased:</strong>
                            <ul class="order-items">${items}</ul>
                        ` : ""}
                    </div>

                    <div class="order-footer">
    <div class="price">
        Total: ${money(order.total)}
    </div>

    <a href="ratings.html" class="rate-button">
         Rate Purchases
    </a>
</div>
                </div>
            `;
        }).join("");

    } catch (error) {
        console.error("Failed to load orders:", error);
        ordersElement.innerHTML = `
            <div class="empty">
                <h3>Failed to load orders</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

loadOrders();
