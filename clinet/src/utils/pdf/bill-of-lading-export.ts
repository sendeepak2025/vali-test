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

  // ===== HEADER SECTION (More Compact) =====
  doc.setFillColor(5, 150, 105); 
  doc.rect(0, 0, PAGE_WIDTH, 22, "F");

  // Logo (Left side)
  try {
    const logoUrl = "/logg.png";
    doc.addImage(logoUrl, "PNG", MARGIN, 2.5, 14, 14, undefined, 'FAST');
  } catch (e) {
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text("VALI", MARGIN, 10);
  }

  // FROM: SHIPPER (Next to logo - White text on green background)
  const shipperStartX = MARGIN + 19;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text("FROM: SHIPPER", shipperStartX, 5);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(data.shipperName, shipperStartX, 9);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text(data.shipperAddress, shipperStartX, 12.5);
  doc.text(`${data.shipperCity}, ${data.shipperState} ${data.shipperZip}`, shipperStartX, 16);

  // Header Text (Center)
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BILL OF LADING", PAGE_WIDTH / 2, 7, { align: "center" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`B/L NUMBER: ${data.bolNumber}`, PAGE_WIDTH / 2, 12, { align: "center" });
  
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text("ORIGINAL - NON NEGOTIABLE", PAGE_WIDTH / 2, 16, { align: "center" });

  // Page number position (top right corner) - Will be updated dynamically later
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  // Placeholder - will be replaced in the page number loop at the end
  
  // Effective Date (Below Page number)
  const effectiveDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.text(`Effective Date: ${effectiveDate}`, PAGE_WIDTH - MARGIN, 9, { align: "right" });

  yPos = 24;

  // ===== CONSIGNEE INFO (Single Line - Bold and bigger font) =====
  const infoStartY = yPos;

  // TO: CONSIGNEE label with details immediately after
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(5, 150, 105);
  doc.text("TO: CONSIGNEE", MARGIN, infoStartY + 2.5);
  
  // All info in ONE single line - BOLD and bigger font (9pt)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0); // Pure black for better visibility
  
  // Build complete single line text with minimal gaps
  const phoneText = data.consigneePhone ? ` TEL: ${data.consigneePhone}` : '';
  const singleLineText = `${data.consigneeName}  ${data.consigneeAddress}  ${data.consigneeCity}, ${data.consigneeState} ${data.consigneeZip}+${phoneText}`;
  
  // Start text right after "TO: CONSIGNEE" label - BOLD
  doc.text(singleLineText, MARGIN + 35, infoStartY + 2.5);

  yPos += 5;

  // ===== CARRIER INFO (Full Width Fix) =====
  doc.setFillColor(248, 250, 252);
  doc.rect(MARGIN, yPos, CONTENT_WIDTH, 7, "F");
  
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("CARRIER:", MARGIN + 5, yPos + 4.5);
  doc.text("SERVICE LEVEL:", MARGIN + (CONTENT_WIDTH / 2), yPos + 4.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(data.carrierName.toUpperCase(), MARGIN + 25, yPos + 4.5);
  doc.text(data.serviceLevel.toUpperCase(), MARGIN + (CONTENT_WIDTH / 2) + 28, yPos + 4.5);

  yPos += 9;

  // ===== TABLE SECTION (Fixed Right Edge) =====
  const tableHeaders = [["QTY/PCS", "DESCRIPTION OF ARTICLES"]];
  const tableRows = order.items.map(item => [
    item.quantity.toString(),
    item.productName || item.name || "Produce Item"
  ]);

  autoTable(doc, {
    startY: yPos,
    head: tableHeaders,
    body: tableRows,
    theme: 'striped',
    margin: { left: MARGIN, right: MARGIN }, // Force alignment
    tableWidth: CONTENT_WIDTH, // Force full width
    styles: { fontSize: 8, cellPadding: 1, halign: 'center', overflow: 'linebreak', fontStyle: 'bold', lineWidth: 0 },
    headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 'auto', fontStyle: 'bold' },
    },
    bodyStyles: { fontStyle: 'bold' },
    foot: [[
        data.totalQuantity || order.items.reduce((a, b) => a + b.quantity, 0).toString(),
        "TOTALS"
    ]],
    footStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', fontSize: 8, cellPadding: 1.5 }
  });

  yPos = (doc as any).lastAutoTable.finalY + 6;

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
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text("SHIPPER SIGNATURE", MARGIN, yPos + 14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text(data.signatureShipper || "test", MARGIN, yPos + 8);

  // Carrier Aligned Right
  doc.line(PAGE_WIDTH - MARGIN - sigLineLength, yPos + 10, PAGE_WIDTH - MARGIN, yPos + 10);
  doc.setFont("helvetica", "bold");
  doc.text("CARRIER SIGNATURE", PAGE_WIDTH - MARGIN - sigLineLength, yPos + 14);
  
  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(150, 150, 150);
  doc.text("Vali Produce | 4300 Pleasantdale Rd, Atlanta, GA 30340 | Computer Generated", PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: "center" });

  // ===== PAGE NUMBERS (Dynamic - Correct Loop) =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_WIDTH - MARGIN, 7, { align: "right" });
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
    // Clean store name for filename (remove special characters)
    const cleanStoreName = data.consigneeName
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    doc.save(`BOL_${cleanStoreName}_${data.bolNumber}.pdf`);
  }
}; 