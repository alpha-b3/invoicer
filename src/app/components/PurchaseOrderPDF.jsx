"use client";

import React, { useState } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import logo from "../images/logo.png";

const PurchaseOrderPDF = ({ purchaseOrder }) => {
  const [pdfPreview, setPdfPreview] = useState(null);

  const generatePDF = () => {
    const doc = new jsPDF();

    // Add Times New Roman font
    doc.setFont("times", "normal");

    // Update logo dimensions and position
    const logoUrl = { logo };
    const logoWidth = 25; // Width in mm
    const logoHeight = 15; // Height in mm
    const logoX = 14; // X position from left margin
    const logoY = 10; // Y position from top margin

    doc.addImage(logoUrl, "PNG", logoX, logoY, logoWidth, logoHeight);

    // Helper function update to use Times New Roman
    const addText = (doc, text, x, y, fontSize = 12, fontWeight = "normal") => {
      doc.setFontSize(fontSize);
      doc.setFont("times", fontWeight);
      doc.text(text, x, y);
    };

    // Adjust header position to account for logo
    addText(doc, "PURCHASE ORDER", 75, logoHeight + logoY + 10, 14, "bold");

    // Adjust yOffset to account for logo space
    const yOffset = logoHeight + 10;

    // Info Section with Boxes - adjusted Y positions
    doc.rect(14, 20 + yOffset, 180, 7); // Email box
    addText(doc, "Email", 16, 25 + yOffset, 10);
    doc.rect(36, 20 + yOffset, 158, 7);
    addText(doc, purchaseOrder.email, 40, 25 + yOffset, 10);

    doc.rect(14, 27 + yOffset, 180, 7); // Date box
    addText(doc, "Date", 16, 32 + yOffset, 10);
    doc.rect(36, 27 + yOffset, 158, 7);
    addText(doc, purchaseOrder.date, 40, 32 + yOffset, 10);

    doc.rect(14, 34 + yOffset, 180, 7); // Attn box
    addText(doc, "Attn", 16, 39 + yOffset, 10);
    doc.rect(36, 34 + yOffset, 158, 7);
    addText(doc, purchaseOrder.attn, 40, 39 + yOffset, 10);

    doc.rect(14, 41 + yOffset, 180, 7); // Company box
    addText(doc, "Company", 16, 46 + yOffset, 10);
    doc.rect(36, 41 + yOffset, 158, 7);
    addText(doc, purchaseOrder.company, 40, 46 + yOffset, 10);

    doc.rect(130, 27 + yOffset, 26, 7); // P/O NO box
    addText(doc, "P/O NO :", 132, 32 + yOffset, 10);
    doc.rect(156, 27 + yOffset, 38, 7);
    addText(doc, purchaseOrder.poNumber, 160, 32 + yOffset, 10);

    // --- Quotation Text ---
    addText(doc, purchaseOrder.quotationText, 14, 55 + yOffset, 10);

    // --- Table ---
    const tableColumn = [
      "Item",
      "Description",
      "Qty",
      "Unit Price (LKR)",
      "Total Price (LKR)",
    ];
    const tableRows = purchaseOrder.items.map((item, index) => [
      index + 1,
      item.description,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 65 + yOffset, // Adjusted Y position
      margin: { horizontal: 14 },
      columnStyles: {
        0: { halign: "center", cellWidth: 15, valign: "middle" }, // Item column
        1: { cellWidth: 80 }, // Description column
        2: { halign: "center", cellWidth: 15, valign: "middle" }, // Qty column
        3: { halign: "right", cellWidth: 35, valign: "middle" }, // Unit Price column
        4: { halign: "right", cellWidth: 35, valign: "middle" }, // Total Price column
      },
      styles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        fontSize: 10,
        cellPadding: 3,
        overflow: "linebreak", // Handle text overflow with line breaks
      },
      headStyles: {
        fillColor: [255, 255, 255], // set header background color to white
        textColor: [0, 0, 0], // set header text color to black
        fontStyle: "normal", // set header font style to normal
        halign: "center",
      },
    });

    const finalY = doc.autoTable.previous.finalY;

    // Add the calculation table
    doc.autoTable({
      body: [
        [
          "",
          "",
          "",
          {
            content: `Discount (${purchaseOrder.discPercent}%)`,
            styles: { halign: "left", valign: "middle" },
          },
          purchaseOrder.discount,
        ],
        [
          "",
          "",
          "",
          {
            content: `VAT (${purchaseOrder.vatPercent}%)`,
            styles: { halign: "left", valign: "middle" },
          },
          purchaseOrder.VAT,
        ],
        [
          "",
          "",
          "",
          {
            content: `TAX (${purchaseOrder.taxPercent}%)`,
            styles: { halign: "left", valign: "middle" },
          },
          purchaseOrder.TAX,
        ],
        [
          "",
          "",
          "",
          {
            content: "Sub Total",
            styles: { halign: "left", valign: "middle" },
          },
          purchaseOrder.subTotal,
        ],
        [
          "",
          "",
          "",
          {
            content: "TOTAL",
            styles: { halign: "left", valign: "middle", fontStyle: "bold" },
          },
          purchaseOrder.total,
        ],
      ],
      startY: finalY + 1,
      margin: { horizontal: 14 },
      tableWidth: 196,
      columnStyles: {
        0: { cellWidth: 15 }, // Item
        1: { cellWidth: 80 }, // Description
        2: { cellWidth: 15 }, // Qty
        3: { cellWidth: 35 }, // Label
        4: { cellWidth: 35, halign: "right", valign: "middle" }, // Amount
      },
      styles: {
        fontSize: 10,
        lineColor: [255, 255, 255],
        cellPadding: 2,
      },
      showHead: false,
    });

    // Update the Terms and Conditions starting position
    const calculationTableFinalY = doc.autoTable.previous.finalY;
    addText(
      doc,
      "Terms and conditions",
      14,
      calculationTableFinalY + 10,
      11,
      "underline"
    );
    let termsY = calculationTableFinalY + 17;

    purchaseOrder.terms.forEach((term) => {
      addText(doc, `• ${term}`, 14, termsY, 11);
      termsY += 5;
    });

    // --- Footer ---
    addText(doc, "Thank you.", 14, termsY + 15, 11);
    addText(doc, "Yours truly,", 14, termsY + 19, 11);
    doc.line(14, termsY + 30, 50, termsY + 30);
    addText(doc, purchaseOrder.signatureName, 14, termsY + 35, 11);
    addText(doc, purchaseOrder.signatureTitle, 14, termsY + 40, 11);

    // Instead of saving, create a data URL
    const pdfBlob = doc.output("dataurlstring");
    setPdfPreview(pdfBlob);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <button
          onClick={generatePDF}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Preview PDF
        </button>
        {pdfPreview && (
          <button
            onClick={() => {
              const doc = new jsPDF();

              // --- Helper function to add text with consistent styling ---
              const addText = (
                doc,
                text,
                x,
                y,
                fontSize = 12,
                fontWeight = "normal"
              ) => {
                doc.setFontSize(fontSize);
                doc.setFont(undefined, fontWeight);
                doc.text(text, x, y);
              };

              // --- Header ---
              addText(doc, "PURCHASE ORDER", 75, 14, 14, "bold"); // Centered and slightly down

              // --- Info Section with Boxes ---
              doc.rect(14, 20, 70, 7); // Email box
              addText(doc, "Email", 16, 25, 10);
              addText(doc, purchaseOrder.email, 40, 25, 10);

              doc.rect(14, 27, 70, 7); // Date box
              addText(doc, "Date", 16, 32, 10);
              addText(doc, purchaseOrder.date, 40, 32, 10);

              doc.rect(14, 34, 70, 7); // Attn box
              addText(doc, "Attn", 16, 39, 10);
              addText(doc, purchaseOrder.attn, 40, 39, 10);

              doc.rect(14, 41, 70, 7); // Company box
              addText(doc, "Company", 16, 46, 10);
              addText(doc, purchaseOrder.company, 40, 46, 10);

              doc.rect(130, 20, 60, 7); // P/O NO box
              addText(doc, "P/O NO", 132, 25, 10);
              addText(doc, purchaseOrder.poNumber, 160, 25, 10);

              // --- Quotation Text ---
              addText(doc, purchaseOrder.quotationText, 14, 55, 10);

              // --- Table ---
              const tableColumn = [
                "Item",
                "Description",
                "Qty",
                "Unit Price (LKR)",
                "Total Price (LKR)",
              ];
              const tableRows = purchaseOrder.items.map((item, index) => [
                index + 1,
                item.description,
                item.quantity,
                item.unitPrice,
                item.totalPrice,
              ]);

              doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 60, // Adjusted Y position
                margin: { horizontal: 14 },
                columnStyles: {
                  0: { halign: "center", cellWidth: 15, valign: "middle" }, // Item column
                  1: { cellWidth: 80 }, // Description column
                  2: { halign: "center", cellWidth: 15, valign: "middle" }, // Qty column
                  3: { halign: "right", cellWidth: 35, valign: "middle" }, // Unit Price column
                  4: { halign: "right", cellWidth: 35, valign: "middle" }, // Total Price column
                },
                styles: {
                  lineColor: [0, 0, 0],
                  lineWidth: 0.2,
                  fontSize: 10,
                  cellPadding: 3,
                  overflow: "linebreak", // Handle text overflow with line breaks
                },
                headStyles: {
                  fillColor: [255, 255, 255], // set header background color to white
                  textColor: [0, 0, 0], // set header text color to black
                  fontStyle: "normal", // set header font style to normal
                  halign: "center",
                },
              });

              const finalY = doc.autoTable.previous.finalY;

              // Add the calculation table
              doc.autoTable({
                body: [
                  [
                    "",
                    "",
                    "",
                    {
                      content: "Discount (10%)",
                      styles: { halign: "center", valign: "middle" },
                    },
                    purchaseOrder.discount,
                  ],
                  [
                    "",
                    "",
                    "",
                    {
                      content: "VAT (15%)",
                      styles: { halign: "center", valign: "middle" },
                    },
                    purchaseOrder.VAT,
                  ],
                  [
                    "",
                    "",
                    "",
                    {
                      content: "TAX (2%)",
                      styles: { halign: "center", valign: "middle" },
                    },
                    purchaseOrder.TAX,
                  ],
                  [
                    "",
                    "",
                    "",
                    {
                      content: "Sub Total",
                      styles: { halign: "center", valign: "middle" },
                    },
                    purchaseOrder.subTotal,
                  ],
                  [
                    "",
                    "",
                    "",
                    {
                      content: "TOTAL",
                      styles: {
                        halign: "center",
                        valign: "middle",
                        fontStyle: "bold",
                      },
                    },
                    purchaseOrder.total,
                  ],
                ],
                startY: finalY + 2,
                margin: { horizontal: 14 },
                tableWidth: 196,
                columnStyles: {
                  0: { cellWidth: 15 }, // Item
                  1: { cellWidth: 80 }, // Description
                  2: { cellWidth: 15 }, // Qty
                  3: { cellWidth: 35 }, // Label
                  4: { cellWidth: 35, halign: "right", valign: "middle" }, // Amount
                },
                styles: {
                  fontSize: 10,
                  lineColor: [255, 255, 255],
                  cellPadding: 2,
                },
                showHead: false,
              });

              // Update the Terms and Conditions starting position
              const calculationTableFinalY = doc.autoTable.previous.finalY;
              addText(
                doc,
                "Terms and conditions",
                14,
                calculationTableFinalY + 10,
                10,
                "underline"
              );
              let termsY = calculationTableFinalY + 17;

              purchaseOrder.terms.forEach((term) => {
                addText(doc, `• ${term}`, 14, termsY, 10);
                termsY += 7;
              });

              // --- Footer ---
              addText(doc, "Thank you.", 14, termsY + 10, 10);
              addText(doc, "Yours truly,", 14, termsY + 17, 10);
              doc.line(14, termsY + 20, 50, termsY + 20);
              addText(doc, purchaseOrder.signatureName, 14, termsY + 24, 10);
              addText(doc, purchaseOrder.signatureTitle, 14, termsY + 31, 10);

              doc.save(`PurchaseOrder_${purchaseOrder.poNumber}.pdf`);
            }}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Download PDF
          </button>
        )}
      </div>

      {/* PDF Preview */}
      {pdfPreview && (
        <div className="w-full h-[800px] border-2 border-gray-300 rounded-lg">
          <iframe
            src={pdfPreview}
            className="w-full h-full"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderPDF;
