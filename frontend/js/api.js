const API_BASE_URL = "/api/v1";

// Demo customer
// Your existing orders were created with this customer.
const customerId = "customer-1001";

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",
                "X-Customer-Id": customerId,
                ...(options.headers || {})
            }
        }
    );

    const contentType =
        response.headers.get("content-type") || "";

    const data =
        contentType.includes("application/json")
            ? await response.json()
            : null;

    if (!response.ok) {
        throw new Error(
            data?.message || "Request failed"
        );
    }

    return data;
}
