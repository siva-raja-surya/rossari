const crypto = require("crypto");

const mapExternalPayloadToSchema = (payload, fallbackEmail) => {
  // Check if this is the "External" format (e.g. has "Payment Item" or "case_invoice")
  const isExternalFormat =
    payload["Payment Item"] || payload["case_invoice"] || payload["create_by"];

  if (!isExternalFormat) {
    // Return as-is if it matches our standard frontend format
    return {
      userEmail: fallbackEmail,
      invoiceType: payload.invoiceType,
      customerName: payload.customerName,
      formData: payload,
    };
  }

  // Helper to extract code from string like "1000 - Rossari..."
  const extractCode = (str) => (str ? str.split(" - ")[0].trim() : null);

  // Map to internal standard
  const standardData = {
    invoiceType: payload.case_invoice,
    customerName: payload.customer_name,
    customerCode: payload["customer_code "] || payload.customer_code, // Handle trailing space in key
    entityCode: extractCode(payload.business_unit),
    divisionCode: extractCode(payload.division_code),
    caseType: payload.case,
    bankAccount: payload.bank_acc_no,
    creditControlArea: payload.credit_control_area,
    profitCenter: payload.profit_center,
    remark: payload.remark,
    // Map Payment Items
    paymentDetails: (payload["Payment Item"] || []).map((p) => ({
      id: p._id || crypto.randomUUID(),
      bankReferenceNumber: p.primaryDisplay || p.Description,
      amount: p.Price ? parseFloat(p.Price) : null,
      paymentDate: p.date,
    })),
    // Map Invoice Items
    invoiceDetails: (payload["invoice item"] || []).map((i) => ({
      id: i._id || crypto.randomUUID(),
      invoiceNumber: i["Invoice Number"] || i.primaryDisplay,
      // Attempt to map amounts if available, otherwise null
      invoiceAmount: null,
      invoiceAmountPaid: null,
      tdsAmount: i.TDS !== "NA" ? parseFloat(i.TDS) : null,
      gstWithheldAmount: null,
      invoiceAmountDeducted: null,
    })),
  };

  return {
    userEmail: payload.create_by || fallbackEmail,
    invoiceType: standardData.invoiceType,
    customerName: standardData.customerName,
    formData: standardData,
  };
};

module.exports = mapExternalPayloadToSchema;
