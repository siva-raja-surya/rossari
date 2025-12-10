const express = require("express");
const cors = require("cors");
require("dotenv").config();
const initDb = require("./utils/initDb");
const authRoutes = require("./routes/authRoutes");
const formRoutes = require("./routes/formRoutes");
const masterDataRoutes = require("./routes/masterDataRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "50mb" })); // Increased limit for file uploads/large JSON

// Initialize Database
initDb();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/forms", formRoutes);
app.use("/api", masterDataRoutes); // This will serve /api/master-data and /api/customers/:code

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
