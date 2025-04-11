import {
  CREATEPO,
  getApiUrl,
  GETPO,
  LASTPONO,
  UPDATEPO,
  GETPODETAILS,
  DEPARTMENTS,
} from "../api/api";

export const getLastPONumber = async () => {
  try {
    const response = await fetch(getApiUrl(LASTPONO), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch PO number");
    }

    const data = await response.json();
    return data.poNumber; // Returns in format YYYY/XXXX
  } catch (error) {
    console.error("Error fetching PO number:", error);
    // Generate fallback PO number
    const currentYear = new Date().getFullYear();
    return `${currentYear}/0001`;
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    // Input validation
    const requiredFields = [
      'PONumber', 'SID', 'DID', 'Attendee', 'QuotationDate', 
      'Currency', 'Total', 'Type'
    ];

    const missingFields = requiredFields.filter(field => !poData[field]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    const response = await fetch(getApiUrl(CREATEPO), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(poData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create purchase order');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error creating PO:", error);
    throw error;
  }
};

export const getPurchaseOrders = async () => {
  try {
    const response = await fetch(getApiUrl(GETPO), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch purchase orders");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    throw error;
  }
};

export const updatePOStatus = async (poId, pin, isPrint = false) => {
  try {
    const response = await fetch(getApiUrl(UPDATEPO), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ id: poId, pin, isPrint }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

export const getPODetails = async (poHeaderId) => {
  try {
    const response = await fetch(
      `${getApiUrl(GETPODETAILS)}?poHeaderId=${poHeaderId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching PO details:", error);
    throw error;
  }
};

export const getPOForPDF = async (poId) => {
  try {
    // Get both details and PO data in parallel
    const [details, poResponse] = await Promise.all([
      getPODetails(poId),
      getPurchaseOrders(),
    ]);

    console.log("Fetched details:", details);
    console.log("Fetched PO response:", poResponse);

    const po = poResponse.find((po) => po.id === poId);
    if (!po) throw new Error("Purchase order not found");

    // Format data for PDF
    const formattedData = {
      id: po.id,
      poNumber: po.poNumber,
      date: po.date || new Date().toISOString().split("T")[0],
      supplierName: po.supplierName,
      supplierAddress: po.supplierAddress || "N/A",
      supplierEmail: po.supplierEmail || "N/A",
      attendee: po.attendee || "",
      description: po.description || "",
      department: po.department || "",
      items: details.map((item) => ({
        description: item.description || "",
        quantity: item.quantity || 0,
        unitPrice: Number(item.unitPrice || 0).toFixed(2),
        totalPrice: Number(item.total || 0).toFixed(2),
      })),
      terms: [
        { label: "Payment Terms", value: po.terms?.payment },
        { label: "Warranty", value: po.terms?.warranty },
        { label: "Delivery", value: po.terms?.delivery },
        { label: "Installation", value: po.terms?.installation },
        { label: "AMC Terms", value: po.terms?.amc },
        { label: "Validity", value: po.terms?.validity },
      ].filter((term) => term.value && term.value !== "N/A"),
      total: Number(po.total || 0).toFixed(2),
      currency: po.currency || "LKR",
      signatureName: "Abdun Nafih",
      signatureTitle: "General Manager",
    };

    console.log("Formatted data for PDF:", formattedData);
    return formattedData;
  } catch (error) {
    console.error("Error in getPOForPDF:", error);
    throw error;
  }
};

export const handleSubmit = async (poData) => {
  try {
    // Transform the data to match DB field names exactly
    const formattedData = {
      PONumber: poData.poNumber,
      SID: parseInt(poData.supplierId),
      DID: parseInt(poData.DID),
      Attendee: poData.attendee || "",
      Description: poData.description || "",
      QuotationDate: poData.date,
      Currency: poData.currency,
      Status: 1,
      Total: parseFloat(poData.total),
      isCreated: 1,
      isApproved: 0,
      isCancelled: 0,
      isPrinted: 0,
      Remark: poData.remark || "",
      Type: poData.type,
      DiscountPercentage:
        poData.discountType === "percentage"
          ? parseFloat(poData.discountValue) || 0
          : 0,
      DiscountAmount:
        poData.discountType === "fixed"
          ? parseFloat(poData.discountValue) || 0
          : 0,
      VATPercentage:
        poData.vatType === "percentage" ? parseFloat(poData.vatValue) || 0 : 0,
      VATAmount:
        poData.vatType === "fixed" ? parseFloat(poData.vatValue) || 0 : 0,
      TaxPercentage:
        poData.taxType === "percentage" ? parseFloat(poData.taxValue) || 0 : 0,
      TaxAmount:
        poData.taxType === "fixed" ? parseFloat(poData.taxValue) || 0 : 0,
      items: poData.items.map((item, index) => ({
        Description: item.description,
        LineID: index + 1,
        Qty: parseFloat(item.quantity),
        UnitPrice: parseFloat(item.unitPrice),
        Total: parseFloat(item.totalPrice),
        PaymenTerms: poData.terms.payment || "",
        Warranty: poData.terms.warranty || "",
        AMCTerms: poData.terms.amc || "",
        DeliveryTerms: poData.terms.delivery || "",
        Installation: poData.terms.installation || "",
        Validity: poData.terms.validity || "",
      })),
    };

    // Log the formatted data for debugging
    console.log("Sending PO data:", formattedData);

    const response = await fetch("/api/po/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formattedData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to create purchase order");
    }

    return await response.json();
  } catch (error) {
    console.error("Error in handleSubmit:", error);
    throw error;
  }
};
