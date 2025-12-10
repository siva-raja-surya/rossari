const db = require("../db");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "rossari_secret_key_2025";

exports.sendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    console.log(`[OTP] Sending OTP ${otp} to ${email}`);

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
};

exports.login = async (req, res) => {
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
};

exports.validate = (req, res) => {
  res.json({ user: req.user });
};
