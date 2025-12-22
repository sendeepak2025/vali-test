import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface TripPDFProps {
  trip: any;
}

const TripPDF = ({ trip }: TripPDFProps) => {
  const downloadPDF = () => {
    if (!trip) return;

    const doc = new jsPDF();
    let y = 20;
    const leftX = 14;
    const rightX = 105; // Starting X-coordinate for the right column

    // Title
    doc.setFontSize(16);
    doc.text(`Trip Preview - ${trip._id}`, leftX, y);
    y += 10;

    // ## Route & Date & Status (Updated Layout)
    doc.setFontSize(12);
    
    // --- Row 1: Route (Left) and Date (Right) ---
    // --- Row 1: Route (Left) and Date (Right) ---
doc.setFont("helvetica", "normal"); // Ensure normal font
doc.setFontSize(12);
doc.text(`Route: ${trip.route.from} - ${trip.route.to}`, leftX, y); 
doc.text(`Date: ${new Date(trip.date).toLocaleDateString()}`, rightX, y);

    y += 6;
    
    // --- Row 2: Status (Left) ---
    doc.text(`Status: ${trip.status}`, leftX, y);
    
    y += 10; // Next major section starts here
    
    // --- Driver & Truck Details (Side-by-Side) ---
    const startY = y; // Save starting Y for both columns

    // 1. Driver Details (Left Column)
    let driverY = startY;
    doc.setFontSize(13);
    doc.text("Driver Details", leftX, driverY);
    driverY += 6;

    doc.setFontSize(11);
    doc.text(`Name: ${trip.driver?.name || "-"}`, leftX, driverY);
    driverY += 5;
    doc.text(`Phone: ${trip.driver?.phone || "-"}`, leftX, driverY);
    driverY += 5;
    doc.text(`License No: ${trip.driver?.license_number || "-"}`, leftX, driverY);
    driverY += 5;
    doc.text(
      `License Expiry: ${
        trip.driver?.license_expiry_date
          ? new Date(trip.driver.license_expiry_date).toLocaleDateString()
          : "-"
      }`,
      leftX,
      driverY
    );
    driverY += 5;

    // 2. Truck Details (Right Column)
    let truckY = startY;
    doc.setFontSize(13);
    doc.text("Truck Details", rightX, truckY);
    truckY += 6;

    doc.setFontSize(11);
    doc.text(`Truck Number: ${trip.selectedTruck?.truck_number || "-"}`, rightX, truckY);
    truckY += 5;
    doc.text(
      `Capacity: ${trip.selectedTruck?.capacity_kg || 0} kg / ${
        trip.selectedTruck?.capacity_m3 || 0
      } m³`,
      rightX,
      truckY
    );
    truckY += 5;

    // Update the global Y to the maximum of the two columns + spacing
    y = Math.max(driverY, truckY) + 10;

    // --- Orders Per Store Summary ---
    const storeCountMap: Record<string, number> = {};
    trip.orders.forEach((order: any) => {
      const storeName =
        order.store?.storeName ||
        order.orderData?.store?.storeName ||
        "Unknown Store";
      storeCountMap[storeName] = (storeCountMap[storeName] || 0) + 1;
    });

    doc.setFontSize(13);
    // doc.text("Orders Per Store", leftX, y);
    // y += 6;
    // doc.setFontSize(11);
    // Object.entries(storeCountMap).forEach(([store, count]) => {
    //   doc.text(`${store}: ${count} order(s)`, leftX, y);
    //   y += 5;
    // });
    // y += 10;

    // --- Orders Table (Like in Modal) ---
    doc.setFontSize(13);
    doc.text("Order Details", leftX, y);
    y += 6;

    const tableData = trip.orders.map((order: any) => {
      const orderData = order.orderData || order.order_id || {};
      return [
        orderData.orderNumber || "-",
        order.store?.storeName || orderData.store?.storeName || "Unknown",
        `${order.capacity_kg || 0}`,
        `${order.capacity_m3 || 0}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Order Number", "Store", "Capacity (lbs)", "Box Size"]],
      body: tableData,
      theme: "grid",
      headStyles: { 
        fillColor: [0, 0, 0], 
        textColor: [255, 255, 255] 
      },
      styles: { fontSize: 10 },
      margin: { left: leftX, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // --- Trip Capacity ---
    doc.setFontSize(12);
    doc.text(
      `Trip Capacity: ${trip.capacity_kg} kg / ${trip.capacity_m3} m³`,
      leftX,
      y
    );
    y += 10;

    // --- Timestamp Footer ---
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
      leftX,
      y
    );

    // Save File
    doc.save(`Trip_${trip._id}.pdf`);
  };

  return (
    <button
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mb-5"
      onClick={downloadPDF}
    >
      Download PDF
    </button>
  );
};

export default TripPDF;