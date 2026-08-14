let purchasedCakes = [];

// cakeId -> cake name, so submitted ratings can be shown with a real title
// instead of the raw identifier stored by the Rating Service.
const cakeNames = new Map();


function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[character]));
}


// ============================================================
// LOAD PURCHASED CAKES
// ============================================================

async function loadPurchasedCakes() {

    const cakeSelect =
        document.getElementById("cakeSelect");

    cakeSelect.innerHTML =
        `<option value="">Loading cakes...</option>`;

    try {

        const data = await apiRequest("/orders");

        // The Order Service returns a page: { content: [...] }
        const orders =
            Array.isArray(data)
                ? data
                : (data.content || []);

        purchasedCakes = [];


        // ====================================================
        // COLLECT CAKES FROM COMPLETED ORDERS
        // ====================================================

        orders.forEach(order => {

            if (
                order.status !== "CONFIRMED" &&
                order.status !== "PREPARING" &&
                order.status !== "OUT_FOR_DELIVERY" &&
                order.status !== "DELIVERED"
            ) {
                return;
            }

            if (!Array.isArray(order.items)) {
                return;
            }

            order.items.forEach(item => {

                cakeNames.set(item.cakeId, item.cakeName);

                purchasedCakes.push({
                    cakeId: item.cakeId,
                    cakeName: item.cakeName,
                    orderId: order.id
                });

            });

        });


        cakeSelect.innerHTML = "";


        if (purchasedCakes.length === 0) {

            const option =
                document.createElement("option");

            option.value = "";

            option.textContent =
                "Place an order before rating a cake";

            cakeSelect.appendChild(option);

            return;
        }


        // ====================================================
        // REMOVE DUPLICATE CAKES (keep the most recent order)
        // ====================================================

        const uniqueCakes = [];

        purchasedCakes.forEach(cake => {

            const exists =
                uniqueCakes.find(
                    existing =>
                        existing.cakeId === cake.cakeId
                );

            if (!exists) {
                uniqueCakes.push(cake);
            }

        });

        purchasedCakes = uniqueCakes;


        uniqueCakes.forEach(cake => {

            const option =
                document.createElement("option");

            option.value = cake.cakeId;

            option.textContent = cake.cakeName;

            option.dataset.orderId = cake.orderId;

            cakeSelect.appendChild(option);

        });

    } catch (error) {

        console.error(
            "Could not load purchased cakes:",
            error
        );

        cakeSelect.innerHTML =
            `<option value="">Could not load purchased cakes</option>`;
    }
}


// ============================================================
// SUBMIT RATING
// ============================================================

async function submitRating() {

    const cakeSelect =
        document.getElementById("cakeSelect");

    const ratingScore =
        document.getElementById("ratingScore");

    const reviewText =
        document.getElementById("reviewText");

    const result =
        document.getElementById("result");


    const cakeId = cakeSelect.value;

    const stars = Number(ratingScore.value);

    const review = reviewText.value.trim();


    if (!cakeId) {

        result.innerHTML =
            `<p class="form-error">Please select a cake.</p>`;

        return;
    }


    const selectedOption =
        cakeSelect.options[cakeSelect.selectedIndex];

    const orderId = selectedOption.dataset.orderId;


    if (!orderId) {

        result.innerHTML =
            `<p class="form-error">Order information not found.</p>`;

        return;
    }


    try {

        // The Rating Service verifies the purchase with the Order Service
        // before it accepts the review.
        await apiRequest("/ratings", {
            method: "POST",
            body: JSON.stringify({
                cakeId,
                stars,
                review,
                orderId
            })
        });


        result.innerHTML =
            `<p class="form-success">Rating submitted successfully! ⭐</p>`;

        reviewText.value = "";

        await loadMyRatings();

    } catch (error) {

        console.error("Rating error:", error);

        result.innerHTML =
            `<p class="form-error">${escapeHtml(error.message)}</p>`;
    }
}


// ============================================================
// LOAD CUSTOMER RATINGS
// ============================================================

async function loadMyRatings() {

    const ratingsList =
        document.getElementById("ratingsList");

    ratingsList.innerHTML = `<p>Loading ratings...</p>`;


    try {

        const data = await apiRequest(
            `/ratings/customer/${encodeURIComponent(customerId)}?page=0&size=20`
        );

        const ratings =
            Array.isArray(data)
                ? data
                : (data.content || []);


        if (ratings.length === 0) {

            ratingsList.innerHTML = `
                <div class="card">
                    <h3>No Ratings Yet ⭐</h3>
                    <p>You haven't submitted any ratings yet.</p>
                </div>
            `;

            return;
        }


        ratingsList.innerHTML = ratings.map(rating => `
            <div class="card" style="margin-bottom: 15px; text-align: left;">
                <h3>${escapeHtml(cakeNames.get(rating.cakeId) || rating.cakeId)}</h3>
                <p>${"⭐".repeat(rating.stars)} ${rating.stars}/5</p>
                <p>${escapeHtml(rating.review || "No review")}</p>
                <small style="color:#94a3b8;">
                    ${new Date(rating.updatedAt || rating.createdAt).toLocaleString()}
                </small>
            </div>
        `).join("");

    } catch (error) {

        console.error("Could not load ratings:", error);

        ratingsList.innerHTML = `
            <div class="card">
                <p class="form-error">
                    Could not load ratings: ${escapeHtml(error.message)}
                </p>
            </div>
        `;
    }
}


// ============================================================
// PAGE LOAD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Purchased cakes are loaded first so rating cards can be
        // labelled with cake names.
        await loadPurchasedCakes();

        await loadMyRatings();

    }
);
