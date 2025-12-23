import { apiConnector } from "../apiConnector";
import { order, product } from "../apis";
import { toast } from 'react-toastify';


const { CREATE_PRODUCT,
    CREATE_ORDER,
    GET_ALL_ORDER, 
    GET_ORDER,
    UPDATE_ORDER,
    UPDATE_PLATE_ORDER,
    UPDATE_PAYMENT_ORDER,
    DELETE_ORDER,
    UPDATE_ORDER_ORDER_TYPE,
    GET_USERSTATEMENT,
    UPDATE_SHIPPING_COST,
    DASHBOARD_DATA,
    ENHANCED_DASHBOARD_DATA,
    PENDING_ORDER_DATA,
    SEND_INVOICE_MAIL,
    UPDATE_PAYMENT_UNPAID_ORDER,
    HARD_DELETE_ORDER,
    UPDATE_ORDER_QUANTITY,
    ASSIGN_PRODUCT_TO_STORE,
    GET_USER_LATEST_ORDERS,
    GET_ORDER_MATRIX,
    UPDATE_ORDER_MATRIX_ITEM,
    UPDATE_PREORDER_MATRIX_ITEM
} = order


import Swal from "sweetalert2";

export const createOrderAPI = async (formData, token) => {
  const toastId = toast.loading("Loading...");

  try {
    const response = await apiConnector("POST", CREATE_ORDER, formData, {
      Authorization: `Bearer ${token}`,
    });

    const data = response?.data;

    if (!data?.success) {
      throw new Error("te"|| "Something went wrong!");
    }

    // --- Handle insufficient stock from backend ---
    if (data.insufficientStock && data.insufficientStock.length > 0) {
      const htmlTable = `
        <table style="width:100%; text-align:left; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border-bottom: 1px solid #ddd; padding: 5px;">Product</th>
              <th style="border-bottom: 1px solid #ddd; padding: 5px;">Requested</th>
              <th style="border-bottom: 1px solid #ddd; padding: 5px;">Available</th>
              <th style="border-bottom: 1px solid #ddd; padding: 5px;">Type</th>
            </tr>
          </thead>
          <tbody>
            ${data.insufficientStock
              .map(
                (item) => `
                <tr style="background-color: ${item.requested > item.available ? "#f8d7da" : "transparent"};">
                  <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.name}</td>
                  <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.requested}</td>
                  <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.available}</td>
                  <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.type}</td>
                </tr>
              `
              )
              .join("")}
          </tbody>
        </table>
      `;

      const shortItemsList = data.insufficientStock
        .map(
          (item) =>
            `• ${item.name} (requested: ${item.requested}, available: ${item.available})`
        )
        .join("<br>");

      await Swal.fire({
        icon: "error",
        title: "Insufficient Stock",
        html: `
          ${htmlTable}
          <br><strong>Cannot fulfill these items:</strong><br>
          ${shortItemsList}
        `,
        width: "650px",
        confirmButtonText: "OK",
      });

      return null; // Stop execution, do not proceed with order
    }

    // --- Success ---
    // Emit event for order creation
    try {
        const { emitOrderCreated } = await import("@/utils/orderEvents");
        emitOrderCreated(data.newOrder);
    } catch (e) {
        console.log("Order event emission skipped");
    }
    
    toast.success(data.message);
    return data.newOrder || false;

} catch (error) {
  console.error("CREATE_ORDER API ERROR:", error);

  // --- Handle insufficient stock even if API throws 400 ---
  const insufficientStock = error?.response?.data?.insufficientStock;
  if (insufficientStock && insufficientStock.length > 0) {
    const htmlTable = `
      <table style="width:100%; text-align:left; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="border-bottom: 1px solid #ddd; padding: 5px;">Product</th>
            <th style="border-bottom: 1px solid #ddd; padding: 5px;">Requested</th>
            <th style="border-bottom: 1px solid #ddd; padding: 5px;">Available</th>
            <th style="border-bottom: 1px solid #ddd; padding: 5px;">Type</th>
          </tr>
        </thead>
        <tbody>
          ${insufficientStock
            .map(
              (item) => `
              <tr style="background-color: ${
                item.requested > item.available ? "#f8d7da" : "transparent"
              };">
                <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.name}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.requested}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.available}</td>
                <td style="border-bottom: 1px solid #ddd; padding: 5px;">${item.type}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
    `;

    const shortItemsList = insufficientStock
      .map(
        (item) =>
          `• ${item.name} (requested: ${item.requested}, available: ${item.available})`
      )
      .join("<br>");

    await Swal.fire({
      icon: "error",
      title: "Insufficient Stock",
      html: `
        ${htmlTable}
        <br><strong>Cannot fulfill these items:</strong><br>
        ${shortItemsList}
      `,
      width: "650px",
      confirmButtonText: "OK",
    });

    return null;
  }

  // --- Default error if no stock info ---
  await Swal.fire({
    icon: "error",
    title: "Order Failed",
    text: error?.response?.data?.message || "Failed to create order!",
  });

  return null;
}
finally {
    toast.dismiss(toastId);
  }
};



export const getOrderAPI = async (id,token) => {

    try {
        const response = await apiConnector("GET", `${GET_ORDER}/${id}`,{},{
            Authorization: `Bearer ${token}`,
        })
        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data?.order || [];
    } catch (error) {
        console.error("GET GET_ALL_ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to get GET_ALL_ORDER!");
        return [];
    }

};
export const senInvoiceAPI = async (id, token) => {
    const toastId = toast.loading("Sending invoice...");

    try {
        const response = await apiConnector(
            "POST",
            `${SEND_INVOICE_MAIL}/${id}`,
            {},
            {
                Authorization: `Bearer ${token}`,
            }
        );

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        toast.update(toastId, {
            render: "Invoice sent successfully!",
            type: "success",
            isLoading: false,
            autoClose: 3000,
        });

        return response?.data?.order || [];
    } catch (error) {
        console.error("POST SEND_INVOICE_MAIL API ERROR:", error);

        toast.update(toastId, {
            render: error?.response?.data?.message || "Failed to send invoice!",
            type: "error",
            isLoading: false,
            autoClose: 3000,
        });

        return [];
    }
};

export const getStatement = async (id,token) => {

    try {
        const response = await apiConnector("GET", `${GET_USERSTATEMENT}/${id}`,{},{
            Authorization: `Bearer ${token}`,
        })


        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data.data|| [];
    } catch (error) {
        console.error("GET GET_ALL_ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to get GET_ALL_ORDER!");
        return [];
    }

};


export const getDashboardData = async (token) => {

    try {
        const response = await apiConnector("GET", DASHBOARD_DATA,{},{
            Authorization: `Bearer ${token}`,
        })


        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data || [];
    } catch (error) {
        console.error("GET GET_ALL_ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to get GET_ALL_ORDER!");
        return [];
    }

};

export const getEnhancedDashboardData = async (token) => {
    try {
        const response = await apiConnector("GET", ENHANCED_DASHBOARD_DATA, {}, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data || null;
    } catch (error) {
        console.error("GET ENHANCED_DASHBOARD_DATA API ERROR:", error);
        return null;
    }
};
export const getPendingData = async (token) => {

    try {
        const response = await apiConnector("GET", PENDING_ORDER_DATA,{},{
            Authorization: `Bearer ${token}`,
        })


        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        return response?.data || [];
    } catch (error) {
        console.error("GET GET_ALL_ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to get GET_ALL_ORDER!");
        return [];
    }

};



export const getAllOrderAPI = async (token, queryParams = "") => {
  try {
    console.log("Fetching orders with params:", queryParams)

    const response = await apiConnector(
      "GET",
      `${GET_ALL_ORDER}?${queryParams}`,
      {},
      {
        Authorization: `Bearer ${token}`,
      },
    )

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!")
    }

    console.log("API response:", response.data)

    return {
      orders: response?.data?.orders || [],
      totalOrders: response?.data?.totalOrders || 0,
      currentPage: response?.data?.currentPage || 1,
      totalPages: response?.data?.totalPages || 1,
      summary: response?.data?.summary || {},
    }
  } catch (error) {
    console.error("GET GET_ALL_ORDER API ERROR:", error)
    toast.error(error?.response?.data?.message || "Failed to get orders!")
    return {
      orders: [],
      totalOrders: 0,
      currentPage: 1,
      totalPages: 1,
    }
  }
}

export const updateOrderAPI = async (formData, token,id) => {

    const toastId = toast.loading("Loading...");


    try {
        const response = await apiConnector("PUT", `${UPDATE_ORDER}/${id}`, formData, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        // Emit event for order update
        try {
            const { emitOrderUpdated } = await import("@/utils/orderEvents");
            emitOrderUpdated(response?.data);
        } catch (e) {
            console.log("Order event emission skipped");
        }

        toast.success(response?.data?.message);

        return response;
    } catch (error) {
        console.error("updateOrderAPI  API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to updateOrderAPI!");
        return null;
    } finally {

        toast.dismiss(toastId);
    }
};
export const updateOrderShippingAPI = async (formData, token) => {
    const toastId = toast.loading("Loading...");

    try {
        // Sending PUT request to update shipping cost
        const response = await apiConnector("POST", `${UPDATE_SHIPPING_COST}`, formData, {
            Authorization: `Bearer ${token}`,
        });

        // Check if response indicates success
        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        // If success, show a success toast
        toast.success(response?.data?.message || "Shipping cost updated successfully!");

        return response.data.updatedOrder;  // Return the response in case you want to use it elsewhere
    } catch (error) {
        console.error("updateOrderShippingAPI ERROR:", error);

        // Displaying error message
        const errorMessage = error?.response?.data?.message || error.message || "Failed to update shipping cost!";
        toast.error(errorMessage);

        return null;  // Returning null to indicate failure
    } finally {
        // Dismissing the loading toast after the operation is done
        toast.dismiss(toastId);
    }
};

export const updateOrderTypeAPI = async (formData, token,id) => {

    const toastId = toast.loading("Loading...");


    try {
        const response = await apiConnector("PUT", `${UPDATE_ORDER_ORDER_TYPE}/${id}`, formData, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }


        toast.success(response?.data?.message);

        return response;
    } catch (error) {
        console.error("updateOrderAPI  API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to updateOrderAPI!");
        return null;
    } finally {

        toast.dismiss(toastId);
    }
};


export const updateOrderPaymentAPI = async (formData, token, id) => {
    const toastId = toast.loading("Updating payment...");
  
    try {
      const response = await apiConnector(
        "PUT",
        `${UPDATE_PAYMENT_ORDER}/${id}`,
        formData, // ✅ Send formData directly, not wrapped inside an object
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // 👈 Only if formData is a plain JS object
        }
      );
  
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Something went wrong!");
      }
  
      toast.success(response?.data?.message || "Payment updated successfully");
      return response;
    } catch (error) {
      console.error("updateOrderPaymentAPI ERROR:", error);
      toast.error(error?.response?.data?.message || "Payment update failed!");
      return null;
    } finally {
      toast.dismiss(toastId);
    }
  };
export const updateOrderUnpaidAPI = async (id, token) => {
    const toastId = toast.loading("Updating payment...");
  
    try {
      const response = await apiConnector(
        "PUT",
        `${UPDATE_PAYMENT_UNPAID_ORDER}/${id}`,
        {}, // ✅ Send formData directly, not wrapped inside an object
        {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // 👈 Only if formData is a plain JS object
        }
      );
  
      if (!response?.data?.success) {
        throw new Error(response?.data?.message || "Something went wrong!");
      }
  
      toast.success(response?.data?.message || "Payment updated successfully");
      return response;
    } catch (error) {
      console.error("updateOrderPaymentAPI ERROR:", error);
      toast.error(error?.response?.data?.message || "Payment update failed!");
      return null;
    } finally {
      toast.dismiss(toastId);
    }
  };
  



export const updateOrderPlateAPI = async (palletData, token,id) => {
console.log(palletData)
    const toastId = toast.loading("Loading...");


    try {
        const response = await apiConnector("PUT", `${UPDATE_PLATE_ORDER}/${id}`, {palletData:palletData}, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }


        toast.success(response?.data?.message);

        return response;
    } catch (error) {
        console.error("updateOrderAPI  API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to updateOrderAPI!");
        return null;
    } finally {

        toast.dismiss(toastId);
    }
};



export const deleteOrderAPI = async (id, token,reason) => {
    try {
        const response = await apiConnector("DELETE", `${DELETE_ORDER}/${id}`, {reason}, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        toast.success("Order Voided successfully!");
        return response?.data?.deletedOrder || null;
    } catch (error) {
        console.error("DELETE ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to voided order!");
        return null;
    }
};
export const deleteHardOrderAPI = async (id, token) => {
    try {
        const response = await apiConnector("DELETE", `${HARD_DELETE_ORDER}/${id}`, null, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }

        toast.success("Order Permanently Deleted successfully!");
        return response?.data?.deletedOrder || null;
    } catch (error) {
        console.error("DELETE ORDER API ERROR:", error);
        toast.error(error?.response?.data?.message || "Failed to Permanently Deleted order!");
        return null;
    }
};



export const updateBuyerQuantityAPI = async (formData, token) => {
  const toastId = toast.loading("Updating quantity...");

  try {
    const response = await apiConnector(
      "PATCH",
      UPDATE_ORDER_QUANTITY,
      formData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Quantity updated successfully");

    return response.data?.updatedItem; // updated item return
  } catch (error) {
    console.error("UPDATE_ORDER_QUANTITY API ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update quantity!");
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};



export const assignProductToStoreAPI = async (formData, token) => {
  const toastId = toast.loading("Assigning product to store...");

  try {
    const response = await apiConnector(
      "POST", // Use POST as this creates/updates an order
      `${ASSIGN_PRODUCT_TO_STORE}`,
      formData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Something went wrong!");
    }

    toast.success(response?.data?.message || "Product assigned successfully!");
    return response.data; // Only return the data, easier for frontend usage

  } catch (error) {
    console.error("assignProductToStoreAPI ERROR:", error);
    toast.error(
      error?.response?.data?.message || error?.message || "Failed to assign product!"
    );
    return null;

  } finally {
    toast.dismiss(toastId);
  }
};

// Get user's latest orders with purchased product IDs
export const getUserLatestOrdersAPI = async (storeId, limit = 5) => {
  try {
    const response = await apiConnector(
      "GET",
      `${GET_USER_LATEST_ORDERS}/${storeId}?limit=${limit}`
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch latest orders");
    }

    return response.data;

  } catch (error) {
    console.error("getUserLatestOrdersAPI ERROR:", error);
    return {
      success: false,
      orders: [],
      purchasedProductIds: [],
      message: error?.response?.data?.message || error?.message || "Failed to fetch latest orders"
    };
  }
};


// Get Order Matrix Data - Store wise product orders with previous purchase history
export const getOrderMatrixDataAPI = async (token, weekOffset = 0, page = 1, limit = 50, search = "") => {
  try {
    const params = new URLSearchParams({
      weekOffset: weekOffset.toString(),
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append("search", search);
    }

    const response = await apiConnector(
      "GET",
      `${GET_ORDER_MATRIX}?${params.toString()}`,
      {},
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to fetch order matrix data");
    }

    return response.data;

  } catch (error) {
    console.error("getOrderMatrixDataAPI ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to fetch order matrix data");
    return {
      success: false,
      data: {
        matrix: [],
        stores: [],
        weekRange: null,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalProducts: 0,
          limit: 50,
          hasNextPage: false,
          hasPrevPage: false
        }
      }
    };
  }
};

// Update or Create Order Item in Matrix
export const updateOrderMatrixItemAPI = async (formData, token) => {
  try {
    const response = await apiConnector(
      "POST",
      UPDATE_ORDER_MATRIX_ITEM,
      formData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update order matrix item");
    }

    return response.data;

  } catch (error) {
    console.error("updateOrderMatrixItemAPI ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update order matrix item");
    return null;
  }
};


// Update or Create PreOrder Item in Matrix (PREORDER Mode)
export const updatePreOrderMatrixItemAPI = async (formData, token) => {
  try {
    const response = await apiConnector(
      "POST",
      UPDATE_PREORDER_MATRIX_ITEM,
      formData,
      {
        Authorization: `Bearer ${token}`,
      }
    );

    if (!response?.data?.success) {
      throw new Error(response?.data?.message || "Failed to update preorder matrix item");
    }

    return response.data;

  } catch (error) {
    console.error("updatePreOrderMatrixItemAPI ERROR:", error);
    toast.error(error?.response?.data?.message || "Failed to update preorder matrix item");
    return null;
  }
};
