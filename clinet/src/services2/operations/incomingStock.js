import { toast } from "react-toastify";
import { apiConnector } from "../apiConnector";
import { incomingStockEndpoints } from "../apis";

const {
  GET_INCOMING_STOCK,
  GET_UNLINKED_INCOMING,
  ADD_INCOMING_STOCK,
  LINK_INCOMING_STOCK,
  BULK_LINK_INCOMING,
  RECEIVE_INCOMING_STOCK,
  DELETE_INCOMING_STOCK,
} = incomingStockEndpoints;

/**
 * Get incoming stock for a specific week
 */
export const getIncomingStockAPI = async (weekOffset = 0, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_INCOMING_STOCK}?weekOffset=${weekOffset}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getIncomingStockAPI ERROR:", error);
    return null;
  }
};

/**
 * Get unlinked incoming stock (for confirm validation)
 */
export const getUnlinkedIncomingAPI = async (weekOffset = 0, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_UNLINKED_INCOMING}?weekOffset=${weekOffset}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getUnlinkedIncomingAPI ERROR:", error);
    return null;
  }
};

/**
 * Add or update incoming stock from matrix
 */
export const addIncomingStockAPI = async (data, token) => {
  try {
    const response = await apiConnector(
      "POST",
      ADD_INCOMING_STOCK,
      data,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("addIncomingStockAPI ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update incoming stock");
    return null;
  }
};

/**
 * Link single incoming stock to vendor
 */
export const linkIncomingStockAPI = async (id, data, token) => {
  const toastId = toast.loading("Linking to vendor...");
  try {
    const response = await apiConnector(
      "POST",
      `${LINK_INCOMING_STOCK}/${id}/link`,
      data,
      { Authorization: `Bearer ${token}` }
    );
    toast.dismiss(toastId);
    toast.success("Incoming stock linked to vendor");
    return response.data;
  } catch (error) {
    console.error("linkIncomingStockAPI ERROR:", error);
    toast.dismiss(toastId);
    toast.error(error?.response?.data?.message || "Failed to link incoming stock");
    return null;
  }
};

/**
 * Bulk link multiple incoming stocks to vendor
 */
export const bulkLinkIncomingStockAPI = async (data, token) => {
  const toastId = toast.loading("Linking items to vendor...");
  try {
    const response = await apiConnector(
      "POST",
      BULK_LINK_INCOMING,
      data,
      { Authorization: `Bearer ${token}` }
    );
    toast.dismiss(toastId);
    toast.success(response?.data?.message || "Items linked to vendor");
    return response.data;
  } catch (error) {
    console.error("bulkLinkIncomingStockAPI ERROR:", error);
    toast.dismiss(toastId);
    toast.error(error?.response?.data?.message || "Failed to link items");
    return null;
  }
};

/**
 * Mark incoming stock as received
 */
export const receiveIncomingStockAPI = async (id, data, token) => {
  const toastId = toast.loading("Receiving stock...");
  try {
    const response = await apiConnector(
      "POST",
      `${RECEIVE_INCOMING_STOCK}/${id}/receive`,
      data,
      { Authorization: `Bearer ${token}` }
    );
    toast.dismiss(toastId);
    toast.success("Stock received and inventory updated");
    return response.data;
  } catch (error) {
    console.error("receiveIncomingStockAPI ERROR:", error);
    toast.dismiss(toastId);
    toast.error(error?.response?.data?.message || "Failed to receive stock");
    return null;
  }
};

/**
 * Delete/cancel incoming stock
 */
export const deleteIncomingStockAPI = async (id, token) => {
  try {
    const response = await apiConnector(
      "DELETE",
      `${DELETE_INCOMING_STOCK}/${id}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    toast.success("Incoming stock removed");
    return response.data;
  } catch (error) {
    console.error("deleteIncomingStockAPI ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete incoming stock");
    return null;
  }
};
