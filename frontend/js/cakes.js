const cakeGrid = document.getElementById("cakeGrid");
const categoryFilter = document.getElementById("categoryFilter");

const FALLBACK_IMAGE = "images/chocolate.png";

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
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR"
    }).format(Number(value || 0));
}

// Categories come from the catalogue itself so the filter never drifts
// away from the data the Catalog Service actually holds.
async function loadCategories() {
    try {
        const categories = await apiRequest("/cakes/categories");

        categories.forEach(category => {
            const option = document.createElement("option");
            option.value = category.value;
            option.textContent = category.label;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error("Failed to load categories:", error);
    }
}

async function loadCakes(filterParams = {}) {
    try {
        const queryParams = new URLSearchParams();
        if (filterParams.search) queryParams.append("search", filterParams.search);
        if (filterParams.category) queryParams.append("category", filterParams.category);
        if (filterParams.minPrice) queryParams.append("minPrice", filterParams.minPrice);
        if (filterParams.maxPrice) queryParams.append("maxPrice", filterParams.maxPrice);

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";
        const response = await apiRequest(`/cakes${queryString}`);

        let cakes = [];
        if (Array.isArray(response)) cakes = response;
        else if (Array.isArray(response.content)) cakes = response.content;

        cakeGrid.innerHTML = "";

        if (cakes.length === 0) {
            cakeGrid.innerHTML = `
                <div class="empty">
                    <h3>No cakes found 🎂</h3>
                    <p>Try adjusting your search filters.</p>
                </div>
            `;
            return;
        }

        cakes.forEach(cake => {
            const card = document.createElement("div");
            card.className = "cake-card";

            const avgRating = cake.averageRating
                ? `${cake.averageRating} (${cake.ratingCount || 0})`
                : "New";

            const imageUrl = cake.imageUrl || FALLBACK_IMAGE;
            const outOfStock = cake.available === false || Number(cake.stockQuantity) <= 0;

            card.innerHTML = `
                <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(cake.name)}"
                     onerror="this.src='${FALLBACK_IMAGE}'">
                <div class="cake-content">
                    <span class="rating-badge">${avgRating}</span>
                    <h3>${escapeHtml(cake.name)}</h3>
                    <p>${escapeHtml(cake.description || "Freshly baked handcrafted specialty cake.")}</p>

                    <div class="cake-footer">
                       <div class="price">${money(cake.price)}</div>
                        <button class="button" data-cake-id="${escapeHtml(cake.id)}"
                                ${outOfStock ? "disabled" : ""}>
                            ${outOfStock ? "Out of Stock" : "+ Add to Basket"}
                        </button>
                    </div>
                </div>
            `;

            const button = card.querySelector("button");

            if (!outOfStock) {
                button.addEventListener("click", () => addToBasket(cake.id, button));
            }

            cakeGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Failed to load cakes:", error);
        cakeGrid.innerHTML = `
            <div class="empty">
                <h3>Failed to load cakes</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

function applyFilters() {
    const search = document.getElementById("searchInput").value.trim();
    const category = categoryFilter.value;
    const minPrice = document.getElementById("minPrice").value;
    const maxPrice = document.getElementById("maxPrice").value;

    loadCakes({ search, category, minPrice, maxPrice });
}

function resetFilters() {
    document.getElementById("searchInput").value = "";
    categoryFilter.value = "";
    document.getElementById("minPrice").value = "";
    document.getElementById("maxPrice").value = "";

    loadCakes();
}

async function addToBasket(cakeId, button) {
    const originalText = button.textContent;

    button.disabled = true;
    button.textContent = "Adding...";

    try {
        await apiRequest("/basket/items", {
            method: "POST",
            body: JSON.stringify({
                cakeId: cakeId,
                quantity: 1
            })
        });

        button.textContent = "Added ✓";

        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1200);

    } catch (error) {
        console.error("Add to basket failed:", error);
        alert(error.message);

        button.textContent = originalText;
        button.disabled = false;
    }
}

document.getElementById("searchInput").addEventListener("keydown", event => {
    if (event.key === "Enter") applyFilters();
});

loadCategories();
loadCakes();
