const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: "postgres",
  host: "marriott-development.cekj05b8wvmk.ap-south-1.rds.amazonaws.com",
  database: "postgres",
  password: "postgres2025",
  port: 5432,
  ssl: { rejectUnauthorized: false },
  options: "-c search_path=rossari",
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
