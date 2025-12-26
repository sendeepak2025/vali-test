import { apiConnector } from "../apiConnector";
import { creditmemos} from "../apis";
import { toast } from 'react-toastify';


const { 
   CREATE_CREDIT_MEMO,
   GET_CREDIT_MEMO_BY_ID,
   UPDATE_CREDIT_MEMO_BY_ID,
   PROCESS_CREDIT_MEMO,
   APPLY_STORE_CREDIT,
   GET_STORE_CREDIT_INFO
} = creditmemos


export const createCreditMemoAPI = async (formData, token) => {
  const toastId = toast.loading("Creating credit memo...");

  try {
    const response = await apiConnector("POST", CREATE_CREDIT_MEMO, formData, {
      Authorization: `Bearer ${token}`,
    });

    const result = response?.data;
console.log(result)
    if (!result?.success) {
      throw new Error(result?.message || "Credit memo creation failed.");
    }

    toast.success(result.message || "Credit memo created successfully!");

    // Return full credit memo response if needed
    return result.creditMemo || null;
  } catch (error) {
    console.error("CREATE_CREDIT_MEMO API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to create credit memo.");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};
export const updateCreditMemoAPI = async (id, formData, token) => {
  const toastId = toast.loading("Updating credit memo...");

  try {
    const response = await apiConnector("PUT", `${UPDATE_CREDIT_MEMO_BY_ID}/${id}`, formData, {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    });

    const result = response?.data;
    console.log("UPDATE_CREDIT_MEMO result:", result);

    if (!result?.success) {
      throw new Error(result?.message || "Credit memo update failed.");
    }

    toast.success(result.message || "Credit memo updated successfully!");

    return result.creditMemo || null;
  } catch (error) {
    console.error("UPDATE_CREDIT_MEMO API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update credit memo.");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};





export const getCreditMemosByOrderId = async (id,token) => {

    try {
        const response = await apiConnector("GET", `${GET_CREDIT_MEMO_BY_ID}/${id}`,{},{
            Authorization: `Bearer ${token}`,
        })


        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data?.creditMemos || [];
    } catch (error) {
        console.error("GET GET_CREDIT_MEMO_BY_ID API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to get GET_CREDIT_MEMO_BY_ID!");
        return [];
    }

};


// Process a credit memo (marks as processed and updates store credit if applicable)
export const processCreditMemoAPI = async (id, processNotes, token) => {
  const toastId = toast.loading("Processing credit memo...");
  try {
    const response = await apiConnector(
      "PUT",
      `${PROCESS_CREDIT_MEMO}/${id}`,
      { processNotes },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to process credit memo");
    }

    toast.success("Credit memo processed successfully!");
    return response.data;
  } catch (error) {
    console.error("PROCESS_CREDIT_MEMO API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to process credit memo");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Apply store credit to an order
export const applyStoreCreditAPI = async (storeId, orderId, amount, token) => {
  const toastId = toast.loading("Applying store credit...");
  try {
    const response = await apiConnector(
      "POST",
      APPLY_STORE_CREDIT,
      { storeId, orderId, amount },
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to apply store credit");
    }

    toast.success(`$${amount.toFixed(2)} credit applied successfully!`);
    return response.data;
  } catch (error) {
    console.error("APPLY_STORE_CREDIT API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to apply store credit");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

// Get store credit balance and history
export const getStoreCreditInfoAPI = async (storeId, token) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_STORE_CREDIT_INFO}/${storeId}`,
      null,
      { Authorization: `Bearer ${token}` }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch store credit info");
    }

    return response.data.data;
  } catch (error) {
    console.error("GET_STORE_CREDIT_INFO API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch store credit info");
    return null;
  }
};
