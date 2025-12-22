import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportWorkOrderToPDF = (order, options, isPreview = false) => {
  const doc = new jsPDF();

  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;
  const MARGIN = 12;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  const logoUrl = "/logg.png";
  const logoHeight = 23;
  const logoWidth = 0;
  const rightX = PAGE_WIDTH - MARGIN;
  const leftX = MARGIN;

  const HEADER_HEIGHT = 35;
  const FOOTER_GAP_FROM_BOTTOM = 15;
  const PAGE_NUMBER_GAP_FROM_BOTTOM = 8;

  // --- 🎨 FUNCTION TO DRAW HEADER ON EVERY PAGE ---
  const drawHeader = () => {
    let yPos = 15;
    const centerX = PAGE_WIDTH / 2;

    doc.addImage(logoUrl, "PNG", centerX - 23 / 2, 5, logoWidth, logoHeight);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41);
    doc.text("WORK ORDER", leftX, yPos + 2);

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`WO #: ${order.orderNumber}`, leftX, yPos + 7);

    const dateObj = new Date(order.date);
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    const year = dateObj.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;
    doc.text(`Date: ${formattedDate}`, leftX, yPos + 11);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(41, 98, 255);
    doc.text("Vali Produce", rightX, yPos + 2, { align: "right" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text("4300 Pleasantdale Rd,", rightX, yPos + 7, { align: "right" });
    doc.text("Atlanta, GA 30340, USA", rightX, yPos + 11, { align: "right" });
    doc.text("order@valiproduce.shop", rightX, yPos + 15, { align: "right" });
  };
  // ----------------------------------------------------

  // 1. Draw header on first page
  drawHeader();

  let yPos = HEADER_HEIGHT;

  // ----------- ORDER INFO + ASSIGNMENT DETAILS -----------
  const columnWidth = CONTENT_WIDTH / 2 - 2;

  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, yPos, columnWidth, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Order Information:", MARGIN + 4, yPos + 6);
  doc.setFontSize(8);
  doc.text(`Order #: ${order.id}`, MARGIN + 4, yPos + 12);
  doc.text(`Client: ${order.clientName}`, MARGIN + 4, yPos + 18);
  doc.text(`Order Date: ${order.date}`, MARGIN + 4, yPos + 24);

  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN + columnWidth + 4, yPos, columnWidth, 28, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Assignment Details:", MARGIN + columnWidth + 8, yPos + 6);
  doc.setFontSize(8);
  doc.text(
    `Assigned To: ${options.assignedTo}`,
    MARGIN + columnWidth + 8,
    yPos + 12
  );
  if (options.department) {
    doc.text(
      `Department: ${options.department}`,
      MARGIN + columnWidth + 8,
      yPos + 18
    );
  }
  if (options.priority) {
    const priorityColor = {
      low: [0, 128, 0],
      medium: [255, 165, 0],
      high: [255, 69, 0],
      urgent: [255, 0, 0],
    }[options.priority];
    doc.setTextColor(...priorityColor);
    doc.text(
      `Priority: ${options.priority.toUpperCase()}`,
      MARGIN + columnWidth + 8,
      yPos + 24
    );
    doc.setTextColor(0, 0, 0);
  }

  yPos += 36;

  // ----------- PALLET INFORMATION (optional) -----------
  if (options.palletData) {
    if (yPos + 50 > PAGE_HEIGHT - FOOTER_GAP_FROM_BOTTOM) {
      doc.addPage();
      drawHeader();
      yPos = HEADER_HEIGHT;
    }
    doc.setFillColor(245, 250, 245);
    doc.rect(MARGIN, yPos, CONTENT_WIDTH, 36, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Pallet Information:", MARGIN + 4, yPos + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Total Pallets:`, MARGIN + 4, yPos + 14);
    doc.text(`Total Boxes:`, MARGIN + 70, yPos + 14);
    doc.text(`Charge Per Pallet:`, MARGIN + 140, yPos + 14);
    doc.text(`Total Pallet Charge:`, MARGIN + 140, yPos + 22);
    doc.text("Box Distribution:", MARGIN + 4, yPos + 22, { maxWidth: 130 });
    yPos += 38;
  }

  // ----------- ORDER ITEMS TABLE -----------
  if (yPos + 20 > PAGE_HEIGHT - FOOTER_GAP_FROM_BOTTOM) {
    doc.addPage();
    drawHeader();
    yPos = HEADER_HEIGHT;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Order Items to Process:", MARGIN, yPos);
  yPos += 2;

  const tableHeaders = options.palletData
    ? ["Product Name", "Qty", "Boxes", "Instructions"]
    : ["Item ID", "Qty", "Instructions"];
  const tableRows = order.items.map((item) => {
    const row = [
      item.productName,
      `${item.quantity}${
        item.pricingType && item.pricingType !== "box"
          ? " " + (item.pricingType === "unit" ? "LB" : item.pricingType)
          : ""
      }`,
    ];
    if (options.palletData)
      row.push(
        options.palletData.boxesPerPallet[item.productId]?.toString() || "0"
      );
    row.push(options.itemInstructions?.[item.productId] || "");
    return row;
  });

  const colCount = tableHeaders.length;
  const colWidth = CONTENT_WIDTH / colCount;
  const columnStyles = {};
  for (let i = 0; i < colCount; i++) columnStyles[i] = { cellWidth: colWidth };

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableRows,
    margin: {
      top: HEADER_HEIGHT,
      bottom: FOOTER_GAP_FROM_BOTTOM + 15,
      left: MARGIN,
      right: MARGIN,
    },
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: {
      lineWidth: 0.4,
      lineColor: [50, 50, 50],
      textColor: [0, 0, 0],
      fontSize: 8,
      fontStyle: "bold",
    },
    columnStyles,
    alternateRowStyles: { fillColor: [250, 250, 250] },

    didDrawPage: (data) => {
      // Header
      drawHeader();

      // Footer
      const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();
      const footerY = PAGE_HEIGHT - FOOTER_GAP_FROM_BOTTOM;

      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150);
      doc.text(
        `This work order is based on Order #${order.id}. Complete all tasks according to company procedures.`,
        PAGE_WIDTH / 2,
        footerY,
        { align: "center" }
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(
        `Page ${pageNumber} of ${totalPages}`,
        PAGE_WIDTH - MARGIN,
        PAGE_HEIGHT - PAGE_NUMBER_GAP_FROM_BOTTOM,
        { align: "right" }
      );
    },
  });

  yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 10 : yPos + 100;

  // ----------- TOTAL & SIGNATURE SECTION -----------
  const totalQuantity = order.items.reduce((t, i) => t + i.quantity, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Total Box: ${totalQuantity}`, MARGIN, yPos);

  if (yPos + 50 > PAGE_HEIGHT - FOOTER_GAP_FROM_BOTTOM) {
    doc.addPage();
    drawHeader();
    yPos = HEADER_HEIGHT;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  yPos += 20;
  doc.text("Completion Signatures:", MARGIN, yPos);
  yPos += 5;

  const signatureWidth = CONTENT_WIDTH / 2 - 5;
  doc.setLineWidth(0.1);
  doc.rect(MARGIN, yPos, signatureWidth, 25);
  doc.setFontSize(8);
  doc.text("Completed By:", MARGIN + 4, yPos + 6);
  doc.line(MARGIN + 4, yPos + 16, MARGIN + signatureWidth - 4, yPos + 16);
  doc.text("Signature", MARGIN + 4, yPos + 22);
  doc.text("Date: ________________", MARGIN + signatureWidth - 50, yPos + 22);

  doc.rect(MARGIN + signatureWidth + 10, yPos, signatureWidth, 25);
  doc.text("Approved By:", MARGIN + signatureWidth + 14, yPos + 6);
  doc.line(
    MARGIN + signatureWidth + 14,
    yPos + 16,
    MARGIN + 2 * signatureWidth + 6,
    yPos + 16
  );
  doc.text("Signature", MARGIN + signatureWidth + 14, yPos + 22);
  doc.text(
    "Date: ________________",
    MARGIN + 2 * signatureWidth - 40,
    yPos + 22
  );

  // --- ✅ FINAL Footer & Page Number ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const footerY = PAGE_HEIGHT - FOOTER_GAP_FROM_BOTTOM;

    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(150);
    doc.text(
      `This work order is based on Order #${order.id}. Complete all tasks according to company procedures.`,
      PAGE_WIDTH / 2,
      footerY,
      { align: "center" }
    );

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(
      `Page ${i} of ${totalPages}`,
      PAGE_WIDTH - MARGIN,
      PAGE_HEIGHT - PAGE_NUMBER_GAP_FROM_BOTTOM,
      { align: "right" }
    );
  }

  if (!isPreview) {
    doc.save(`${options.workOrderNumber} ${order.clientName}.pdf`);
  }

  return doc;
};
