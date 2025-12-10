const db = require("../db");
const mapExternalPayloadToSchema = require("../utils/dataMapper");

exports.submitForm = async (req, res) => {
  try {
    // Use the mapper to handle different input formats
    const { userEmail, invoiceType, customerName, formData } =
      mapExternalPayloadToSchema(req.body, req.user.email);

    // --- ENRICH BANK DETAILS (GL CODE Lookup) ---
    // Requirement: "while submitting the form save the gl_code too , take this data from the master_bank_accounts table"
    if (formData.bankAccount) {
      // Check if the provided bankAccount matches a GL Code
      let bankResult = await db.query(
        `SELECT gl_code, bank_name FROM rossari.master_bank_accounts WHERE gl_code = $1`,
        [formData.bankAccount]
      );

      // If not found by GL Code, try by Bank Name (fallback)
      if (bankResult.rows.length === 0) {
        bankResult = await db.query(
          `SELECT gl_code, bank_name FROM rossari.master_bank_accounts WHERE bank_name = $1`,
          [formData.bankAccount]
        );
      }

      // If found, enrich the formData
      if (bankResult.rows.length > 0) {
        formData.glCode = bankResult.rows[0].gl_code;
        formData.bankName = bankResult.rows[0].bank_name;
        // Ensure the main field uses the GL Code as standard
        formData.bankAccount = bankResult.rows[0].gl_code;
      }
    }

    // --- DUPLICATE CHECK START ---

    // 1. Check for Duplicate UTRs (Bank Reference Numbers) for this user
    const newUTRs = (formData.paymentDetails || [])
      .map((p) => p.bankReferenceNumber)
      .filter(Boolean); // Remove empty/null

    // Filter UTRs to check:
    // Ignore 6-digit UTRs (allow duplicates).
    // Check 10-22 alphanumeric UTRs (disallow duplicates).
    const utrsToCheck = newUTRs.filter((ref) => !/^\d{6}$/.test(ref));

    if (utrsToCheck.length > 0) {
      // Query to find if any of these UTRs exist in previous submissions for this user
      // We look into the JSONB array 'paymentDetails'
      const utrQuery = `
        SELECT pd->>'bankReferenceNumber' as ref
        FROM rossari.submissions,
        jsonb_array_elements(form_data->'paymentDetails') pd
        WHERE user_email = $1
        AND pd->>'bankReferenceNumber' = ANY($2)
      `;

      const utrCheck = await db.query(utrQuery, [userEmail, utrsToCheck]);

      if (utrCheck.rows.length > 0) {
        const duplicates = [...new Set(utrCheck.rows.map((r) => r.ref))].join(
          ", "
        );
        return res.status(400).json({
          error: `Duplicate Bank Reference (UTR) found: ${duplicates}. You have already submitted these.`,
        });
      }
    }

    const result = await db.query(
      `INSERT INTO rossari.submissions (user_email, invoice_type, customer_name, form_data) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, ref_id, submitted_at`,
      [
        userEmail, // Use the mapped email (or fallback to authenticated user)
        invoiceType,
        customerName,
        JSON.stringify(formData), // Store the standardized JSON
      ]
    );

    const row = result.rows[0];
    res.json({
      id: row.ref_id, // Return the friendly ID to frontend
      internalId: row.id,
      submittedAt: row.submitted_at,
    });
  } catch (err) {
    console.error("Submission Error:", err);
    res.status(500).json({ error: "Failed to submit form" });
  }
};

exports.getForms = async (req, res) => {
  try {
    let query = `SELECT id, ref_id, user_email, invoice_type, customer_name, form_data, submitted_at FROM rossari.submissions`;
    const params = [];

    // If not admin, filter by user email
    if (req.user.role !== "ADMIN") {
      query += ` WHERE user_email = $1`;
      params.push(req.user.email);
    }

    query += ` ORDER BY submitted_at DESC`;

    const result = await db.query(query, params);

    const forms = result.rows.map((row) => ({
      id: row.ref_id, // Frontend expects string ID
      submittedAt: row.submitted_at,
      invoiceType: row.invoice_type,
      customerName: row.customer_name,
      // Spread the rest of the stored JSON data
      ...row.form_data,
      // Ensure specific fields required by frontend type definition are present if missing in JSON
      customerCode: row.form_data.customerCode,
      entityCode: row.form_data.entityCode,
      bankAccount: row.form_data.bankAccount,
      // Access enriched fields
      glCode: row.form_data.glCode,
      bankName: row.form_data.bankName,

      paymentDetails: row.form_data.paymentDetails || [],
      invoiceDetails: row.form_data.invoiceDetails || [],
    }));

    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
};
