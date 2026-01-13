import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Template color schemes
const templateColors = {
  standard: {
    primary: [55, 65, 81],      // gray-700
    accent: [243, 244, 246],    // gray-100
    headerBg: [249, 250, 251],  // gray-50
    headerText: [55, 65, 81],   // gray-700
    tableBg: [250, 250, 250],   // gray-50
  },
};

export const exportPreOrderToPDF = (
  order: any,
  options: {
    includeLogo?: boolean;
  } = {}
) => {
  const { includeLogo = true } = options;
  const colors = templateColors.standard;

  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const MARGIN = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const HEADER_HEIGHT = 32;

  // 🧭 HEADER
  const drawHeader = (doc: jsPDF) => {
    const yStart = 12;

    if (includeLogo) {
      try {
        const logoUrl = "/logg.png";
        doc.addImage(logoUrl, "PNG", PAGE_WIDTH / 2 - 10, 8, 0, 18);
      } catch (e) {
        // Logo not loaded
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("PREORDER", MARGIN, yStart + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`#${order.preOrderNumber || order.id}`, MARGIN, yStart + 10);
    doc.text(`${formatDate(order.createdAt || order.date)}`, MARGIN, yStart + 15);

    // Company Details - Right Side
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Vali Produce", PAGE_WIDTH - MARGIN, yStart + 4, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("4300 Pleasantdale Rd", PAGE_WIDTH - MARGIN, yStart + 10, { align: "right" });
    doc.text("Atlanta, GA 30340, USA", PAGE_WIDTH - MARGIN, yStart + 15, { align: "right" });
    doc.text("order@valiproduce.shop", PAGE_WIDTH - MARGIN, yStart + 20, { align: "right" });
  };

  drawHeader(doc);

  // 🧩 BILL/SHIP SECTION
  let yPos = HEADER_HEIGHT + 6;
  const boxHeight = 36;
  
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 3, 3, "F");

  // SOLD TO (Billing Address)
  const billX = MARGIN + 6;
  const billY = yPos + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SOLD TO", billX, billY);
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text( order?.store?.storeName || "N/A", billX, billY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(order?.billingAddress?.address || "N/A", billX, billY + 11);
  doc.text(`${order?.billingAddress?.city || ""}, ${order?.billingAddress?.state || ""} ${order?.billingAddress?.zipCode || order?.billingAddress?.postalCode || ""}`, billX, billY + 16);
  doc.text(`Phone: ${order?.billingAddress?.phone || "N/A"}`, billX, billY + 21);

  // SHIP TO (Shipping Address)
  const shipX = PAGE_WIDTH / 2 + 6;
  const shipY = yPos + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SHIP TO", shipX, shipY);
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  
  // Use shipping address if available, otherwise use billing address
  const shippingAddr = order?.shippingAddress || order?.billingAddress;
  doc.text(order?.store?.storeName || "N/A", shipX, shipY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(shippingAddr?.address || "N/A", shipX, shipY + 11);
  doc.text(`${shippingAddr?.city || ""}, ${shippingAddr?.state || ""} ${shippingAddr?.zipCode || shippingAddr?.postalCode || ""}`, shipX, shipY + 16);
  doc.text(`Phone: ${shippingAddr?.phone || "N/A"}`, shipX, shipY + 21);

  yPos += boxHeight + 8;

  // 🪶 TABLE - Only Product Name and Quantity (No Price)
  const tableHeaders = ["Product", "Qty"];
  const items = order.items || order.products || [];
  const tableRows = items.map((item: any) => [
    item.product?.name || item.productName || item.name || "N/A",
    `${item.quantity || 0}${item.pricingType && item.pricingType !== "box" ? " " + (item.pricingType === "unit" ? "LB" : item.pricingType) : ""}`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN, top: HEADER_HEIGHT + 10 },
    headStyles: {
      fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 4,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },   // Product
      1: { cellWidth: 40, halign: 'right' },      // Qty - Align Right
    },
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index === 1) {
        data.cell.styles.halign = 'right';
      }
    },
    alternateRowStyles: { 
      fillColor: [colors.tableBg[0], colors.tableBg[1], colors.tableBg[2]] 
    },
    tableWidth: CONTENT_WIDTH,
  });

  // Pre-Order Note
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  doc.setFillColor(255, 251, 235);
  doc.setDrawColor(251, 191, 36);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 20, 3, 3, "FD");
  doc.setFont("helvetica", "bold");
  doc.setTextColor(180, 83, 9);
  doc.text("Note:", MARGIN + 6, yPos + 8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(146, 64, 14);
  const noteText = "This is a Pre-Order. Delivery timeline and order details will be reviewed and the Actual Order will be updated accordingly.";
  doc.text(noteText, MARGIN + 20, yPos + 8, { maxWidth: CONTENT_WIDTH - 26 });

  // Save PDF
  const customerName = ( order?.store?.storeName || "Customer")
    .trim()
    .replace(/\s+/g, " ");

  doc.save(`PreOrder-${order.preOrderNumber || order.id}-${customerName}.pdf`);
  return doc;
};
