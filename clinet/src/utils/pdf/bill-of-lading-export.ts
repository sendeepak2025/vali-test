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
  // Fix 1: Explicitly set A4 format and mm units for consistent printing
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const PAGE_WIDTH = doc.internal.pageSize.getWidth();
  const PAGE_HEIGHT = doc.internal.pageSize.getHeight();
  const MARGIN = 15;
  const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
  let yPos = 0;

  // ===== HEADER SECTION (Full Width) =====
  doc.setFillColor(5, 150, 105); 
  doc.rect(0, 0, PAGE_WIDTH, 35, "F");

  // Logo Fix: No Stretch
  try {
    const logoUrl = "/logg.png";
    doc.addImage(logoUrl, "PNG", MARGIN, 9, 22, 22, undefined, 'FAST');
  } catch (e) {
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("VALI PRODUCE", MARGIN, 18);
  }

  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("BILL OF LADING", PAGE_WIDTH / 2 + 10, 18, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`B/L NUMBER: ${data.bolNumber}`, PAGE_WIDTH / 2 + 10, 26, { align: "center" });
  
  doc.setFontSize(7);
  doc.text("ORIGINAL - NON NEGOTIABLE", PAGE_WIDTH / 2 + 10, 31, { align: "center" });

  yPos = 45;

  // ===== SHIPPER & CONSIGNEE BOXES (Aligned to Edges) =====
  const boxSpacing = 6;
  const boxWidth = (CONTENT_WIDTH - boxSpacing) / 2;
  const boxHeight = 38;

  const drawAddressBox = (x: number, title: string, name: string, addr: string, cityState: string, phone?: string) => {
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, yPos, boxWidth, boxHeight, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(5, 150, 105);
    doc.text(title, x + 5, yPos + 7);

    doc.setFontSize(10);
    doc.setTextColor(20, 20, 20);
    doc.text(name.substring(0, 35), x + 5, yPos + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(addr.substring(0, 40), x + 5, yPos + 23);
    doc.text(cityState, x + 5, yPos + 30);
    if (phone) doc.text(`TEL: ${phone}`, x + 5, yPos + 35);
  };

  // Left Box (Shipper)
  drawAddressBox(MARGIN, "FROM: SHIPPER", data.shipperName, data.shipperAddress, `${data.shipperCity}, ${data.shipperState} ${data.shipperZip}`);
  // Right Box (Consignee) - Aligned exactly to Right Margin
  drawAddressBox(MARGIN + boxWidth + boxSpacing, "TO: CONSIGNEE", data.consigneeName, data.consigneeAddress, `${data.consigneeCity}, ${data.consigneeState} ${data.consigneeZip}`, data.consigneePhone);

  yPos += boxHeight + 8;

  // ===== CARRIER INFO (Full Width Fix) =====
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, 12, "F");
  
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CARRIER:", MARGIN + 5, yPos + 7.5);
  doc.text("SERVICE LEVEL:", MARGIN + (CONTENT_WIDTH / 2), yPos + 7.5);

  doc.setTextColor(20, 20, 20);
  doc.text(data.carrierName.toUpperCase(), MARGIN + 25, yPos + 7.5);
  doc.text(data.serviceLevel.toUpperCase(), MARGIN + (CONTENT_WIDTH / 2) + 28, yPos + 7.5);

  yPos += 18;

  // ===== TABLE SECTION (Fixed Right Edge) =====
  const tableHeaders = [["QTY/PCS", "DESCRIPTION OF ARTICLES", "WEIGHT", "CLASS", "REC"]];
  const tableRows = order.items.map(item => [
    item.quantity.toString(),
    item.productName || item.name || "Produce Item",
    `${item.quantity * 2} lbs`, 
    "50",
    data.hazardousMaterials ? "X" : ""
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN }, // Force alignment
    tableWidth: CONTENT_WIDTH, // Force full width
    styles: { fontSize: 9, cellPadding: 4, halign: 'center', overflow: 'linebreak' },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      1: { halign: 'left', cellWidth: 'auto' },
    },
    foot: [[
        data.totalQuantity || order.items.reduce((a, b) => a + b.quantity, 0).toString(),
        "TOTALS",
        `${order.items.reduce((a, b) => a + (b.quantity * 2), 0)} lbs`,
        "", ""
    ]],
    footStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold' }
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // ===== SIGNATURES (Balanced) =====
  if (yPos + 30 > PAGE_HEIGHT - 25) {
    doc.addPage();
    yPos = 25;
  }

  const sigLineLength = 75;
  doc.setDrawColor(200, 200, 200);
  
  // Shipper Aligned Left
  doc.line(MARGIN, yPos + 10, MARGIN + sigLineLength, yPos + 10);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("SHIPPER SIGNATURE", MARGIN, yPos + 14);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(20, 20, 20);
  doc.text(data.signatureShipper || "test", MARGIN, yPos + 8);

  // Carrier Aligned Right
  doc.line(PAGE_WIDTH - MARGIN - sigLineLength, yPos + 10, PAGE_WIDTH - MARGIN, yPos + 10);
  doc.setFont("helvetica", "normal");
  doc.text("CARRIER SIGNATURE", PAGE_WIDTH - MARGIN - sigLineLength, yPos + 14);
  
  // Footer
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text("Vali Produce | 4300 Pleasantdale Rd, Atlanta, GA 30340 | Computer Generated", PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: "center" });

  // ===== PAGE NUMBERS (Correct Loop) =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - MARGIN, 8, { align: "right" });
  }

  // Final Action
  if (printMode) {
    // Create hidden iframe for direct print dialog
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    
    // Create iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.src = pdfUrl;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // Cleanup after print dialog closes
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(pdfUrl);
        }, 1000);
      }, 500);
    };
  } else {
    doc.save(`BOL_${data.bolNumber}_${data.consigneeName}.pdf`);
  }
};