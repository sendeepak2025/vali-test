// utils/generatePurchaseOrderPDF.js
const { jsPDF } = require("jspdf");
require("jspdf-autotable");
const { format } = require("date-fns");
const { toZonedTime } = require("date-fns-tz");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

exports.generatePurchaseOrderPDF = async (orderData) => {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })

    const MARGIN = 10
    const PAGE_WIDTH = doc.internal.pageSize.getWidth()
    const PAGE_HEIGHT = doc.internal.pageSize.getHeight()
  
    

    const centerX = PAGE_WIDTH / 2


    const logoPath = path.join(__dirname, "../images/logo.webp");
    if (!fs.existsSync(logoPath)) {
      console.error("Image file not found:", logoPath);
      return;
    }

    // Convert WEBP to PNG base64
    const logoBuffer = await sharp(logoPath)
      .resize(150)  // Resize if needed
      .toFormat('png')
      .toBuffer();

    const logoBase64 = logoBuffer.toString('base64');

    const logoHeight = 40;
    const logoWidth = 0;  // Assuming square logo. Adjust as needed.

    // Center the logo horizontally
    doc.addImage(logoBase64, 'PNG', 0, -3, logoWidth, logoHeight);



     const usTimeZone = "America/New_York";
    const poDate = format(toZonedTime(new Date(orderData.purchaseDate), usTimeZone), "MM/dd/yyyy");


    // 🏢 Company Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("VALI PRODUCE INC.", PAGE_WIDTH - MARGIN, 15, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("4300 Pleasantdale Rd, Atlanta, GA 30340", PAGE_WIDTH - MARGIN, 20, { align: "right" });
    doc.text("Phone: +1 501 559 0123", PAGE_WIDTH - MARGIN, 25, { align: "right" });
    doc.text("Email: order@valiproduce.shop", PAGE_WIDTH - MARGIN, 30, { align: "right" });

    // 📦 Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("PURCHASE ORDER", centerX, 50, { align: "center" });

    // 📋 Order Info
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    let y = 65;
    doc.text(`Purchase Order #: ${orderData.purchaseOrderNumber || "-"}`, MARGIN, y);
    y += 6;
    doc.text(`Purchase Date: ${poDate}`, MARGIN, y);

    // 🏢 Vendor Details
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("VENDOR DETAILS", MARGIN, y);

    doc.setFontSize(10);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Name:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.vendor?.name || "-", MARGIN + 30, y);

    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Contact:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.vendor?.contactName || "-", MARGIN + 30, y);

    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Phone:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.vendor?.phone || "-", MARGIN + 30, y);

    y += 7;
    doc.setFont("helvetica", "bold");
    doc.text("Address:", MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.text(orderData.vendor?.address || "-", MARGIN + 30, y, { maxWidth: 150 });

    // 📦 Order Items Table
    const headers = [["#", "Product Name", "Quantity"]];
    const body = orderData.items.map((item, idx) => [
      idx + 1,
      item.productName,
      item.quantity,
    ]);

    doc.autoTable({
      startY: y + 15,
      head: headers,
      body,
      theme: "grid",
      styles: {
        fontSize: 11,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [41, 98, 255],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 15 },
        1: { cellWidth: 110 },
        2: { halign: "center", cellWidth: 40 },
      },
    });

    // 📜 Footer
    let finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text("Thank you for your partnership!", centerX, finalY, { align: "center" });

    // ✅ Return PDF as Base64
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    return pdfBase64;
  } catch (err) {
    console.error("❌ PDF generation failed:", err);
    return false;
  }
};
