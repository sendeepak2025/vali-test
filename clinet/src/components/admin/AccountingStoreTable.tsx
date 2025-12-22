import React, { useState } from "react";
import { userWithOrderDetails } from "@/services2/operations/auth";
import { useToast } from "@/hooks/use-toast";
import UserDetailsModal from "./user-details-modal";

const AccountingStoreTable = ({ loading, groups }: any) => {
  const [selectedUserData, setSelectedUserData] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const { toast } = useToast();

  // CSV Export Function
  const handleDownloadCSV = () => {
    if (!groups || groups.length === 0) return;

    const headers = [
      "Store Name",
      "Phone",
      "Total Orders",
      "Total Spent",
      "Total Paid",
      "Balance Due",
    ];

    const rows = groups.map((group: any) => {
      const details = group?.userDetails || {};
      return [
        group?.storeName ?? "N/A",
        group?.phone ?? "N/A",
        details?.totalOrders ?? 0,
        details?.totalSpent ?? 0,
        details?.totalPay ?? 0,
        details?.balanceDue ?? 0,
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "stores_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchUserDetailsOrder = async (id: any) => {
    try {
      const res = await userWithOrderDetails(id);
      console.log(res);
      setSelectedUserData(res);
      setUserDetailsOpen(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch user details",
        variant: "destructive",
      });
    }
  };
  console.log(groups, "groups");
  return (
    <div className="p-4 overflow-x-auto bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Stores Report</h2>
        <button
          onClick={handleDownloadCSV}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          Download CSV
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-lg shadow-md overflow-x-scroll">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-primary/10 text-gray-900 uppercase text-xs font-medium tracking-wider">
                <th className="px-6 py-4">Store Name</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Total Orders</th>
                <th className="px-6 py-4">Total Spent</th>
                <th className="px-6 py-4">Total Paid</th>
                <th className="px-6 py-4">Balance Due</th>
                <th className="px-6 py-4">Last Pay Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {groups?.length > 0 ? (
                groups.map((group: any) => {
                  const details = group?.userDetails || {};

                  return (
                    <tr
                      onClick={() =>
                        fetchUserDetailsOrder(group?.id || group?._id)
                      }
                      key={group?.id || group?._id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">
                        {group?.storeName ?? "N/A"}
                      </td>
                      <td className="px-6 py-4">{group?.phone ?? "N/A"}</td>
                      <td className="px-6 py-4">{details?.totalOrders ?? 0}</td>
                      <td className="px-6 py-4">
                        ${details?.totalSpent?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        ${details?.totalPay?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        ${details?.balanceDue?.toFixed(2) ?? "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        {details?.lastPayment?.payment?.paymentDate
                          ? new Date(
                              details.lastPayment.payment.paymentDate
                            ).toLocaleDateString("en-US", {
                              timeZone: "UTC",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "N/A"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No stores found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <UserDetailsModal
        isOpen={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        userData={selectedUserData}
        fetchUserDetailsOrder={fetchUserDetailsOrder}
      />
    </div>
  );
};

export default AccountingStoreTable;
