import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/utils/formatters";
import { Order } from "@/lib/data";

// Template color schemes
const templateColors = {
  standard: {
    primary: [55, 65, 81],      // gray-700
    accent: [243, 244, 246],    // gray-100
    headerBg: [249, 250, 251],  // gray-50
    headerText: [55, 65, 81],   // gray-700
    tableBg: [250, 250, 250],   // gray-50
  },
  professional: {
    primary: [5, 150, 105],     // emerald-600
    accent: [236, 253, 245],    // emerald-50
    headerBg: [5, 150, 105],    // emerald-600
    headerText: [255, 255, 255], // white
    tableBg: [236, 253, 245],   // emerald-50
  },
  minimal: {
    primary: [107, 114, 128],   // gray-500
    accent: [255, 255, 255],    // white
    headerBg: [255, 255, 255],  // white
    headerText: [75, 85, 99],   // gray-600
    tableBg: [249, 250, 251],   // gray-50
  },
  detailed: {
    primary: [30, 41, 59],      // slate-800
    accent: [248, 250, 252],    // slate-50
    headerBg: [30, 41, 59],     // slate-800
    headerText: [255, 255, 255], // white
    tableBg: [248, 250, 252],   // slate-50
  },
};

export const exportInvoiceToPDF = (
  order: Order & { preOrder?: boolean },
  options: {
    includeHeader?: boolean;
    includeCompanyDetails?: boolean;
    includePaymentTerms?: boolean;
    includeLogo?: boolean;
    includeSignature?: boolean;
    dueDate?: string;
    invoiceTemplate?: string;
  } = {}
) => {
  const {
    includeHeader = true,
    includeCompanyDetails = true,
    includePaymentTerms = true,
    includeLogo = true,
    includeSignature = false,
    dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    invoiceTemplate = "standard",
  } = options;

  const isPreOrder = order.preOrder === true;
  const colors = templateColors[invoiceTemplate as keyof typeof templateColors] || templateColors.standard;

  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;
  const MARGIN = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  const HEADER_HEIGHT = (invoiceTemplate === "professional" || invoiceTemplate === "detailed") ? 38 : 32;

  // 🧭 HEADER
  const drawHeader = (doc: jsPDF, isFirstPage: boolean = false) => {
    if (!includeHeader && !isFirstPage) return;

    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
      doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");
    }

    const yStart = 12;

    if (includeLogo) {
      try {
        const logoUrl = "/logg.png";
        if (invoiceTemplate === "professional") {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(PAGE_WIDTH / 2 - 14, 6, 28, 24, 3, 3, "F");
        }
        doc.addImage(logoUrl, "PNG", PAGE_WIDTH / 2 - 10, 8, 0, 18);
      } catch (e) {
        // Logo not loaded
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    }
    doc.text(isPreOrder ? "PREORDER" : "INVOICE", MARGIN, yStart + 4);


    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setTextColor(230, 230, 230);
    } else {
      doc.setTextColor(100, 100, 100);
    }
    doc.text(`#${order.id}`, MARGIN, yStart + 10);
    doc.text(`${formatDate(order.date)}`, MARGIN, yStart + 15);
    if (dueDate) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      if (invoiceTemplate === "professional") {
        doc.setTextColor(255, 220, 100);
      } else if (invoiceTemplate === "detailed") {
        doc.setTextColor(251, 191, 36);
      } else {
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      }
      doc.text(`Due: ${dueDate}`, MARGIN, yStart + 20);
    }

    if (includeCompanyDetails) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
        doc.setTextColor(255, 255, 255);
      } else {
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      }
      doc.text("Vali Produce", PAGE_WIDTH - MARGIN, yStart + 4, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
        doc.setTextColor(210, 210, 210);
      } else {
        doc.setTextColor(120, 120, 120);
      }
      doc.text("4300 Pleasantdale Rd", PAGE_WIDTH - MARGIN, yStart + 10, { align: "right" });
      doc.text("Atlanta, GA 30340, USA", PAGE_WIDTH - MARGIN, yStart + 15, { align: "right" });
      doc.text("order@valiproduce.shop", PAGE_WIDTH - MARGIN, yStart + 20, { align: "right" });
    }
  };

  drawHeader(doc, true);

  // 🧩 BILL/SHIP SECTION
  let yPos = HEADER_HEIGHT + 6;
  const boxHeight = 36;
  
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 3, 3, "F");

  const billX = MARGIN + 6;
  const billY = yPos + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SOLD TO", billX, billY);
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(order?.billingAddress?.name || "N/A", billX, billY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(order?.billingAddress?.address || "N/A", billX, billY + 11);
  doc.text(`${order?.billingAddress?.city || ""}, ${order?.billingAddress?.state || ""} ${order?.billingAddress?.postalCode || ""}`, billX, billY + 16);
  doc.text(`Phone: ${order?.billingAddress?.phone || "N/A"}`, billX, billY + 21);

  const shipX = PAGE_WIDTH / 2 + 6;
  const shipY = yPos + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SHIP TO", shipX, shipY);
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(order?.shippingAddress?.name || "N/A", shipX, shipY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(order?.shippingAddress?.address || "N/A", shipX, shipY + 11);
  doc.text(`${order?.shippingAddress?.city || ""}, ${order?.shippingAddress?.state || ""} ${order?.shippingAddress?.postalCode || ""}`, shipX, shipY + 16);
  doc.text(`Phone: ${order?.shippingAddress?.phone || "N/A"}`, shipX, shipY + 21);

  yPos += boxHeight + 8;

  // 🪶 TABLE - UPDATED FOR ALIGNMENT
  const tableHeaders = ["Product", "Qty", "Unit Price", "Amount"];
  const tableRows = order.items.map((item) => [
    item.name || item.productName,
    `${item.quantity}${item.pricingType && item.pricingType !== "box" ? " " + (item.pricingType === "unit" ? "LB" : item.pricingType) : ""}`,
    formatCurrency(item.unitPrice || item.price),
    formatCurrency(item.quantity * (item.unitPrice || item.price)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN, top: HEADER_HEIGHT + 10 },
    headStyles: {
      fillColor: [colors.primary[0], colors.primary[1], colors.primary[2]],
      textColor: invoiceTemplate === "minimal" ? [50, 50, 50] : [255, 255, 255],
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
      1: { cellWidth: 25, halign: 'right' },      // Qty - Align Right
      2: { cellWidth: 35, halign: 'right' },      // Unit Price - Align Right
      3: { cellWidth: 35, halign: 'right' },      // Amount - Align Right
    },
    // Fix: Force header alignment to match column alignment
    didParseCell: (data) => {
      if (data.section === 'head' && data.column.index >= 1) {
        data.cell.styles.halign = 'right';
      }
    },
    alternateRowStyles: { 
      fillColor: [colors.tableBg[0], colors.tableBg[1], colors.tableBg[2]] 
    },
    tableWidth: CONTENT_WIDTH,
    didDrawPage: (data) => {
      // Draw header on all pages after the first
      if (data.pageNumber > 1) {
        drawHeader(doc, false);
      }
    },
  });

  // 🧾 TOTALS - UPDATED POSITIONING
  yPos = (doc as any).lastAutoTable.finalY + 12;
  
  if (yPos + 50 > PAGE_HEIGHT - 30) {
    doc.addPage();
    drawHeader(doc, false);
    yPos = HEADER_HEIGHT + 15;
  }

  const subTotal = order.total - (order.shippinCost || 0);
  const shippingCost = isPreOrder ? 0 : (order.shippinCost || 0);
  const allTotal = isPreOrder ? subTotal : (subTotal + shippingCost);

  // Totals box matches the width of the last three columns for better flow
  const totalsWidth = 95; 
  const totalsX = PAGE_WIDTH - MARGIN - totalsWidth;
  const totalsBoxHeight = isPreOrder ? 24 : 32;
  
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(totalsX, yPos, totalsWidth, totalsBoxHeight, 3, 3, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  const labelX = totalsX + 6;
  const valueX = PAGE_WIDTH - MARGIN - 6;

  doc.text("Subtotal:", labelX, yPos + 8);
  doc.text(formatCurrency(subTotal), valueX, yPos + 8, { align: "right" });

  if (!isPreOrder) {
    doc.text("Shipping:", labelX, yPos + 15);
    doc.text(formatCurrency(shippingCost), valueX, yPos + 15, { align: "right" });

    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(labelX, yPos + 19, valueX, yPos + 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Total:", labelX, yPos + 27);
    doc.text(formatCurrency(allTotal), valueX, yPos + 27, { align: "right" });
  } else {
    doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(labelX, yPos + 12, valueX, yPos + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("Total:", labelX, yPos + 20);
    doc.text(formatCurrency(allTotal), valueX, yPos + 20, { align: "right" });
  }

  yPos += isPreOrder ? 32 : 40;

  // Signature section
  if (includeSignature) {
    if (yPos + 30 > PAGE_HEIGHT - 50) {
      doc.addPage();
      drawHeader(doc, false);
      yPos = HEADER_HEIGHT + 15;
    }
    const sigX = PAGE_WIDTH - MARGIN - 70;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(sigX, yPos + 15, PAGE_WIDTH - MARGIN, yPos + 15);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Authorized Signature", sigX + 35, yPos + 22, { align: "center" });
    yPos += 30;
  }

  // Pre-Order Note
  if (isPreOrder) {
    if (yPos + 25 > PAGE_HEIGHT - 60) {
      doc.addPage();
      drawHeader(doc, false);
      yPos = HEADER_HEIGHT + 15;
    }
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
    yPos += 28;
  }

  // 🧾 FOOTER
  if (includePaymentTerms) {
    const footerHeight = invoiceTemplate === "detailed" ? 35 : 25;
    const SAFE_BOTTOM_MARGIN = 18;
    const footerStartY = PAGE_HEIGHT - footerHeight - SAFE_BOTTOM_MARGIN;
    
    if (invoiceTemplate === "professional") {
      doc.setFillColor(5, 150, 105);
      doc.rect(0, footerStartY, PAGE_WIDTH, footerHeight, "F");
    } else if (invoiceTemplate === "detailed") {
      doc.setFillColor(30, 41, 59);
      doc.rect(0, footerStartY, PAGE_WIDTH, footerHeight, "F");
    } else {
      doc.setDrawColor(220, 220, 220);
      doc.line(MARGIN, footerStartY + 3, PAGE_WIDTH - MARGIN, footerStartY + 3);
    }
    
    const thankYouY = footerStartY + 10;
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") doc.setTextColor(255, 255, 255);
    else doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Thank you for your business!", PAGE_WIDTH / 2, thankYouY, { align: "center" });
    
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") doc.setTextColor(200, 200, 200);
    else doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    // doc.text(`Payment due by ${dueDate} • Fresh Produce Wholesale`, PAGE_WIDTH / 2, thankYouY + 6, { align: "center" });
  }

const fileType = isPreOrder ? "PreOrder" : "Invoice";

doc.save(`${fileType}-${order.id}-${order?.billingAddress?.name || 'Customer'}.pdf`);
  return doc;
};