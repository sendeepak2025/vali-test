import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  PriceListTemplate,
  PriceListProduct,
} from "@/components/inventory/forms/formTypes";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable: {
      finalY?: number;
    };
  }
}

export const exportPriceListToPDF = (
  template: PriceListTemplate,
  price: string = "all"
) => {
  const doc = new jsPDF();
  console.log(template)

  const totalProducts = template.products.length;
  const isLargeDataset = totalProducts > 100;

  // Print-safe margins - accounts for Microsoft Print to PDF default margins (~12.7mm)
  const MARGIN = 10;
  const PRINT_MARGIN_COMPENSATION = 14; // Extra bottom space for printer margins
  const TABLE_FONT_SIZE = isLargeDataset ? 7 : 8;
  const HEADER_FONT_SIZE = 7;
  const ROW_PADDING = isLargeDataset ? 1 : 1.5;

  const today = new Date();
  const logoUrl = "/logg.png";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const columnGap = isLargeDataset ? 3 : 4;
  const fullPageWidth = pageWidth - MARGIN * 2; // Use full page width instead of splitting into columns
  const leftColumnX = MARGIN;
  const startY = 22;
  const HEADER_HEIGHT = 20;
  const FOOTER_HEIGHT = 8;
  const MAX_Y = pageHeight - MARGIN - FOOTER_HEIGHT - PRINT_MARGIN_COMPENSATION;

  const drawHeader = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, HEADER_HEIGHT + 2, "F");

    doc.addImage(logoUrl, "PNG", MARGIN, 0, 30, 15);

    doc.setFontSize(HEADER_FONT_SIZE);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const formattedToday = `${String(today.getMonth() + 1).padStart(
      2,
      "0"
    )}/${String(today.getDate()).padStart(2, "0")}/${today.getFullYear()}`;
    doc.text(`Effective from: ${formattedToday}`, MARGIN, 18);

    doc.text("Whatsapp: +1 501 400 2406", pageWidth - MARGIN, 8, {
      align: "right",
    });
    doc.text("Phone: +1 501 559 0123", pageWidth - MARGIN, 12, {
      align: "right",
    });
    doc.text("Email: order@valiproduce.shop", pageWidth - MARGIN, 16, {
      align: "right",
    });

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, HEADER_HEIGHT, pageWidth - MARGIN, HEADER_HEIGHT);
  };

  const formatCurrencyValue = (val: number | undefined) =>
    `$${(val ?? 0)?.toFixed(2)}`;

  const productsByCategory: Record<string, PriceListProduct[]> = {};
  template.products.forEach((product) => {
    if (!productsByCategory[product.category]) {
      productsByCategory[product.category] = [];
    }
    productsByCategory[product.category].push(product);
  });

  Object.keys(productsByCategory).forEach((category) => {
    productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
  });

  const allCategories = Object.keys(productsByCategory);

  const categoryPriority: Record<string, number> = {
    VEGETABLE: 1,
    FRUITS: 2,
    "INDIAN SNACKS": 3,
    "JUICES & DRINKS": 4,
    PEPPERS: 5,
    ONIONS: 6,
    POTATOES: 7,
    "GINGER & GARLIC": 8,
    LETTUCE: 9,
    "RAJU SNACKS 400GMS": 9,
    "BLIKE SNACKS 380GMS": 10,
    "RAJU KHICHIYA 500GMS": 11,
    "FLOUR & GRAINS": 12,
    "JALSA PRODUCTS": 13,
    "RAJU SNACKS 908GMS": 14,
    "BLIKE SNACKS 500GMS": 15,
    "DESI PANEER": 16,
    "MADHI PRODUCTS": 17,
    "DESI NATURALS DAHI": 18,
    "OTHER INDIAN SNACKS": 19,
    "RAJU KHICHIYA 908GMS": 20,
    "INDIAN SNACKS (RAJU SNACKS)": 21,
  };

  const sortedCategories = allCategories.sort((a, b) => {
    const priorityA = categoryPriority[a.toUpperCase()] || 100;
    const priorityB = categoryPriority[b.toUpperCase()] || 100;
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return productsByCategory[b].length - productsByCategory[a].length;
  });

  drawHeader();

  // --- Fixed Height Measurements for 8 Columns (Short Code, Name, Original Price, A Price, B Price, C Price, Restaurant Price, Empty) ---
  const SINGLE_ROW_HEIGHT = (() => {
    const tempDoc = new jsPDF();
    autoTable(tempDoc, {
      startY: 0,
      body: [["#000", "SAMPLE", "0.00", "0.00", "0.00", "0.00", "0.00", ""]], // 8 elements for all columns including empty
      tableWidth: fullPageWidth,
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: ROW_PADDING },
    });
    return tempDoc.lastAutoTable?.finalY ?? 4;
  })();

  const CATEGORY_HEADER_HEIGHT = (() => {
    const tempDoc = new jsPDF();
    autoTable(tempDoc, {
      startY: 0,
      body: [
        [{ content: "CATEGORY", colSpan: 8 }], // Category header spans 8 columns
        ["CODE", "PRODUCT NAME", "PRICE", "A PRICE", "B PRICE", "C PRICE", "RESTAURANT", ""] // Column headers with empty column
      ],
      tableWidth: fullPageWidth,
      styles: { cellPadding: ROW_PADDING },
    });
    return tempDoc.lastAutoTable?.finalY ?? 8;
  })();

  const measureProductHeight = () => SINGLE_ROW_HEIGHT;
  const measureCategoryHeaderHeight = () => CATEGORY_HEADER_HEIGHT;

  const renderCategoryChunk = (
    categoryName: string,
    products: PriceListProduct[],
    x: number,
    y: number,
    showHeader: boolean
  ): number => {
    const bodyData = [];

    if (showHeader) {
      bodyData.push([
        {
          content: categoryName.toUpperCase(),
          colSpan: 8,
          styles: {
            halign: "left",
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: TABLE_FONT_SIZE + 1,
          },
        },
      ]);
      
      // Add column headers
      bodyData.push([
        {
          content: "CODE",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "PRODUCT NAME",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "PRICE",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "A PRICE",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "B PRICE",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "C PRICE",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "RESTAURANT",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
        {
          content: "",
          styles: { fontStyle: "bold", halign: "center", fillColor: [240, 240, 240], fontSize: TABLE_FONT_SIZE - 1 },
        },
      ]);
    }

    bodyData.push(
      ...products.map((product) => [
        {
          content: product.shortCode ? `#${product.shortCode}` : "-",
          styles: { fontStyle: "normal", textColor: [80, 80, 80] },
        },
        {
          content: product.name.toUpperCase(),
          styles: { fontStyle: "bold" },
        },
        {
          content: `${formatCurrencyValue(Number(product.pricePerBox || product.price) || 0)}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        {
          content: `${formatCurrencyValue(Number(product.aPrice) || 0)}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        {
          content: `${formatCurrencyValue(Number(product.bPrice) || 0)}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        {
          content: `${formatCurrencyValue(Number(product.cPrice) || 0)}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        {
          content: `${formatCurrencyValue(Number(product.restaurantPrice) || 0)}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        {
          content: "",
          styles: { fontStyle: "bold", halign: "center" },
        },
      ])
    );

    if (bodyData.length === 0) return y;

    autoTable(doc, {
      startY: y,
      body: bodyData,
      margin: {
        top: HEADER_HEIGHT + 2,
        left: x,
        right: MARGIN,
      },
      tableWidth: fullPageWidth,
      styles: {
        fontSize: TABLE_FONT_SIZE,
        cellPadding: ROW_PADDING,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: fullPageWidth * 0.07 }, // Short Code - smaller
        1: { cellWidth: fullPageWidth * 0.30 }, // Product Name - smaller to fit more columns
        2: { cellWidth: fullPageWidth * 0.10, halign: "center" }, // Original Price
        3: { cellWidth: fullPageWidth * 0.10, halign: "center" }, // A Price
        4: { cellWidth: fullPageWidth * 0.10, halign: "center" }, // B Price
        5: { cellWidth: fullPageWidth * 0.10, halign: "center" }, // C Price
        6: { cellWidth: fullPageWidth * 0.13, halign: "center" }, // Restaurant Price
        7: { cellWidth: fullPageWidth * 0.10, halign: "center" }, // Empty column
      },

      alternateRowStyles: { fillColor: [250, 250, 250] },
      pageBreak: "avoid",
      didDrawPage: () => {
        drawHeader();
      },
    });

    return doc.lastAutoTable?.finalY ?? y + 10;
  };

  const layoutCategories = () => {
    let currentY = startY;
    const categoryCursors: Record<string, number> = {};
    sortedCategories.forEach((cat) => (categoryCursors[cat] = 0));

    let currentCategoryIndex = 0;

    while (currentCategoryIndex < sortedCategories.length) {
      const categoryName = sortedCategories[currentCategoryIndex];
      const allProducts = productsByCategory[categoryName];
      let cursor = categoryCursors[categoryName];

      let availableSpace = MAX_Y - currentY;
      const showHeader = cursor === 0;
      const headerHeight = showHeader ? measureCategoryHeaderHeight() : 0;
      const minSpaceNeeded = headerHeight + (allProducts.length > 0 ? measureProductHeight() : 0);

      if (availableSpace < minSpaceNeeded && availableSpace < headerHeight + 5) {
        doc.addPage();
        drawHeader();
        currentY = startY;
        continue;
      }

      let spaceForProducts = availableSpace - headerHeight;
      let numProductsToFit = Math.floor(spaceForProducts / measureProductHeight());
      numProductsToFit = Math.max(0, numProductsToFit);

      const remainingProductsCount = allProducts.length - cursor;
      if (showHeader && numProductsToFit === 0 && remainingProductsCount > 0) {
        doc.addPage();
        drawHeader();
        currentY = startY;
        continue;
      }

      const productsToRenderCount = Math.min(remainingProductsCount, numProductsToFit);
      const productsChunk = allProducts.slice(cursor, cursor + productsToRenderCount);

      const newY = renderCategoryChunk(categoryName, productsChunk, leftColumnX, currentY, showHeader);

      currentY = newY + 0.3;
      categoryCursors[categoryName] += productsChunk.length;

      if (categoryCursors[categoryName] >= allProducts.length) {
        currentCategoryIndex++;
      }
    }
  };

  layoutCategories();

  const totalPagesCount = doc.getNumberOfPages();
  for (let i = 1; i <= totalPagesCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.text(`Page ${i} of ${totalPagesCount}`, pageWidth - MARGIN, 22, { align: "right" });
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    // Footer positioned to be visible even with Microsoft Print to PDF margins
    doc.text("Pricing and availability subject to change without prior notice. © Vali Produce", pageWidth / 2, pageHeight - MARGIN - PRINT_MARGIN_COMPENSATION, { align: "center" });
  }

  doc.save(`vali-produce-price-list-all-5-prices-${template.name.toLowerCase().replace(/\s+/g, "-")}.pdf`);
  return doc;
};