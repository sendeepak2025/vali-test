import { apiConnector } from "../apiConnector";
import { vendor, vendorEnhanced } from "../apis"; // adjust path if needed
import { toast } from "react-toastify";

const {
  CREATE_VENDOR,
  GET_ALL_VENDORS,
  GET_VENDOR,
  UPDATE_VENDOR,
  DELETE_VENDOR,
} = vendor;

const {
  UPDATE_PAYMENT_TERMS,
  UPDATE_STATUS,
  GET_PERFORMANCE,
  GET_UNAPPLIED_CREDITS,
} = vendorEnhanced;

// Create Vendor
export const createVendorAPI = async (formData, token) => {
  const toastId = toast.loading("Creating vendor...");
  try {
    const response = await apiConnector("POST", CREATE_VENDOR, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Vendor created successfully!");
    return response?.data;
  } catch (error) {
    console.error("CREATE Vendor API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create vendor!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get All Vendors (with pagination)
export const getAllVendorsAPI = async (params = {}) => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.search) queryParams.append('search', params.search);
    if (params.type) queryParams.append('type', params.type);
    if (params.status) queryParams.append('status', params.status);
    
    const url = queryParams.toString() 
      ? `${GET_ALL_VENDORS}?${queryParams.toString()}`
      : GET_ALL_VENDORS;
    
    const response = await apiConnector("GET", url);

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    console.log(response.data.data)
    return response?.data;
  } catch (error) {
    console.error("GET ALL Vendors API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get vendors!");
    return { data: [], pagination: null };
  }
};

// Get Single Vendor by ID
export const getSingleVendorAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_VENDOR}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to get vendor!");
    return null;
  }
};

// Update Vendor
export const updateVendorAPI = async (id, formData, token) => {
  const toastId = toast.loading("Updating vendor...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_VENDOR}/${id}`, formData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Vendor updated successfully!");
    return response?.data;
  } catch (error) {
    console.error("UPDATE Vendor API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update vendor!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Delete Vendor
export const deleteVendorAPI = async (id, token) => {
  const toastId = toast.loading("Deleting vendor...");
  try {
    const response = await apiConnector("DELETE", `${DELETE_VENDOR}/${id}`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Vendor deleted successfully!");
    return response?.data;
  } catch (error) {
    console.error("DELETE Vendor API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to delete vendor!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};


// Update Vendor Payment Terms
export const updateVendorPaymentTermsAPI = async (id, paymentTermsData, token) => {
  const toastId = toast.loading("Updating payment terms...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_PAYMENT_TERMS}/${id}/payment-terms`, paymentTermsData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Payment terms updated successfully!");
    return response?.data?.data;
  } catch (error) {
    console.error("UPDATE Payment Terms API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update payment terms!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Update Vendor Status
export const updateVendorStatusAPI = async (id, statusData, token) => {
  const toastId = toast.loading("Updating vendor status...");
  try {
    const response = await apiConnector("PUT", `${UPDATE_STATUS}/${id}/status`, statusData, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Vendor status updated successfully!");
    return response?.data?.data;
  } catch (error) {
    console.error("UPDATE Vendor Status API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update vendor status!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get Vendor Performance
export const getVendorPerformanceAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_PERFORMANCE}/${id}/performance`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Performance API ERROR:", error);
    return null;
  }
};

// Get Vendor Unapplied Credits
export const getVendorUnappliedCreditsAPI = async (id, token) => {
  try {
    const response = await apiConnector("GET", `${GET_UNAPPLIED_CREDITS}/${id}/unapplied-credits`, null, {
      Authorization: `Bearer ${token}`,
    });

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    return response?.data?.data;
  } catch (error) {
    console.error("GET Vendor Unapplied Credits API ERROR:", error);
    return null;
  }
};
