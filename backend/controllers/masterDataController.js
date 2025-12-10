const db = require("../db");

exports.getMasterData = async (req, res) => {
  try {
    const [entities, divisions, banks, creditAreas, profitCenters] =
      await Promise.all([
        db.query(
          "SELECT code, name FROM rossari.master_entities ORDER BY name"
        ),
        db.query(
          'SELECT code, name, entity_code as "entityCode" FROM rossari.master_divisions ORDER BY name'
        ),
        db.query(
          'SELECT gl_code as "glCode", bank_name as "name", entity_code as "entityCode" FROM rossari.master_bank_accounts ORDER BY bank_name'
        ),
        db.query(
          "SELECT code, description FROM rossari.master_credit_control_areas ORDER BY code"
        ),
        db.query(
          'SELECT code, name, entity_code as "entityCode" FROM rossari.master_profit_centers ORDER BY code'
        ),
      ]);

    res.json({
      entities: entities.rows,
      divisions: divisions.rows,
      bankAccounts: banks.rows,
      creditControlAreas: creditAreas.rows,
      profitCenters: profitCenters.rows,
    });
  } catch (err) {
    console.error("Master Data Error:", err);
    res.status(500).json({ error: "Failed to fetch master data" });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await db.query(
      "SELECT name FROM rossari.master_customers WHERE account_number = $1",
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    res.json({ name: result.rows[0].name });
  } catch (err) {
    console.error("Customer Lookup Error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
