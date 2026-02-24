import { CACHE } from "@/lib/config";
import { format } from "date-fns";

const UNISENDER_API_KEY = process.env.UNISENDER || process.env.UNISENDER_API_KEY;
const UNISENDER_FROM_EMAIL = process.env.UNISENDER_FROM_EMAIL || "no-reply@vetmed.ru";
const UNISENDER_FROM_NAME = process.env.UNISENDER_FROM_NAME || "VetMed";
const UNISENDER_LOGIN = process.env.UNISENDER_LOGIN;
const BASE_URL = "https://api.unisender.com/ru/api";

if (!UNISENDER_API_KEY) {
  console.warn("WARNING: Unisender API key not found in env (checked UNISENDER and UNISENDER_API_KEY)");
} else {
  console.log("Unisender API key loaded (length: " + UNISENDER_API_KEY.length + ")");
}

export interface UnisenderResult {
  result?: any;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * Basic wrapper for Unisender API
 * Docs: https://www.unisender.com/en/support/api/
 */
export const unisender = {
  /**
   * Make a request to Unisender API
   */
  async request(method: string, params: Record<string, any> = {}) {
    if (!UNISENDER_API_KEY) {
      console.warn("UNISENDER API key is not set");
      return { error: "API key missing" };
    }

    const url = `${BASE_URL}/${method}`;

    const body = new URLSearchParams();
    body.append("format", "json");
    body.append("api_key", UNISENDER_API_KEY);

    const appendParams = (data: any, prefix = "") => {
      for (const [key, value] of Object.entries(data)) {
        if (value === undefined || value === null) continue;

        const paramKey = prefix ? `${prefix}[${key}]` : key;

        if (typeof value === "object" && !Array.isArray(value)) {
          appendParams(value, paramKey);
        } else if (Array.isArray(value)) {
          value.forEach((v, i) => {
            // Arrays in unisender usually imply comma separated or repeated keys or indexed
            // For simple lists: join by comma often works, or key[i]
            // Let's try comma for simple types, indexed for objects
            if (typeof v === 'object') {
              appendParams(v, `${paramKey}[${i}]`);
            } else {
              // check if we should join or repeat. 
              // For list_ids, it is comma separated string usually.
              // But if specific array param needed, might differ.
              // We will assume string if simple array, unless keys.
              // Actually, safest is to handle known array fields specifically or use comma for now.
              // For this generic helper, let's just append normally?
              // URLSearchParams append adds multiple values for same key.
              // But Unisender often wants key[i] or csv.
              // Let's stick to what worked for subscribe (it does join manually).
              body.append(paramKey, String(v));
            }
          });
        } else {
          body.append(paramKey, String(value));
        }
      }
    };

    appendParams(params);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body,
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        console.error(`Unisender HTTP Error ${response.status} (${method}):`, text);
        return { error: `HTTP Error ${response.status}` };
      }

      const data = await response.json();

      if (data.error) {
        console.error(`Unisender API Error (${method}):`, data.error);
        const errorMessage = typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error);
        return { error: errorMessage, code: data.code, message: data.message };
      }

      return { result: data.result };
    } catch (error) {
      console.error(`Unisender Request Failed (${method}):`, error);
      return { error: error instanceof Error ? `Network error: ${error.message}` : "Network error" };
    }
  },

  /**
   * Subscribe an email to a list
   */
  async subscribe(email: string, listIds: string | string[], fields: Record<string, any> = {}) {
    const listIdsStr = Array.isArray(listIds) ? listIds.join(",") : listIds;

    // Prepare params
    const params: Record<string, any> = {
      list_ids: listIdsStr,
      double_optin: 3,
      overwrite: 2,
    };

    // Add fields properly formatted as fields[name]
    // Email is technically a field in 'subscribe' method context for Unisender?
    // Docs say: fields[email] is required.
    params["fields[email]"] = email;

    for (const [key, value] of Object.entries(fields)) {
      params[`fields[${key}]`] = value;
    }

    return this.request("subscribe", params);
  },

  /**
   * Send a single email (transactional or simple notification)
   */
  async sendEmail(email: string, subject: string, html: string, senderName = UNISENDER_FROM_NAME, senderEmail = UNISENDER_FROM_EMAIL) {
    return this.request("sendEmail", {
      email,
      sender_name: senderName,
      sender_email: senderEmail,
      subject,
      body: html,
      list_id: 1, // Optional but sometimes required
    });
  },

  /**
   * Create a campaign (newsletter)
   */
  async createCampaign(subject: string, html: string, listId: string, senderName = UNISENDER_FROM_NAME, senderEmail = UNISENDER_FROM_EMAIL) {
    // 1. Create message
    const messageRes = await this.request("createEmailMessage", {
      sender_name: senderName,
      sender_email: senderEmail,
      subject,
      body: html,
      list_id: listId,
    });

    if (messageRes.error) return messageRes;

    const messageId = messageRes.result.message_id;

    // 2. Create campaign
    const campaignRes = await this.request("createCampaign", {
      message_id: messageId,
      start_time: format(new Date(), "yyyy-MM-dd HH:mm"), // Format required: YYYY-MM-DD hh:mm
      track_read: 1,
      track_links: 1,
      // contacts parameter removed as it causes "list empty" error when message is already linked to list
    });

    return campaignRes;
  },

  /**
   * Get all lists
   */
  async getLists() {
    return this.request("getLists");
  },

  /**
   * Get common statistics for a campaign
   */
  async getCampaignCommonStats(campaignId: string) {
    return this.request("getCampaignCommonStats", { campaign_id: campaignId });
  },

  /**
   * Get campaign status
   */
  async getCampaignStatus(campaignId: string) {
    return this.request("getCampaignStatus", { campaign_id: campaignId });
  },

  /**
   * Get contact details
   */
  async getContact(email: string) {
    // Note: Unisender API method is actually 'getContact' or via export.
    // However, 'getContact' is not always documented in main reference, but 'checkEmail' might be?
    // Let's rely on 'exportContacts' with single email if getContact fails?
    // Actually, 'getContact' is valid.
    return this.request("getContact", { email });
  },

  /**
   * Get contact count
   * params: { list_id, status }
   * status: 'active' | 'inactive' | 'all' (default 'active' usually, but better specify)
   */
  async getContactCount(params: { list_id: string; status?: string } = { list_id: "", status: "active" }) {
    // API expects params[list_id], params[status], so we wrap it here
    // and let request() flattener handle it.
    return this.request("getContactCount", { params });
  },

  /**
   * Get total contacts count for account (requires login)
   * Docs: getTotalContactsCount expects login parameter
   */
  async getTotalContactsCount(login = UNISENDER_LOGIN) {
    if (!login) {
      return { error: "UNISENDER_LOGIN is not set" };
    }

    return this.request("getTotalContactsCount", { login });
  },

  /**
   * Export contacts (to get list of subscribers)
   * Note: This is an async operation in Unisender, might need a different approach for real-time list
   * or just use getTotalContacts count if simple list isn't available easily via API
   * For now, we'll try exportContacts which initiates a job.
   * A simpler way for a dashboard might be just getting the count or using 'getContacts' if available (it is deprecated/limited).
   * Let's use 'exportContacts' but since it's async, we might just stick to list size for now or assume we just want counts.
   * Actually, let's look for 'getProsprects' or similar? No.
   * 'exportContacts' returns a task_id.
   * For a simple admin view, maybe we just show total counts per list for now.
   */
  async getListSize(listId: string) {
    return this.getContactCount({ list_id: listId, status: "active" });
  }
};
