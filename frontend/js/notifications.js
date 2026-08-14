const notificationsElement = document.getElementById("notifications");

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}

async function loadNotifications() {
    try {
        // Written by the Notification Service after it consumes the
        // order.completed event from RabbitMQ.
        const notifications = await apiRequest("/notifications");

        if (!notifications.length) {
            notificationsElement.innerHTML = `
                <div class="empty">
                    <h3>No notifications yet 🔔</h3>
                    <p>Order confirmation messages will appear here after checkout.</p>
                </div>`;
            return;
        }

        notificationsElement.innerHTML = notifications.map(notification => `
            <article class="card notification-card">
                <div class="notification-header">
                    <h3>${escapeHtml(notification.subject || "Order update")}</h3>
                    <span class="badge badge-${(notification.status || "pending").toLowerCase()}">
                        ${escapeHtml(notification.status)}
                    </span>
                </div>

                <p class="notification-message">${escapeHtml(notification.message)}</p>

                <small class="order-meta">
                    ${escapeHtml(notification.channel)} ·
                    ${new Date(notification.createdAt).toLocaleString()}
                </small>
            </article>`).join("");

    } catch (error) {
        notificationsElement.innerHTML = `
            <div class="empty">
                <h3>Could not load notifications</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>`;
    }
}

loadNotifications();
