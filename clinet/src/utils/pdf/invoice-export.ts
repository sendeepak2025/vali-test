import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/utils/formatters";
import { Order } from "@/lib/data";

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

  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;
  const MARGIN = 12;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
      d.getDate()
    ).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // 🧭 HEADER (same as your good PDF)
  const drawHeader = (doc: jsPDF) => {
    const yStart = 15;

    if (includeLogo) {
      const logoUrl = "/logg.png";
      doc.addImage(logoUrl, "PNG", PAGE_WIDTH / 2 - 23 / 2, 5, 0, 23);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(41, 98, 255);
    doc.text("INVOICE", MARGIN, yStart + 2);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.text(`Order #: ${order.id}`, MARGIN, yStart + 7);
    doc.text(`Date: ${formatDate(order.date)}`, MARGIN, yStart + 11);

    if (includeCompanyDetails) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(41, 98, 255);
      doc.text("Vali Produce", PAGE_WIDTH - MARGIN, yStart + 2, {
        align: "right",
      });

      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("4300 Pleasantdale Rd,", PAGE_WIDTH - MARGIN, yStart + 7, {
        align: "right",
      });
      doc.text("Atlanta, GA 30340, USA", PAGE_WIDTH - MARGIN, yStart + 11, {
        align: "right",
      });
      doc.text("order@valiproduce.shop", PAGE_WIDTH - MARGIN, yStart + 15, {
        align: "right",
      });
    }

    doc.setDrawColor(210);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, yStart + 20, PAGE_WIDTH - MARGIN, yStart + 20);
  };

  // 🧾 FOOTER
  const drawFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
    const footerY = PAGE_HEIGHT - 10;
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${pageNumber} of ${totalPages}`, PAGE_WIDTH - MARGIN, footerY, {
      align: "right",
    });
    doc.text(
      "This is a computer-generated document. No signature is required.",
      PAGE_WIDTH / 2,
      footerY,
      { align: "center" }
    );
  };

  // Draw header on first page only once
  drawHeader(doc);

  // 🧩 BILL/SHIP SECTION
  let yPos = 35;
  const boxHeight = 40;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, boxHeight, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);

  const billX = MARGIN + 4;
  const billY = yPos + 6;
  doc.text("Sold To:", billX, billY);
  doc.text(order?.billingAddress?.name || "N/A", billX, billY + 6);
  doc.text(order?.billingAddress?.address || "N/A", billX, billY + 11);
  doc.text(
    `${order?.billingAddress?.city || ""}, ${order?.billingAddress?.state || ""} ${
      order?.billingAddress?.postalCode || ""
    }`,
    billX,
    billY + 16
  );
  doc.text(`Phone: ${order?.billingAddress?.phone || "N/A"}`, billX, billY + 21);

  const shipX = PAGE_WIDTH / 2 + 4;
  const shipY = yPos + 6;
  doc.text("Ship To:", shipX, shipY);
  doc.text(order?.shippingAddress?.name || "N/A", shipX, shipY + 6);
  doc.text(order?.shippingAddress?.address || "N/A", shipX, shipY + 11);
  doc.text(
    `${order?.shippingAddress?.city || ""}, ${order?.shippingAddress?.state || ""} ${
      order?.shippingAddress?.postalCode || ""
    }`,
    shipX,
    shipY + 16
  );
  doc.text(`Phone: ${order?.shippingAddress?.phone || "N/A"}`, shipX, shipY + 21);

  yPos += boxHeight + 10;

  // 🪶 TABLE
  const tableHeaders = ["Item", "Qty", "Price", "Amount"];
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

let totalPagesExp = "{total_pages_count_string}";

autoTable(doc, {
  startY: yPos,
  head: [tableHeaders],
  body: tableRows,
  margin: { left: MARGIN, right: MARGIN, top: 40 },
  headStyles: {
    fillColor: [245, 245, 245],
    textColor: [70, 70, 70],
    fontStyle: "bold",
    fontSize: 8,
  },
  bodyStyles: {
    lineWidth: 0.3,
    lineColor: [60, 60, 60],
    fontSize: 9,
  },
  alternateRowStyles: { fillColor: [250, 250, 250] },

  didDrawPage: (data) => {
    const pageNumber = data.pageNumber;
    drawHeader(doc);

    // ✅ Use placeholder for total pages
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const str = `Page ${pageNumber} of ${totalPagesExp}`;
    doc.text(str, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 10, { align: "right" });

    doc.text(
      "This is a computer-generated document. No signature is required.",
      PAGE_WIDTH / 2,
      PAGE_HEIGHT - 10,
      { align: "center" }
    );
  },
});

// ✅ Replace placeholder with actual total pages count
if (typeof doc.putTotalPages === "function") {
  doc.putTotalPages(totalPagesExp);
}



  // 🧾 TOTALS (no header redraw here)
  yPos = doc.lastAutoTable.finalY + 10;
  if (yPos + 30 > PAGE_HEIGHT - 20) {
    doc.addPage();
    drawHeader(doc);
    yPos = 44;
  }

  const subTotal = order.total - order.shippinCost;
  const shippingCost = order.shippinCost;
  const allTotal = subTotal + shippingCost;

  doc.setFontSize(9);
  doc.text("Subtotal:", PAGE_WIDTH - MARGIN - 60, yPos);
  doc.text(formatCurrency(subTotal), PAGE_WIDTH - MARGIN, yPos, { align: "right" });

  // yPos += 5;
  // doc.text("Shipping Cost:", PAGE_WIDTH - MARGIN - 60, yPos);
  // doc.text(formatCurrency(shippingCost), PAGE_WIDTH - MARGIN, yPos, { align: "right" });

  yPos += 7;
  doc.setLineWidth(0.4);
  doc.line(PAGE_WIDTH - MARGIN - 60, yPos - 2, PAGE_WIDTH - MARGIN, yPos - 2);
  doc.setFont("helvetica", "bold");
  doc.text("Total:", PAGE_WIDTH - MARGIN - 60, yPos + 4);
  doc.text(formatCurrency(allTotal), PAGE_WIDTH - MARGIN, yPos + 4, { align: "right" });

  drawFooter(doc, doc.internal.getNumberOfPages(), doc.internal.getNumberOfPages());
  doc.save(`Order-${order.id} ${order?.billingAddress?.name}.pdf`);
  return doc;
};
