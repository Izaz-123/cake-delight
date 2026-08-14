const basketElement = document.getElementById("basket");

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

async function loadBasket() {
    try {
        const basket = await apiRequest("/basket");

        if (!basket.items || basket.items.length === 0) {
            basketElement.innerHTML = `
                <div class="empty-basket">

    <div class="empty-basket-icon">
        🧁
    </div>

    <span class="empty-basket-label">
        YOUR BASKET IS WAITING
    </span>

    <h2>
        Your Basket is Empty
    </h2>

    <p>
        Looks like you haven't added any delicious cakes yet.
        <br>
        Explore our collection and find something sweet!
    </p>

    <a href="cakes.html" class="empty-basket-button">
        Browse Our Cakes
        <span>→</span>
    </a>

</div>
            `;
            return;
        }

        const rows = basket.items.map(item => `
            <tr>
                <td><strong>${escapeHtml(item.cakeName)}</strong></td>
                <td>${money(item.unitPrice)}</td>
                <td>
                    <input type="number" value="${item.quantity}" min="1" max="50"
                           class="quantity-input"
                           data-cake-id="${escapeHtml(item.cakeId)}">
                </td>
                <td>${money(item.lineTotal)}</td>
                <td>
                    <button class="button danger remove-button"
                            data-cake-id="${escapeHtml(item.cakeId)}">
                        Remove
                    </button>
                </td>
            </tr>
        `).join("");

        basketElement.innerHTML = `
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Cake</th>
                            <th>Unit Price</th>
                            <th>Quantity</th>
                            <th>Total</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>

            <div class="basket-actions">
                <button class="button secondary" id="clearBasketButton">
                    Clear Basket
                </button>

                <div class="card summary-card">
                    <div class="summary-row">
                        <span>Subtotal</span>
                        <span>${money(basket.subtotal)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Delivery Fee</span>
                        <span>${money(basket.deliveryFee)}</span>
                    </div>
                    <div class="summary-row">
                        <span>Tax</span>
                        <span>${money(basket.tax)}</span>
                    </div>
                    <div class="summary-row summary-total">
                        <span>Total</span>
                        <span>${money(basket.total)}</span>
                    </div>
                    <button class="button full-button" id="checkoutButton">
                        Proceed to Checkout 
                    </button>
                </div>
            </div>

            <div id="checkoutFormContainer" class="card checkout-card" hidden>
                <h2>Checkout Details 📝</h2>

                <form id="checkoutForm">
                    <div class="checkout-grid">
                        <div>
                            <label for="custName">Full Name</label>
                            <input type="text" id="custName" required
                                   maxlength="160" placeholder="John Doe">
                        </div>
                        <div>
                            <label for="custEmail">Email</label>
                            <input type="email" id="custEmail" required
                                   placeholder="john@example.com">
                        </div>
                        <div>
                            <label for="custPhone">Phone Number</label>
                            <input type="text" id="custPhone"
                                   placeholder="+919999999999">
                        </div>
                    </div>
                    <br>
                    <label for="custAddress">Delivery Address</label>
                    <textarea id="custAddress" required rows="3"
                              placeholder="123 Baker Street, Sweet City"></textarea>

                    <label for="custNotes">Delivery Notes (optional)</label>
                    <input type="text" id="custNotes"
                           placeholder="Leave at reception">

                    <label>Notification Channels</label>
                    <div class="channel-options">
                        <label class="channel-option">
                            <input type="checkbox" id="chkEmail" checked> Email
                        </label>
                        <label class="channel-option">
                            <input type="checkbox" id="chkSMS"> SMS
                        </label>
                        <label class="channel-option">
                            <input type="checkbox" id="chkInApp" checked> In-App
                        </label>
                    </div>

                    <div class="checkout-buttons">
                        <button type="submit" class="button" id="placeOrderButton">
                            Place Order 
                        </button>
                        <button type="button" class="button secondary" id="cancelCheckout">
                            Cancel
                        </button>
                    </div>

                    <div id="checkoutResult"></div>
                </form>
            </div>
        `;

        wireBasketEvents();

    } catch (error) {
        basketElement.innerHTML = `
            <div class="empty">
                <h3>Failed to load basket</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>`;
    }
}

function wireBasketEvents() {
    basketElement.querySelectorAll(".quantity-input").forEach(input => {
        input.addEventListener("change", () =>
            updateItemQuantity(input.dataset.cakeId, input.value));
    });

    basketElement.querySelectorAll(".remove-button").forEach(button => {
        button.addEventListener("click", () =>
            removeItem(button.dataset.cakeId));
    });

    document.getElementById("clearBasketButton")
        .addEventListener("click", clearBasket);

    document.getElementById("checkoutButton")
        .addEventListener("click", showCheckoutForm);

    document.getElementById("cancelCheckout")
        .addEventListener("click", hideCheckoutForm);

    document.getElementById("checkoutForm")
        .addEventListener("submit", handleCheckoutSubmit);
}

async function updateItemQuantity(cakeId, quantity) {
    try {
        await apiRequest(`/basket/items/${cakeId}`, {
            method: "PUT",
            body: JSON.stringify({ quantity: Number(quantity) })
        });
        loadBasket();
    } catch (error) {
        alert(error.message);
        loadBasket();
    }
}

async function removeItem(cakeId) {
    try {
        await apiRequest(`/basket/items/${cakeId}`, { method: "DELETE" });
        loadBasket();
    } catch (error) {
        alert(error.message);
    }
}

async function clearBasket() {
    try {
        await apiRequest("/basket", { method: "DELETE" });
        loadBasket();
    } catch (error) {
        alert(error.message);
    }
}

function showCheckoutForm() {
    const container = document.getElementById("checkoutFormContainer");
    container.hidden = false;
    container.scrollIntoView({ behavior: "smooth" });
}

function hideCheckoutForm() {
    document.getElementById("checkoutFormContainer").hidden = true;
}

async function handleCheckoutSubmit(event) {
    event.preventDefault();

    const result = document.getElementById("checkoutResult");
    const submitButton = document.getElementById("placeOrderButton");

    const customerName = document.getElementById("custName").value.trim();
    const customerEmail = document.getElementById("custEmail").value.trim();
    const customerPhone = document.getElementById("custPhone").value.trim();
    const deliveryAddress = document.getElementById("custAddress").value.trim();
    const deliveryNotes = document.getElementById("custNotes").value.trim();

    const notificationChannels = [];
    if (document.getElementById("chkEmail").checked) notificationChannels.push("EMAIL");
    if (document.getElementById("chkInApp").checked) notificationChannels.push("IN_APP");

    // The Order Service rejects an SMS request without a phone number,
    // so only ask for the channel when one was actually supplied.
    if (document.getElementById("chkSMS").checked) {
        if (!customerPhone) {
            result.innerHTML = `<p class="form-error">
                Enter a phone number to receive SMS updates, or uncheck SMS.
            </p>`;
            return;
        }
        notificationChannels.push("SMS");
    }

    if (notificationChannels.length === 0) notificationChannels.push("EMAIL");

    submitButton.disabled = true;
    submitButton.textContent = "Placing order...";
    result.innerHTML = "";

    try {
        const order = await apiRequest("/orders/checkout", {
            method: "POST",
            body: JSON.stringify({
                customerName,
                customerEmail,
                customerPhone: customerPhone || undefined,
                deliveryAddress,
                deliveryNotes: deliveryNotes || undefined,
                notificationChannels
            })
        });

        result.innerHTML = `
    <div class="order-success">
        <div class="success-icon">✓</div>
        <h2>Order Successful!</h2>
        <p>Thank you for your order. Your cake is on its way! </p>
    </div>
`;

        setTimeout(() => {
            window.location.href = "orders.html";
        }, 900);

    } catch (error) {
        result.innerHTML =
            `<p class="form-error">Checkout failed: ${escapeHtml(error.message)}</p>`;

        submitButton.disabled = false;
        submitButton.textContent = "Place Order ";
    }
}

loadBasket();
