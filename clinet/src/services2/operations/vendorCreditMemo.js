import { apiConnector } from "../apiConnector";
import { vendorCreditMemo } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_CREDIT_MEMO,
  GET_ALL_CREDIT_MEMOS,
  GET_CREDIT_MEMO,
  UPDATE_CREDIT_MEMO,
  DELETE_CREDIT_MEMO,
  SUBMIT_FOR_APPROVAL,
  APPROVE_CREDIT_MEMO,
  APPLY_CREDIT_MEMO,
  VOID_CREDIT_MEMO,
  GET_VENDOR_SUMMARY,
} = vendorCreditMemo;

// Create Credit Memo
export const createVendorCreditMemoAPI = async (formData, token) => {
  const toastId = toast.loading("Creating credit memo...");
  try {
    const response = await apiConnector("POST", CREATE_CREDIT_MEMO, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo created successfully!");
    return response?.data;
  } catch (error) {
    console.error("CREATE Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get All Credit Memos
export const getAllVendorCreditMemosAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_ALL_CREDIT_MEMOS, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET ALL Credit Memos API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get credit memos!");
    return null;
  }
};

// Get Single Credit Memo
export const getVendorCreditMemoAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_CREDIT_MEMO}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get credit memo!");
    return null;
  }
};

// Update Credit Memo
export const updateVendorCreditMemoAPI = async (id, formData, token) => {
  const toastId = toast.loading("Updating credit memo...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_CREDIT_MEMO}/${id}`, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo updated successfully!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Delete Credit Memo
export const deleteVendorCreditMemoAPI = async (id, token) => {
  const toastId = toast.loading("Deleting credit memo...");
  try {
    const response = await apiConnector("DELETE", `${DELETE_CREDIT_MEMO}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo deleted successfully!");
    return response?.data;
  } catch (error) {
    console.error("DELETE Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Submit for Approval
export const submitCreditMemoForApprovalAPI = async (id, token) => {
  const toastId = toast.loading("Submitting for approval...");
  try {
    const response = await apiConnector("PUT", `${SUBMIT_FOR_APPROVAL}/${id}/submit`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Submitted for approval!");
    return response?.data;
  } catch (error) {
    console.error("SUBMIT Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to submit for approval!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Approve Credit Memo
export const approveVendorCreditMemoAPI = async (id, data, token) => {
  const toastId = toast.loading("Approving credit memo...");
  try {
    const response = await apiConnector("PUT", `${APPROVE_CREDIT_MEMO}/${id}/approve`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo approved!");
    return response?.data;
  } catch (error) {
    console.error("APPROVE Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to approve credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Apply Credit Memo to Payment
export const applyVendorCreditMemoAPI = async (id, data, token) => {
  const toastId = toast.loading("Applying credit memo...");
  try {
    const response = await apiConnector("PUT", `${APPLY_CREDIT_MEMO}/${id}/apply`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo applied!");
    return response?.data;
  } catch (error) {
    console.error("APPLY Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to apply credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Void Credit Memo
export const voidVendorCreditMemoAPI = async (id, data, token) => {
  const toastId = toast.loading("Voiding credit memo...");
  try {
    const response = await apiConnector("PUT", `${VOID_CREDIT_MEMO}/${id}/void`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Credit memo voided!");
    return response?.data;
  } catch (error) {
    console.error("VOID Credit Memo API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to void credit memo!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get Vendor Credit Memo Summary
export const getVendorCreditMemoSummaryAPI = async (vendorId, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_SUMMARY}/${vendorId}/summary`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Credit Memo Summary API ERROR:", error);
    return null;
  }
};

// Get Unapplied Credits for a Vendor
export const getVendorUnappliedCreditsAPI = async (vendorId, token) => {
  try {
    const BASE_URL = import.meta.env.VITE_APP_BASE_URL;
    const response = await apiConnector("GET", `${BASE_URL}/vendors/${vendorId}/unapplied-credits`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Unapplied Credits API ERROR:", error);
    return null;
  }
};
