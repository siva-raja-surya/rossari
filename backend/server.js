const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("./db");
const crypto = require("crypto"); // Used for generating IDs if missing

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "rossari_secret_key_2025";

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads/large JSON

// --- Database Initialization ---
const initDb = async () => {
  try {
    // Create Schema
    await db.query(`CREATE SCHEMA IF NOT EXISTS rossari;`);

    // Set search path for this connection
    await db.query(`SET search_path TO rossari;`);

    // OTP Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS otp_codes (
        email VARCHAR(255) PRIMARY KEY,
        otp_code VARCHAR(6) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Admins Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        email VARCHAR(255) PRIMARY KEY
      );
    `);

    // Insert a default admin for testing if table is empty
    const adminCheck = await db.query(`SELECT * FROM admins LIMIT 1`);
    if (adminCheck.rows.length === 0) {
      await db.query(`INSERT INTO admins (email) VALUES ('admin@rossari.com')`);
      console.log("Default admin created: admin@rossari.com");
    }

    // Sequence for Ref ID
    await db.query(`CREATE SEQUENCE IF NOT EXISTS form_ref_seq START 1;`);

    // Submissions Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ref_id VARCHAR(20) UNIQUE DEFAULT ('RO' || lpad(nextval('form_ref_seq')::text, 10, '0')),
        user_email VARCHAR(255) NOT NULL,
        invoice_type VARCHAR(255),
        customer_name VARCHAR(255),
        form_data JSONB NOT NULL,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("Database schema initialized successfully.");
  } catch (err) {
    console.error("Database initialization failed:", err);
  }
};

initDb();

// --- Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// --- Helper: Data Mapper ---
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

// --- Routes ---

// 1. Send OTP
app.post("/api/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // In a real app, send email here.
    console.log(`[OTP] Sending OTP ${otp} to ${email}`);

    // Upsert OTP
    await db.query(
      `INSERT INTO rossari.otp_codes (email, otp_code) 
       VALUES ($1, $2) 
       ON CONFLICT (email) 
       DO UPDATE SET otp_code = $2, created_at = CURRENT_TIMESTAMP`,
      [email, otp]
    );

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Login (Verify OTP)
app.post("/api/auth/login", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res.status(400).json({ error: "Email and OTP required" });

  try {
    const result = await db.query(
      `SELECT * FROM rossari.otp_codes WHERE email = $1 AND otp_code = $2`,
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    // Check if admin
    const adminCheck = await db.query(
      `SELECT * FROM rossari.admins WHERE email = $1`,
      [email]
    );
    const role = adminCheck.rows.length > 0 ? "ADMIN" : "USER";

    // Generate JWT
    const token = jwt.sign({ email, role }, JWT_SECRET, { expiresIn: "24h" });

    // Clear OTP
    await db.query(`DELETE FROM rossari.otp_codes WHERE email = $1`, [email]);

    res.json({ token, user: { email, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Validate Token
app.get("/api/auth/validate", authenticateToken, (req, res) => {
  // If we reach here, the token is valid (checked by middleware)
  res.json({ user: req.user });
});

// 4. Submit Form
app.post("/api/forms", authenticateToken, async (req, res) => {
  try {
    // Use the mapper to handle different input formats
    const { userEmail, invoiceType, customerName, formData } =
      mapExternalPayloadToSchema(req.body, req.user.email);

    // --- DUPLICATE CHECK START ---

    // 1. Check for Duplicate UTRs (Bank Reference Numbers) for this user
    const newUTRs = (formData.paymentDetails || [])
      .map((p) => p.bankReferenceNumber)
      .filter(Boolean); // Remove empty/null

    if (newUTRs.length > 0) {
      // Query to find if any of these UTRs exist in previous submissions for this user
      // We look into the JSONB array 'paymentDetails'
      const utrQuery = `
        SELECT pd->>'bankReferenceNumber' as ref
        FROM rossari.submissions,
        jsonb_array_elements(form_data->'paymentDetails') pd
        WHERE user_email = $1
        AND pd->>'bankReferenceNumber' = ANY($2)
      `;

      const utrCheck = await db.query(utrQuery, [userEmail, newUTRs]);

      if (utrCheck.rows.length > 0) {
        const duplicates = [...new Set(utrCheck.rows.map((r) => r.ref))].join(
          ", "
        );
        return res.status(400).json({
          error: `Duplicate Bank Reference (UTR) found: ${duplicates}. You have already submitted these.`,
        });
      }
    }

    // 2. Check for Duplicate Invoice Numbers for this user
    // Only if invoiceDetails exists
    const newInvoices = (formData.invoiceDetails || [])
      .map((i) => i.invoiceNumber)
      .filter(Boolean);

    if (newInvoices.length > 0) {
      const invQuery = `
        SELECT inv->>'invoiceNumber' as num
        FROM rossari.submissions,
        jsonb_array_elements(form_data->'invoiceDetails') inv
        WHERE user_email = $1
        AND inv->>'invoiceNumber' = ANY($2)
      `;

      const invCheck = await db.query(invQuery, [userEmail, newInvoices]);

      if (invCheck.rows.length > 0) {
        const duplicates = [...new Set(invCheck.rows.map((r) => r.num))].join(
          ", "
        );
        return res.status(400).json({
          error: `Duplicate Invoice Number found: ${duplicates}. You have already submitted these.`,
        });
      }
    }
    // --- DUPLICATE CHECK END ---

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
});

// 5. Get Forms
app.get("/api/forms", authenticateToken, async (req, res) => {
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
      paymentDetails: row.form_data.paymentDetails || [],
      invoiceDetails: row.form_data.invoiceDetails || [],
    }));

    res.json(forms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
