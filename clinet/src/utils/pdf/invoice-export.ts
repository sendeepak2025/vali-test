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
  order: Order,
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

  // Header height based on template
  const HEADER_HEIGHT = (invoiceTemplate === "professional" || invoiceTemplate === "detailed") ? 38 : 32;

  // 🧭 HEADER
  const drawHeader = (doc: jsPDF, isFirstPage: boolean = false) => {
    if (!includeHeader && !isFirstPage) return;

    // Header background for professional/detailed templates
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
      doc.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");
    }

    const yStart = 12;

    // Logo in center
    if (includeLogo) {
      try {
        const logoUrl = "/logg.png";
        if (invoiceTemplate === "professional") {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(PAGE_WIDTH / 2 - 14, 6, 28, 24, 3, 3, "F");
        }
        doc.addImage(logoUrl, "PNG", PAGE_WIDTH / 2 - 10, 8, 0, 18);
      } catch (e) {
        console.log("Logo not loaded");
      }
    }

    // Left side - Invoice info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    }
    doc.text("INVOICE", MARGIN, yStart + 4);

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

    // Right side - Company details
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

  // Draw header on first page
  drawHeader(doc, true);

  // 🧩 BILL/SHIP SECTION
  let yPos = HEADER_HEIGHT + 6;
  const boxHeight = 36;
  
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 3, 3, "F");

  // Sold To
  const billX = MARGIN + 6;
  const billY = yPos + 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SOLD TO", billX, billY);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(order?.billingAddress?.name || "N/A", billX, billY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(order?.billingAddress?.address || "N/A", billX, billY + 11);
  doc.text(
    `${order?.billingAddress?.city || ""}, ${order?.billingAddress?.state || ""} ${order?.billingAddress?.postalCode || ""}`,
    billX, billY + 16
  );
  doc.text(`Phone: ${order?.billingAddress?.phone || "N/A"}`, billX, billY + 21);

  // Ship To
  const shipX = PAGE_WIDTH / 2 + 6;
  const shipY = yPos + 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("SHIP TO", shipX, shipY);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  doc.text(order?.shippingAddress?.name || "N/A", shipX, shipY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(80, 80, 80);
  doc.text(order?.shippingAddress?.address || "N/A", shipX, shipY + 11);
  doc.text(
    `${order?.shippingAddress?.city || ""}, ${order?.shippingAddress?.state || ""} ${order?.shippingAddress?.postalCode || ""}`,
    shipX, shipY + 16
  );
  doc.text(`Phone: ${order?.shippingAddress?.phone || "N/A"}`, shipX, shipY + 21);

  yPos += boxHeight + 8;

  // 🪶 TABLE
  const tableHeaders = ["Product", "Qty", "Unit Price", "Amount"];
  const tableRows = order.items.map((item) => [
    item.name || item.productName,
    `${item.quantity}${
      item.pricingType && item.pricingType !== "box"
        ? " " + (item.pricingType === "unit" ? "LB" : item.pricingType)
        : ""
    }`,
    formatCurrency(item.unitPrice || item.price),
    formatCurrency(item.quantity * (item.unitPrice || item.price)),
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableRows,
    margin: { left: MARGIN, right: MARGIN, top: HEADER_HEIGHT + 10, bottom: 30 },
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
    },
    alternateRowStyles: { 
      fillColor: [colors.tableBg[0], colors.tableBg[1], colors.tableBg[2]] 
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 35 },
      3: { halign: 'right', cellWidth: 35 },
    },
    didDrawPage: (data) => {
      // Only draw header on subsequent pages (not first)
      if (data.pageNumber > 1) {
        drawHeader(doc, false);
      }
    },
  });

  // 🧾 TOTALS
  yPos = doc.lastAutoTable.finalY + 12;
  
  // Check if we need a new page for totals
  if (yPos + 50 > PAGE_HEIGHT - 30) {
    doc.addPage();
    drawHeader(doc, false);
    yPos = HEADER_HEIGHT + 15;
  }

  const subTotal = order.total - (order.shippinCost || 0);
  const shippingCost = order.shippinCost || 0;
  const allTotal = subTotal + shippingCost;

  // Totals box
  const totalsWidth = 80;
  const totalsX = PAGE_WIDTH - MARGIN - totalsWidth;
  
  doc.setFillColor(colors.accent[0], colors.accent[1], colors.accent[2]);
  doc.roundedRect(totalsX, yPos, totalsWidth, 32, 3, 3, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  
  doc.text("Subtotal:", totalsX + 6, yPos + 8);
  doc.text(formatCurrency(subTotal), PAGE_WIDTH - MARGIN - 6, yPos + 8, { align: "right" });

  doc.text("Shipping:", totalsX + 6, yPos + 15);
  doc.text(formatCurrency(shippingCost), PAGE_WIDTH - MARGIN - 6, yPos + 15, { align: "right" });

  // Total divider line
  doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.setLineWidth(0.5);
  doc.line(totalsX + 6, yPos + 19, PAGE_WIDTH - MARGIN - 6, yPos + 19);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Total:", totalsX + 6, yPos + 27);
  doc.text(formatCurrency(allTotal), PAGE_WIDTH - MARGIN - 6, yPos + 27, { align: "right" });

  yPos += 40;

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
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text("Authorized Signature", sigX + 35, yPos + 22, { align: "center" });
    
    yPos += 30;
  }

  // 🧾 FOOTER - Thank you message and payment terms (at page bottom with safe margin)
  if (includePaymentTerms) {
    // Calculate footer height based on template
    const footerHeight = invoiceTemplate === "detailed" ? 35 : 25;
    // Safe margin from bottom to prevent cutoff in Microsoft Print to PDF
    const SAFE_BOTTOM_MARGIN = 18;
    const footerStartY = PAGE_HEIGHT - footerHeight - SAFE_BOTTOM_MARGIN;
    
    // Footer background
    if (invoiceTemplate === "professional") {
      doc.setFillColor(5, 150, 105); // emerald-600
      doc.rect(0, footerStartY, PAGE_WIDTH, footerHeight, "F");
    } else if (invoiceTemplate === "detailed") {
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, footerStartY, PAGE_WIDTH, footerHeight, "F");
    } else {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, footerStartY + 3, PAGE_WIDTH - MARGIN, footerStartY + 3);
    }
    
    // Thank you message
    const thankYouY = footerStartY + 10;
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setTextColor(80, 80, 80);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Thank you for your business!", PAGE_WIDTH / 2, thankYouY, { align: "center" });
    
    // Payment due text
    if (invoiceTemplate === "professional" || invoiceTemplate === "detailed") {
      doc.setTextColor(200, 200, 200);
    } else {
      doc.setTextColor(120, 120, 120);
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Payment due by ${dueDate} • Fresh Produce Wholesale`, PAGE_WIDTH / 2, thankYouY + 6, { align: "center" });
    
    // Verified badge for detailed template
    if (invoiceTemplate === "detailed") {
      const badgeY = thankYouY + 14;
      const badgeWidth = 70;
      const badgeX = PAGE_WIDTH / 2 - badgeWidth / 2;
      
      // Green badge background
      doc.setFillColor(34, 197, 94); // green-500
      doc.roundedRect(badgeX, badgeY - 4, badgeWidth, 10, 5, 5, "F");
      
      // Badge text
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text("✓ Verified & Ready for Payment", PAGE_WIDTH / 2, badgeY + 2, { align: "center" });
    }
    
    // Professional template tagline
    if (invoiceTemplate === "professional") {
      doc.setTextColor(180, 220, 200);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text("Quality Fresh Produce • Reliable Delivery • Wholesale Pricing", PAGE_WIDTH / 2, thankYouY + 13, { align: "center" });
    }
  }

  // Page number - removed from bottom to avoid print cutoff issues
  // Page numbers are now not shown to prevent Microsoft Print to PDF issues

  doc.save(`Invoice-${order.id}-${order?.billingAddress?.name || 'Customer'}.pdf`);
  return doc;
};
