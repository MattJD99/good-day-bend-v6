const axios = require('axios');
const CONFIG = require('../config');

class GHL {
    constructor() {
        this.baseUrl = 'https://services.leadconnectorhq.com';
        this.headers = {
            'Authorization': `Bearer ${CONFIG.GHL_KEY}`,
            'Version': '2021-07-28',
            'Location-Id': CONFIG.LOCATION_ID,
            'Content-Type': 'application/json'
        };
    }

    async createBlogPost(payload) {
        const defaultPayload = {
            locationId: CONFIG.LOCATION_ID,
            status: "PUBLISHED",
            author: CONFIG.AUTHOR_ID,
            publishedAt: new Date().toISOString()
        };

        const finalPayload = { ...defaultPayload, ...payload };

        try {
            const response = await axios.post(`${this.baseUrl}/blogs/posts`, finalPayload, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error("GHL Publish Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
    async upsertContact(payload) {
        // payload should have email, firstName, lastName, tags, etc.
        try {
            const finalPayload = { locationId: CONFIG.LOCATION_ID, ...payload };
            const response = await axios.post(`${this.baseUrl}/contacts/`, finalPayload, { headers: this.headers });
            return response.data;
        } catch (error) {
            // Handle "This location does not allow duplicated contacts" error
            if (error.response && error.response.status === 400 && error.response.data.meta && error.response.data.meta.contactId) {
                console.log(`ℹ️ Contact exists. Using ID: ${error.response.data.meta.contactId}`);
                return { contact: { id: error.response.data.meta.contactId } };
            }
            console.error("GHL Contact Upsert Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }
    async sendEmail(payload) {
        /**
         * GHL V2 Email via Conversations
         * Docs: https://highlevel.stoplight.io/docs/integrations/00926d913bc61-create-outbound-message
         */
        try {
            const finalPayload = {
                type: "Email",
                contactId: payload.contactId,
                subject: payload.subject,
                html: payload.html || "",
                message: payload.message || " "  // Ensure not empty
            };

            const response = await axios.post(`${this.baseUrl}/conversations/messages`, finalPayload, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error("❌ GHL Email Error:", error.response ? JSON.stringify(error.response.data) : error.message);
            // Fallback: Heavy log for debugging
            console.log("📝 Fallback Email Data (for Manual Send):", JSON.stringify(payload, null, 2));
        }
    }

    /**
     * Search for contacts by query or tag
     * @param {string} query - Search term (name, email, phone)
     * @returns {Promise<Array>} List of contacts
     */
    async getSocialAccounts() {
        try {
            const response = await axios.get(`${this.baseUrl}/social-media-posting/oauth/accounts?locationId=${CONFIG.LOCATION_ID}`, { headers: this.headers });
            return response.data || [];
        } catch (error) {
            console.error("GHL Social Accounts Error:", error.response ? error.response.data : error.message);
            return [];
        }
    }

    async createSocialPost(payload) {
        // payload: { accountIds: [], content: "", media: [{url: ""}] }
        try {
            const response = await axios.post(`${this.baseUrl}/social-media-posting/posts`, {
                locationId: CONFIG.LOCATION_ID,
                ...payload
            }, { headers: this.headers });
            return response.data;
        } catch (error) {
            console.error("GHL Social Post Error:", error.response ? error.response.data : error.message);
            throw error;
        }
    }

    // Existing getContacts...
    async getContacts(query = '') {
        try {
            // Note: detailed filtering often requires a different endpoint or params in GHL
            // We'll use the basic search param if available, or just fetch recent and filter manually if API is limited.
            // Standard GHL API v1/v2 user /contacts/lookup?q=... or /contacts/?query=...

            const response = await axios.get(`${this.baseUrl}/contacts/?query=${encodeURIComponent(query)}&locationId=${CONFIG.LOCATION_ID}`, { headers: this.headers });

            // GHL returns { contacts: [...] }
            return response.data.contacts || [];
        } catch (error) {
            console.error("GHL Get Contacts Error:", error.response ? error.response.data : error.message);
            return [];
        }
    }
}

module.exports = new GHL();
