const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });
    } catch {
        throw new Error(
            "Cannot connect to the backend. Make sure the server is running."
        );
    }

    let result;

    try {
        result = await response.json();
    } catch {
        throw new Error("The server returned an invalid response.");
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Request failed.");
    }

    return result.data;
}

export const applicationService = {
    getAll: (filters = {}) => {
        const params = new URLSearchParams();

        if (filters.status) {
            params.set("status", filters.status);
        }

        if (filters.company) {
            params.set("company", filters.company);
        }

        const query = params.toString();

        return request(
            `/applications${query ? `?${query}` : ""}`
        );
    },

    getStats: () => request("/applications/stats"),

    getById: (id) => request(`/applications/${id}`),

    create: (data) =>
        request("/applications", {
            method: "POST",
            body: JSON.stringify(data)
        }),

    update: (id, data) =>
        request(`/applications/${id}`, {
            method: "PUT",
            body: JSON.stringify(data)
        }),

    changeStatus: (id, status) =>
        request(`/applications/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        }),

    delete: (id) =>
        request(`/applications/${id}`, {
            method: "DELETE"
        })
};