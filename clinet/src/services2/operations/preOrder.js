import { apiConnector } from "../apiConnector";
import {  preOrder,  } from "../apis";
import { toast } from 'react-toastify';


const { CREATE_PRE_ORDER, GET_ALL_PRE_ORDER,GET_SINGLE_PRE_ORDER,UPDATE_PRE_ORDER, CONFIRM_PRE_ORDER
} = preOrder


import Swal from "sweetalert2";


export const createPreOrderAPI = async (formData, token) => {
  const toastId = toast.loading("Creating order...");
  try {
    const response = await apiConnector("POST", CREATE_PRE_ORDER, formData, {
      Authorization: `Bearer ${token}`,
    });

    const data = response?.data;

    if (!data?.success) {
      throw new Error(data?.message || "Something went wrong!");
    }

    toast.success(data.message);
    return data.preOrder || null; // matching backend response key

  } catch (error) {
    console.error("CREATE_PRE_ORDER API ERROR:", error);

    toast.error(error?.response?.data?.message)
    return null;
  } finally {
    toast.dismiss(toastId);
  }
};

export const getAllPreOrderAPI = async (token, queryParams = "") => {
  try {
    console.log("Fetching pre-orders with params:", queryParams);

    const response = await apiConnector(
      "GET",
      `${GET_ALL_PRE_ORDER}?${queryParams}`,
      {},
      { Authorization: `Bearer ${token}` }
    );

    const data = response?.data;

    if (!data?.success) {
      throw new Error(data?.message || "Something went wrong!");
    }

    return {
      preOrders: data?.preOrders || [],
      totalOrders: data?.total || 0,
      currentPage: data?.currentPage || 1,
      totalPages: data?.pages || 1,
    };
  } catch (error) {
    console.error("GET_ALL_PRE_ORDER API ERROR:", error);
    toast.error(error?.response?.data?.message || error?.message || "Failed to fetch pre-orders!");
    return {
      preOrders: [],
      totalOrders: 0,
      currentPage: 1,
      totalPages: 1,
    };
  }
};


export const getSinglePreOrderAPI = async (id,token) => {

    try {
        const response = await apiConnector("GET", `${GET_SINGLE_PRE_ORDER}/${id}`,{},{
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

export const updatePreOrderAPI = async (formData, token,id) => {

    const toastId = toast.loading("Loading...");


    try {
        const response = await apiConnector("PUT", `${UPDATE_PRE_ORDER}/${id}`, formData, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }


        toast.success(response?.data?.message);

        return response;
    } catch (error) {
        console.error("updatePreOrderAPI API ERROR:", error);
        
        // Handle insufficient stock error
        const insufficientStock = error?.response?.data?.insufficientStock;
        if (insufficientStock && insufficientStock.length > 0) {
            const htmlTable = `
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                    <thead>
                        <tr style="background:#fee2e2;">
                            <th style="padding:8px; border:1px solid #ddd;">Product</th>
                            <th style="padding:8px; border:1px solid #ddd;">Requested</th>
                            <th style="padding:8px; border:1px solid #ddd;">Available</th>
                            <th style="padding:8px; border:1px solid #ddd;">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insufficientStock
                            .map(
                                (item) => `
                                <tr style="background:#fef2f2;">
                                    <td style="padding:8px; border:1px solid #ddd;">${item.name}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.requested}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.available}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.type}</td>
                                </tr>`
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
                .join("\n");

            await Swal.fire({
                icon: "error",
                title: "Insufficient Stock",
                html: `
                    ${htmlTable}
                    <p style="margin-top:16px; font-weight:600;">Cannot fulfill these items:</p>
                    <p style="white-space:pre-line; text-align:left;">${shortItemsList}</p>
                `,
                confirmButtonText: "OK",
            });
            
            toast.dismiss(toastId);
            return null;
        }
        
        toast.error(error?.response?.data?.message || "Failed to update pre-order!");
        return null;
    } finally {

        toast.dismiss(toastId);
    }
};
export const confirmPreOrderAPI = async ( token,id) => {

    const toastId = toast.loading("Loading...");


    try {
        const response = await apiConnector("POST", `${CONFIRM_PRE_ORDER}/${id}`, null, {
            Authorization: `Bearer ${token}`,
        });

        if (!response?.data?.success) {
            throw new Error(response?.data?.message || "Something went wrong!");
        }


        toast.success(response?.data?.message);

        return response;
    } catch (error) {
        console.error("confirm preorder API ERROR:", error);
        
        // Handle already confirmed error
        if (error?.response?.data?.message?.includes("already confirmed")) {
            toast.error("This PreOrder has already been confirmed!");
            toast.dismiss(toastId);
            return null;
        }
        
        // Handle insufficient stock error
        const insufficientStock = error?.response?.data?.insufficientStock;
        if (insufficientStock && insufficientStock.length > 0) {
            const htmlTable = `
                <table style="width:100%; text-align:left; border-collapse: collapse;">
                    <thead>
                        <tr style="background:#fee2e2;">
                            <th style="padding:8px; border:1px solid #ddd;">Product</th>
                            <th style="padding:8px; border:1px solid #ddd;">Requested</th>
                            <th style="padding:8px; border:1px solid #ddd;">Available</th>
                            <th style="padding:8px; border:1px solid #ddd;">Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${insufficientStock
                            .map(
                                (item) => `
                                <tr style="background:#fef2f2;">
                                    <td style="padding:8px; border:1px solid #ddd;">${item.name}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.requested}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.available}</td>
                                    <td style="padding:8px; border:1px solid #ddd;">${item.type}</td>
                                </tr>`
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
                .join("\n");

            await Swal.fire({
                icon: "error",
                title: "Insufficient Stock",
                html: `
                    ${htmlTable}
                    <p style="margin-top:16px; font-weight:600;">Cannot fulfill these items:</p>
                    <p style="white-space:pre-line; text-align:left;">${shortItemsList}</p>
                `,
                confirmButtonText: "OK",
            });
            
            toast.dismiss(toastId);
            return null;
        }
        
        toast.error(error?.response?.data?.message || "Failed to confirm pre-order!");
        return null;
    } finally {

        toast.dismiss(toastId);
    }
};