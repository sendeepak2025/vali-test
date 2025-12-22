import { apiConnector } from "../apiConnector";
import { vendorDispute } from "../apis";
import { toast } from "react-toastify";

const {
  CREATE_DISPUTE,
  GET_ALL_DISPUTES,
  GET_DISPUTE,
  UPDATE_STATUS,
  ADD_COMMUNICATION,
  RESOLVE_DISPUTE,
  ESCALATE_DISPUTE,
  GET_VENDOR_SUMMARY,
} = vendorDispute;

// Create Dispute
export const createVendorDisputeAPI = async (formData, token) => {
  const toastId = toast.loading("Creating dispute...");
  try {
    const response = await apiConnector("POST", CREATE_DISPUTE, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Dispute created successfully!");
    return response?.data;
  } catch (error) {
    console.error("CREATE Dispute API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create dispute!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get All Disputes
export const getAllVendorDisputesAPI = async (params, token) => {
  try {
    const response = await apiConnector("GET", GET_ALL_DISPUTES, null, {
      Authorization: `Bearer ${token}`,
    }, params);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET ALL Disputes API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get disputes!");
    return null;
  }
};

// Get Single Dispute
export const getVendorDisputeAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_DISPUTE}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Dispute API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get dispute!");
    return null;
  }
};

// Update Dispute Status
export const updateDisputeStatusAPI = async (id, data, token) => {
  const toastId = toast.loading("Updating dispute status...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_STATUS}/${id}/status`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Dispute status updated!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Dispute Status API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update dispute status!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Add Communication to Dispute
export const addDisputeCommunicationAPI = async (id, data, token) => {
  const toastId = toast.loading("Adding message...");
  try {
    const response = await apiConnector("POST", `${ADD_COMMUNICATION}/${id}/communication`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success("Message added successfully!");
    return response?.data;
  } catch (error) {
    console.error("ADD Communication API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to add message!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Resolve Dispute
export const resolveVendorDisputeAPI = async (id, data, token) => {
  const toastId = toast.loading("Resolving dispute...");
  try {
    const response = await apiConnector("PUT", `${RESOLVE_DISPUTE}/${id}/resolve`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Dispute resolved!");
    return response?.data;
  } catch (error) {
    console.error("RESOLVE Dispute API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to resolve dispute!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Escalate Dispute
export const escalateVendorDisputeAPI = async (id, data, token) => {
  const toastId = toast.loading("Escalating dispute...");
  try {
    const response = await apiConnector("PUT", `${ESCALATE_DISPUTE}/${id}/escalate`, data, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Dispute escalated!");
    return response?.data;
  } catch (error) {
    console.error("ESCALATE Dispute API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to escalate dispute!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get Vendor Dispute Summary
export const getVendorDisputeSummaryAPI = async (vendorId, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR_SUMMARY}/${vendorId}/summary`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Dispute Summary API ERROR:", error);
    return null;
  }
};
