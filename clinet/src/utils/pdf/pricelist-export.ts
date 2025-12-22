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
  price: string
) => {
  const doc = new jsPDF();

  const totalProducts = template.products.length;
  const isLargeDataset = totalProducts > 100;

  const MARGIN = 8;
  const TABLE_FONT_SIZE = isLargeDataset ? 7 : 8;
  const HEADER_FONT_SIZE = 7;
  const ROW_PADDING = isLargeDataset ? 0.5 : 0.8;

  const today = new Date();
  const logoUrl = "/logg.png";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const columnGap = isLargeDataset ? 3 : 4;
  const columnWidth = (pageWidth - MARGIN * 2 - columnGap) / 2;
  const leftColumnX = MARGIN;
  const rightColumnX = leftColumnX + columnWidth + columnGap;
  const startY = 22;
  const HEADER_HEIGHT = 20;
  const FOOTER_HEIGHT = 10;
  const MAX_Y = pageHeight - MARGIN - FOOTER_HEIGHT;

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

  drawHeader(); // --- ऊँचाई मापने वाले फ़ंक्शंस (Height Measurement Functions) ---

  const SINGLE_ROW_HEIGHT = (() => {
    const tempDoc = new jsPDF();
    autoTable(tempDoc, {
      startY: 0,
      body: [["SAMPLE", "$0.00", ""]],
      tableWidth: columnWidth,
      styles: { fontSize: TABLE_FONT_SIZE, cellPadding: ROW_PADDING },
      didDrawPage: () => {},
    }); // Get row height
    return tempDoc.lastAutoTable?.finalY ?? 4;
  })();

  const CATEGORY_HEADER_HEIGHT = (() => {
    const tempDoc = new jsPDF();
    autoTable(tempDoc, {
      startY: 0,
      body: [
        [
          {
            content: "CATEGORY",
            colSpan: 3,
            styles: { fontSize: TABLE_FONT_SIZE + 1 },
          },
        ],
      ],
      tableWidth: columnWidth,
      styles: { cellPadding: ROW_PADDING },
      didDrawPage: () => {},
    });
    return tempDoc.lastAutoTable?.finalY ?? 6;
  })();

  const measureProductHeight = () => SINGLE_ROW_HEIGHT;
  const measureCategoryHeaderHeight = () => CATEGORY_HEADER_HEIGHT;  // --- नया रेंडर फ़ंक्शन (New Render Function) ---
  /**
   * Renders just a "chunk" of a category (a header and N products)
   */

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
          colSpan: 3,
          styles: {
            halign: "left",
            fillColor: [220, 220, 220],
            textColor: [0, 0, 0],
            fontStyle: "bold",
            fontSize: TABLE_FONT_SIZE + 1,
          },
        },
      ]);
    }

    bodyData.push(
      ...products.map((product) => [
        { content: product.name.toUpperCase(), styles: { fontStyle: "bold" } },
        {
          content: `${formatCurrencyValue(
            product[price as keyof PriceListProduct] as number
          )}`,
          styles: { fontStyle: "bold", halign: "center" },
        },
        { content: "", styles: { fontStyle: "bold", halign: "center" } },
      ])
    ); // If no header and no products, don't render anything

    if (bodyData.length === 0) return y;

    autoTable(doc, {
      startY: y,
      body: bodyData,
      margin: {
        top: HEADER_HEIGHT + 2,
        left: x,
        right: pageWidth - x - columnWidth,
      },
      tableWidth: columnWidth,
      styles: {
        fontSize: TABLE_FONT_SIZE,
        cellPadding: ROW_PADDING,
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: columnWidth * 0.55 },
        1: { cellWidth: columnWidth * 0.16, halign: "center" },
        2: { cellWidth: columnWidth * 0.2, halign: "center" },
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      }, // We manually handle page breaks, so tell autoTable not to
      pageBreak: "avoid",
      didDrawPage: (data) => {
        // This hook should not be called if pageBreak is 'avoid'
        // But if it is, we must redraw the header
        if (data.pageNumber > doc.internal.getCurrentPageInfo().pageNumber) {
          drawHeader();
        }
      },
    });

    return doc.lastAutoTable?.finalY ?? y + 10;
  }; // --- नया लेआउट लॉजिक (New Layout Logic) ---

  const layoutCategories = () => {
    let leftY = startY;
    let rightY = startY;
    let currentPage = 1; // Track the next product index for each category

    const categoryCursors: Record<string, number> = {};
    sortedCategories.forEach((cat) => (categoryCursors[cat] = 0));

    let currentCategoryIndex = 0;

    while (currentCategoryIndex < sortedCategories.length) {
      const categoryName = sortedCategories[currentCategoryIndex];
      const allProducts = productsByCategory[categoryName];
      let cursor = categoryCursors[categoryName]; // 1. Pick the shorter column

      const isLeftColumn = leftY <= rightY;
      let currentX = isLeftColumn ? leftColumnX : rightColumnX;
      let currentY = isLeftColumn ? leftY : rightY;

      let availableSpace = MAX_Y - currentY;
      const showHeader = cursor === 0;
      const headerHeight = showHeader ? measureCategoryHeaderHeight() : 0; // 2. Check if the column is "full" // If not enough space for header OR (header + 1 product)

      const minSpaceNeeded =
        headerHeight + (allProducts.length > 0 ? measureProductHeight() : 0);

      if (
        availableSpace < minSpaceNeeded &&
        availableSpace < headerHeight + 5
      ) {
        // 5 as a small buffer
        // This column is full. Mark it as full and retry in the other column.
        if (isLeftColumn) {
          leftY = MAX_Y;
        } else {
          rightY = MAX_Y;
        } // If *both* columns are now full, create a new page

        if (leftY >= MAX_Y && rightY >= MAX_Y) {
          doc.addPage();
          drawHeader();
          currentPage++;
          leftY = startY;
          rightY = startY;
        }
        continue; // Re-run the loop (will try the other column or new page)
      } // 3. Calculate how many products can fit

      let spaceForProducts = availableSpace - headerHeight;
      let numProductsToFit = Math.floor(
        spaceForProducts / measureProductHeight()
      );
      numProductsToFit = Math.max(0, numProductsToFit);

      const remainingProductsCount = allProducts.length - cursor; // If header fits, but 0 products fit, and we *have* products,
      // the column is effectively full.
      if (showHeader && numProductsToFit === 0 && remainingProductsCount > 0) {
        if (isLeftColumn) {
          leftY = MAX_Y;
        } else {
          rightY = MAX_Y;
        }

        if (leftY >= MAX_Y && rightY >= MAX_Y) {
          doc.addPage();
          drawHeader();
          currentPage++;
          leftY = startY;
          rightY = startY;
        }
        continue; // Retry
      }

      const productsToRenderCount = Math.min(
        remainingProductsCount,
        numProductsToFit
      );
      const productsChunk = allProducts.slice(
        cursor,
        cursor + productsToRenderCount
      ); // 4. Render the chunk

      const newY = renderCategoryChunk(
        categoryName,
        productsChunk,
        currentX,
        currentY,
        showHeader
      ); // 5. Update cursor and Y-position

      if (isLeftColumn) {
        leftY = newY + 0.3;
      } else {
        rightY = newY + 0.3;
      }
      categoryCursors[categoryName] += productsChunk.length; // 6. If category is finished, move to the next one

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
    doc.text(`Page ${i} of ${totalPagesCount}`, pageWidth - MARGIN, 22, {
      align: "right",
    });

    const footerY = pageHeight - 6;
    doc.setFontSize(6);
    doc.setFont("helvetica", "italic");
    doc.text(
      "Pricing and availability subject to change without prior notice. © Vali Produce",
      pageWidth / 2,
      footerY,
      { align: "center" }
    );
  }

  doc.save(
    `vali-produce-price-list-${template.name
      .toLowerCase()
      .replace(/\s+/g, "-")}.pdf`
  );
  return doc;
};
