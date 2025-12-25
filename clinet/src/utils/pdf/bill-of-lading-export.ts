import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/lib/data";
import { PalletData } from "@/components/orders/PalletTrackingForm";

export const exportBillOfLadingToPDF = (
  order: Order,
  data: {
    bolNumber: string;
    shipperName: string;
    shipperAddress: string;
    shipperCity: string;
    shipperState: string;
    shipperZip: string;
    consigneeName: string;
    consigneeAddress: string;
    consigneeCity: string;
    consigneePhone?: string;
    consigneeState: string;
    consigneeZip: string;
    carrierName: string;
    trailerNumber: string;
    sealNumber?: string;
    freightTerms: "Prepaid" | "Collect" | "Third Party";
    specialInstructions?: string;
    hazardousMaterials: boolean;
    signatureShipper: string;
    totalQuantity?: string;
    serviceLevel: "Standard" | "Expedited" | "Same Day";
    palletData?: PalletData;
    palletCharges?: {
      chargePerPallet: number;
      totalCharge: number;
    };
  },
  printMode: boolean = false
) => {
  const doc = new jsPDF();
  const PAGE_WIDTH = doc.internal.pageSize.width;
  const PAGE_HEIGHT = doc.internal.pageSize.height;
  const MARGIN = 14;
  const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
  let yPos = 10;

  const addPageIfNeeded = (extraHeight = 30) => {
    if (yPos + extraHeight >= PAGE_HEIGHT - 25) {
      doc.addPage();
      yPos = 15;
    }
  };

  // ===== HEADER SECTION =====
  // Emerald header background
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(0, 0, PAGE_WIDTH, 28, "F");

  // Logo placeholder (white box)
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(MARGIN, 4, 20, 20, 2, 2, "F");
  
  // Add logo
  try {
    const logoUrl = "/logg.png";
    doc.addImage(logoUrl, "PNG", MARGIN + 1, 5, 18, 18);
  } catch (e) {
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105);
    doc.text("VALI", MARGIN + 10, 13, { align: "center" });
  }

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("BILL OF LADING", PAGE_WIDTH / 2, 12, { align: "center" });

  // Subtitle
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(220, 220, 220);
  doc.text(`B/L #: ${data.bolNumber} • Date: ${new Date(order.date).toLocaleDateString()}`, PAGE_WIDTH / 2, 19, { align: "center" });

  // "ORIGINAL - NOT NEGOTIABLE" badge
  doc.setFontSize(6);
  doc.setTextColor(200, 200, 200);
  doc.text("ORIGINAL - NOT NEGOTIABLE", PAGE_WIDTH / 2, 25, { align: "center" });

  yPos = 34;

  // ===== SHIPPER & CONSIGNEE SECTION =====
  const columnWidth = (CONTENT_WIDTH - 8) / 2;

  // Shipper box
  doc.setFillColor(249, 250, 251); // gray-50
  doc.setDrawColor(229, 231, 235); // gray-200
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, yPos, columnWidth, 36, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105); // emerald
  doc.text("SHIPPER", MARGIN + 4, yPos + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(data.shipperName, MARGIN + 4, yPos + 15);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(data.shipperAddress, MARGIN + 4, yPos + 22);
  doc.text(`${data.shipperCity}, ${data.shipperState} ${data.shipperZip}`, MARGIN + 4, yPos + 29);

  // Consignee box
  const consigneeX = MARGIN + columnWidth + 8;
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(consigneeX, yPos, columnWidth, 36, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text("CONSIGNEE", consigneeX + 4, yPos + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(data.consigneeName, consigneeX + 4, yPos + 15);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(data.consigneeAddress, consigneeX + 4, yPos + 22);
  doc.text(`${data.consigneeCity}, ${data.consigneeState} ${data.consigneeZip}`, consigneeX + 4, yPos + 29);
  if (data.consigneePhone) {
    doc.setFontSize(8);
    doc.text(data.consigneePhone, consigneeX + 4, yPos + 34);
  }

  yPos += 42;
  addPageIfNeeded(30);

  // ===== CARRIER INFORMATION SECTION =====
  doc.setFillColor(243, 244, 246); // gray-100
  doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 18, 2, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text("CARRIER INFORMATION", MARGIN + 4, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  
  const carrierCol1 = MARGIN + 4;
  const carrierCol2 = MARGIN + CONTENT_WIDTH / 3;
  const carrierCol3 = MARGIN + (CONTENT_WIDTH / 3) * 2;
  
  doc.text(`Carrier: ${data.carrierName}`, carrierCol1, yPos + 13);
  doc.text(`Service: ${data.serviceLevel}`, carrierCol2, yPos + 13);
  doc.text(`Freight Terms: ${data.freightTerms}`, carrierCol3, yPos + 13);

  yPos += 22;

  // ===== PALLET INFORMATION (if available) =====
  if (data.palletData) {
    addPageIfNeeded(22);
    
    doc.setFillColor(236, 253, 245); // emerald-50
    doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 18, 2, 2, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("PALLET INFORMATION", MARGIN + 4, yPos + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text(`Pallets: ${data.palletData.palletCount}`, carrierCol1, yPos + 13);
    doc.text(`Total Boxes: ${data.palletData.totalBoxes}`, carrierCol2, yPos + 13);

    if (data.palletCharges) {
      doc.text(`Charge/Pallet: $${data.palletCharges.chargePerPallet.toFixed(2)}`, carrierCol3, yPos + 13);
    }

    yPos += 22;
  }

  addPageIfNeeded(50);

  // ===== FREIGHT DESCRIPTION TABLE =====
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(5, 150, 105);
  doc.text("FREIGHT DESCRIPTION", MARGIN, yPos + 4);
  yPos += 7;

  const tableHeaders = ["Pieces", "Description", "Weight (lbs)", "NMFC", "Class", "HM"];

  const tableRows = order.items.map((item) => {
    const boxCount = data.palletData?.boxesPerPallet[item.productId] || item.quantity.toString();
    return [
      boxCount.toString(),
      item.productName || item.name || "Item",
      `${Math.round(item.quantity * 2)}`,
      "157250",
      "50",
      data.hazardousMaterials ? "X" : "-"
    ];
  });

  // Calculate totals
  const totalPieces = data.totalQuantity || order.items.reduce((acc, item) => acc + item.quantity, 0).toString();
  const totalWeight = order.items.reduce((acc, item) => acc + item.quantity * 2, 0);

  autoTable(doc, {
    startY: yPos,
    head: [tableHeaders],
    body: tableRows,
    foot: [[totalPieces, "TOTAL", totalWeight.toString(), "", "", ""]],
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      lineColor: [200, 200, 200],
      lineWidth: 0.2,
      fontSize: 8,
    },
    headStyles: {
      fillColor: [5, 150, 105], // emerald
      textColor: [255, 255, 255],
      fontStyle: "bold",
      cellPadding: 2,
      halign: "center",
    },
    bodyStyles: {
      textColor: [50, 50, 50],
      cellPadding: 2,
      halign: "center",
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [30, 30, 30],
      fontStyle: "bold",
      cellPadding: 2,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: "auto", halign: "left" },
      2: { cellWidth: 26 },
      3: { cellWidth: 22 },
      4: { cellWidth: 18 },
      5: { cellWidth: 16 },
    },
  });

  yPos = doc.lastAutoTable?.finalY ? doc.lastAutoTable.finalY + 8 : yPos + 50;
  addPageIfNeeded(30);

  // ===== SPECIAL INSTRUCTIONS =====
  if (data.specialInstructions) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("SPECIAL INSTRUCTIONS", MARGIN, yPos);

    yPos += 4;
    doc.setFillColor(254, 249, 195); // amber-100
    doc.roundedRect(MARGIN, yPos, CONTENT_WIDTH, 12, 2, 2, "F");
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(data.specialInstructions, MARGIN + 4, yPos + 8, { maxWidth: CONTENT_WIDTH - 8 });
    
    yPos += 16;
  }

  addPageIfNeeded(50);

  // ===== CERTIFICATION SECTION =====
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, yPos, PAGE_WIDTH - MARGIN, yPos);
  yPos += 6;

  // Shipper Certification (left)
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("SHIPPER CERTIFICATION", MARGIN, yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const certText = "This is to certify that the above named materials are properly classified, described, packaged, marked and labeled, and are in proper condition for transportation.";
  doc.text(certText, MARGIN, yPos + 4, { maxWidth: CONTENT_WIDTH / 2 - 8 });

  // Signature
  yPos += 16;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.text(data.signatureShipper, MARGIN, yPos);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text("Digital Signature", MARGIN, yPos + 4);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, MARGIN, yPos + 8);

  // Carrier Certification (right)
  const rightColX = PAGE_WIDTH / 2 + 5;
  yPos -= 16;
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text("CARRIER CERTIFICATION", rightColX, yPos - 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  const carrierCertText = "Carrier acknowledges receipt of packages and required placards. Carrier certifies emergency response information was made available.";
  doc.text(carrierCertText, rightColX, yPos - 2, { maxWidth: CONTENT_WIDTH / 2 - 8 });

  yPos += 10;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Awaiting carrier signature", rightColX, yPos);

  yPos += 14;

  // ===== DOCUMENT GENERATED BADGE =====
  doc.setFillColor(34, 197, 94); // green-500
  doc.roundedRect(MARGIN, yPos, 50, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text("✓ DOCUMENT GENERATED", MARGIN + 25, yPos + 7, { align: "center" });

  // Document info (right side)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_WIDTH - MARGIN, yPos + 3, { align: "right" });
  doc.text(`Document ID: ${data.bolNumber}`, PAGE_WIDTH - MARGIN, yPos + 8, { align: "right" });

  // ===== FOOTER =====
  const footerY = PAGE_HEIGHT - 10;
  doc.setFillColor(5, 150, 105);
  doc.rect(0, footerY - 2, PAGE_WIDTH, 12, "F");

  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(255, 255, 255);
  doc.text("Vali Produce • 4300 Pleasantdale Rd, Atlanta, GA 30340, USA • order@valiproduce.shop", PAGE_WIDTH / 2, footerY + 3, { align: "center" });
  
  doc.setFontSize(5);
  doc.setTextColor(200, 200, 200);
  doc.text("BOL is subject to terms and conditions of the carrier. This is a computer-generated document.", PAGE_WIDTH / 2, footerY + 7, { align: "center" });

  // ===== PAGE NUMBERS =====
  const totalPagesCount = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${totalPagesCount}`, PAGE_WIDTH - MARGIN, 8, { align: "right" });
  }

  // Handle print mode or download mode
  if (printMode) {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const printWindow = window.open(pdfUrl, '_blank');
    
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        setTimeout(() => {
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
      };
    }
  } else {
    doc.save(`bill-of-lading-${order.id}-${data.consigneeName}.pdf`);
  }

  return doc;
};
