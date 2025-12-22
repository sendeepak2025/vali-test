import { apiConnector } from "../apiConnector";
import { vendorInvoice } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_INVOICE,
  GET_ALL_INVOICES,
  GET_INVOICE,
  UPDATE_INVOICE,
  DELETE_INVOICE,
  APPROVE_INVOICE,
  DISPUTE_INVOICE,
  MATCH_INVOICE,
  GET_MATCHING_COMPARISON,
  GET_VENDOR_SUMMARY,
} = vendorInvoice;

// Create Invoice
export const createInvoiceAPI = async (formData, token) => {
  const toastId = toast.loading("Creating invoice...");
  try {
    const response = await apiConnector("POST", CREATE_INVOICE, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Invoice created successfully!");
    return response?.data;
  } catch (error) {
    console.error("CREATE Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create invoice!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get All Invoices
export const getAllInvoicesAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_ALL_INVOICES, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET ALL Invoices API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get invoices!");
    return null;
  }
};

// Get Single Invoice
export const getInvoiceAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_INVOICE}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get invoice!");
    return null;
  }
};

// Update Invoice
export const updateInvoiceAPI = async (id, formData, token) => {
  const toastId = toast.loading("Updating invoice...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_INVOICE}/${id}`, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Invoice updated successfully!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update invoice!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Delete Invoice
export const deleteInvoiceAPI = async (id, token) => {
  const toastId = toast.loading("Deleting invoice...");
  try {
    const response = await apiConnector("DELETE", `${DELETE_INVOICE}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Invoice deleted successfully!");
    return response?.data;
  } catch (error) {
    console.error("DELETE Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete invoice!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Approve Invoice
export const approveInvoiceAPI = async (id, data, token) => {
  const toastId = toast.loading("Approving invoice...");
  try {
    const response = await apiConnector("PUT", `${APPROVE_INVOICE}/${id}/approve`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Invoice approved successfully!");
    return response?.data;
  } catch (error) {
    console.error("APPROVE Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to approve invoice!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Dispute Invoice
export const disputeInvoiceAPI = async (id, data, token) => {
  const toastId = toast.loading("Disputing invoice...");
  try {
    const response = await apiConnector("PUT", `${DISPUTE_INVOICE}/${id}/dispute`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Invoice disputed successfully!");
    return response?.data;
  } catch (error) {
    console.error("DISPUTE Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to dispute invoice!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Match Invoice (Three-Way Matching)
export const matchInvoiceAPI = async (id, data, token) => {
  const toastId = toast.loading("Performing three-way matching...");
  try {
    const response = await apiConnector("PUT", `${MATCH_INVOICE}/${id}/match`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Matching completed!");
    return response?.data;
  } catch (error) {
    console.error("MATCH Invoice API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to perform matching!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get Matching Comparison
export const getMatchingComparisonAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_MATCHING_COMPARISON}/${id}/matching-comparison`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Matching Comparison API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get matching comparison!");
    return null;
  }
};

// Get Vendor Invoice Summary
export const getVendorInvoiceSummaryAPI = async (vendorId, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_SUMMARY}/${vendorId}/summary`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Invoice Summary API ERROR:", error);
    return null;
  }
};
