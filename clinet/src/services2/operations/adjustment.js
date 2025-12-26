import { apiConnector } from "../apiConnector";
import { adjustment } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_ADJUSTMENT,
  GET_ALL_ADJUSTMENTS,
  GET_ADJUSTMENT,
  GET_STORE_ADJUSTMENTS,
  APPROVE_ADJUSTMENT,
  REJECT_ADJUSTMENT,
  VOID_ADJUSTMENT,
  GET_ADJUSTMENT_SUMMARY,
} = adjustment;

// Create a new adjustment
export const createAdjustmentAPI = async (data, token) => {
  const toastId = toast.loading("Creating adjustment...");
  try {
    const response = await apiConnector("POST", CREATE_ADJUSTMENT, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to create adjustment");
    }

    toast.success("Adjustment created successfully!");
    return response.data;
  } catch (error) {
    console.error("CREATE_ADJUSTMENT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create adjustment");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get all adjustments with filters
export const getAllAdjustmentsAPI = async (params, token) => {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${GET_ALL_ADJUSTMENTS}?${queryString}`;
    
    const response = await apiConnector("GET", url, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch adjustments");
    }

    return response.data;
  } catch (error) {
    console.error("GET_ALL_ADJUSTMENTS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch adjustments");
    return null;
  }
};

// Get single adjustment by ID
export const getAdjustmentByIdAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_ADJUSTMENT}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch adjustment");
    }

    return response.data.data;
  } catch (error) {
    console.error("GET_ADJUSTMENT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch adjustment");
    return null;
  }
};

// Get adjustments for a specific store
export const getStoreAdjustmentsAPI = async (storeId, params, token) => {
  try {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : "";
    const url = `${GET_STORE_ADJUSTMENTS}/${storeId}${queryString}`;
    
    const response = await apiConnector("GET", url, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch store adjustments");
    }

    return response.data.data;
  } catch (error) {
    console.error("GET_STORE_ADJUSTMENTS API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch store adjustments");
    return null;
  }
};

// Approve an adjustment
export const approveAdjustmentAPI = async (id, approvalNotes, token) => {
  const toastId = toast.loading("Approving adjustment...");
  try {
    const response = await apiConnector(
      "PUT",
      `${APPROVE_ADJUSTMENT}/${id}/approve`,
      { approvalNotes },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to approve adjustment");
    }

    toast.success("Adjustment approved and applied!");
    return response.data;
  } catch (error) {
    console.error("APPROVE_ADJUSTMENT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to approve adjustment");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Reject an adjustment
export const rejectAdjustmentAPI = async (id, rejectionReason, token) => {
  const toastId = toast.loading("Rejecting adjustment...");
  try {
    const response = await apiConnector(
      "PUT",
      `${REJECT_ADJUSTMENT}/${id}/reject`,
      { rejectionReason },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to reject adjustment");
    }

    toast.success("Adjustment rejected");
    return response.data;
  } catch (error) {
    console.error("REJECT_ADJUSTMENT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to reject adjustment");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Void an adjustment
export const voidAdjustmentAPI = async (id, voidReason, token) => {
  const toastId = toast.loading("Voiding adjustment...");
  try {
    const response = await apiConnector(
      "PUT",
      `${VOID_ADJUSTMENT}/${id}/void`,
      { voidReason },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to void adjustment");
    }

    toast.success("Adjustment voided successfully");
    return response.data;
  } catch (error) {
    console.error("VOID_ADJUSTMENT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to void adjustment");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get adjustment summary/stats
export const getAdjustmentSummaryAPI = async (params, token) => {
  try {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : "";
    const url = `${GET_ADJUSTMENT_SUMMARY}${queryString}`;
    
    const response = await apiConnector("GET", url, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch adjustment summary");
    }

    return response.data.data;
  } catch (error) {
    console.error("GET_ADJUSTMENT_SUMMARY API ERROR:", error);
    return null;
  }
};
