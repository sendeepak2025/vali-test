import { toast } from "react-toastify";
import { apiConnector } from "../apiConnector";

const BASE_URL = import.meta.env.VITE_APP_BASE_URL;

// Notification API endpoints
const NOTIFICATIONS_API = BASE_URL + "/notifications";

/**
 * Get user's notifications with pagination and filters
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.type - Filter by notification type
 * @param {boolean} params.unreadOnly - Filter to unread only
 * @param {string} token - Auth token
 */
export const getNotificationsAPI = async (params = {}, token) => {
  try {
    const response = await apiConnector(
      "GET",
      NOTIFICATIONS_API,
      null,
      { Authorization: `Bearer ${token}` },
      params
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch notifications");
    }

    return response?.data;
  } catch (error) {
    console.error("GET NOTIFICATIONS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch notifications!");
    return { notifications: [], pagination: {} };
  }
};

/**
 * Get unread notification count
 * @param {string} token - Auth token
 */
export const getUnreadCountAPI = async (token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${NOTIFICATIONS_API}/unread-count`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch unread count");
    }

    return response?.data?.count || 0;
  } catch (error) {
    console.error("GET UNREAD COUNT API ERROR:", error);
    return 0;
  }
};

/**
 * Mark a single notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} token - Auth token
 */
export const markAsReadAPI = async (notificationId, token) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${NOTIFICATIONS_API}/${notificationId}/read`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to mark as read");
    }

    return response?.data;
  } catch (error) {
    console.error("MARK AS READ API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to mark notification as read!");
    return null;
  }
};

/**
 * Mark all notifications as read
 * @param {string} token - Auth token
 */
export const markAllAsReadAPI = async (token) => {
  try {
    const response = await apiConnector(
      "PUT",
      `${NOTIFICATIONS_API}/read-all`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to mark all as read");
    }

    toast.success("All notifications marked as read");
    return response?.data;
  } catch (error) {
    console.error("MARK ALL AS READ API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to mark all as read!");
    return null;
  }
};

/**
 * Delete a notification
 * @param {string} notificationId - Notification ID
 * @param {string} token - Auth token
 */
export const deleteNotificationAPI = async (notificationId, token) => {
  try {
    const response = await apiConnector(
      "DELETE",
      `${NOTIFICATIONS_API}/${notificationId}`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to delete notification");
    }

    toast.success("Notification deleted");
    return response?.data;
  } catch (error) {
    console.error("DELETE NOTIFICATION API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete notification!");
    return null;
  }
};
