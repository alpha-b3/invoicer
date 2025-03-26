import {
  CREATEPO,
  getApiUrl,
  GETPO,
  LASTPONO,
  UPDATEPO,
  GETPODETAILS,
  // DEPARTMENTS,
} from "../api/api";

export const getLastPONumber = async () => {
  try {
    const response = await fetch(getApiUrl(LASTPONO));
    if (!response.ok) {
      throw new Error("Failed to fetch last PO number");
    }
    const data = await response.json();
    return data.poNumber;
  } catch (error) {
    console.error("Error fetching last PO number:", error);
    throw error;
  }
};

export const createPurchaseOrder = async (poData) => {
  try {
    // Clean up the data before sending
    const cleanedData = {
      ...poData,
      items: poData.items.map((item) => ({
        ...item,
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || "0",
        totalPrice: item.totalPrice || "0.00",
      })),
      discountValue: poData.discountValue || "0",
      vatValue: poData.vatValue || "0",
      taxValue: poData.taxValue || "0",
      total: poData.total || "0.00",
    };

    const response = await fetch(getApiUrl(CREATEPO), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(cleanedData),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
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
// export const getDepartments = async () => {
//   try {
//     const apiUrl = getApiUrl(DEPARTMENTS);
//     const response = await fetch(apiUrl);
//     if (response.ok) return await response.json();
//     else {
//       const error = await response.json();
//       console.error("Error:", error);
//       throw new Error(error.message || "Failed to fetch departments");
//     }
//   } catch (error) {
//     console.error("Error fetching departments:", error);
//     throw error;
//   }
// };
