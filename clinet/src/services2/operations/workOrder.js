import { toast } from "react-toastify";
import { apiConnector } from "../apiConnector";
import { workOrderEndpoints } from "../apis";

const {
  CREATE_WORK_ORDER,
  GET_WORK_ORDER,
  GET_WORK_ORDER_BY_WEEK,
  GET_ALL_WORK_ORDERS,
  GET_SHORTAGES_SUMMARY,
  UPDATE_PICKING_STATUS,
  RESOLVE_SHORTAGE,
} = workOrderEndpoints;

/**
 * Create work order (usually called automatically after PreOrder confirm)
 */
export const createWorkOrderAPI = async (data, token) => {
  try {
    const response = await apiConnector(
      "POST",
      CREATE_WORK_ORDER,
      data,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("createWorkOrderAPI ERROR:", error);
    return null;
  }
};

/**
 * Get work order by ID
 */
export const getWorkOrderAPI = async (id, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_WORK_ORDER}/${id}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getWorkOrderAPI ERROR:", error);
    return null;
  }
};

/**
 * Get work order for a specific week
 */
export const getWorkOrderByWeekAPI = async (weekOffset = 0, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_WORK_ORDER_BY_WEEK}?weekOffset=${weekOffset}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getWorkOrderByWeekAPI ERROR:", error);
    return null;
  }
};

/**
 * Get all work orders with pagination
 */
export const getAllWorkOrdersAPI = async (params = {}, token) => {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.hasShortage !== undefined) queryParams.append('hasShortage', params.hasShortage);

    const url = queryParams.toString()
      ? `${GET_ALL_WORK_ORDERS}?${queryParams.toString()}`
      : GET_ALL_WORK_ORDERS;

    const response = await apiConnector(
      "GET",
      url,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getAllWorkOrdersAPI ERROR:", error);
    return null;
  }
};

/**
 * Get shortages summary for dashboard
 */
export const getShortagesSummaryAPI = async (weekOffset = 0, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_SHORTAGES_SUMMARY}?weekOffset=${weekOffset}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    return response.data;
  } catch (error) {
    console.error("getShortagesSummaryAPI ERROR:", error);
    return null;
  }
};

/**
 * Update picking status for a store item
 */
export const updatePickingStatusAPI = async (workOrderId, data, token) => {
  try {
    const response = await apiConnector(
      "POST",
      `${UPDATE_PICKING_STATUS}/${workOrderId}/picking`,
      data,
      { Authorization: `Bearer ${token}` }
    );
    if (response.data?.success) {
      toast.success("Picking status updated");
    }
    return response.data;
  } catch (error) {
    console.error("updatePickingStatusAPI ERROR:", error);
    toast.error("Failed to update picking status");
    return null;
  }
};

/**
 * Resolve product shortage
 */
export const resolveShortageAPI = async (workOrderId, data, token) => {
  const toastId = toast.loading("Resolving shortage...");
  try {
    const response = await apiConnector(
      "POST",
      `${RESOLVE_SHORTAGE}/${workOrderId}/resolve-shortage`,
      data,
      { Authorization: `Bearer ${token}` }
    );
    toast.dismiss(toastId);
    if (response.data?.success) {
      toast.success("Shortage resolved");
    }
    return response.data;
  } catch (error) {
    console.error("resolveShortageAPI ERROR:", error);
    toast.dismiss(toastId);
    toast.error("Failed to resolve shortage");
    return null;
  }
};
