const pool = require('../config/db');

const upsertFinanceData = async ({ supplier_id, filled_by, cog, markup_percentage, markup_amount, vat_applicable, vat_percentage, vat_amount, supplier_discount, total_item_price }) => {
    const existing = await pool.query(
        'SELECT id FROM finance_data WHERE supplier_id = $1', [supplier_id]
    );

    if (existing.rows.length > 0) {
        const result = await pool.query(
            `UPDATE finance_data SET
        filled_by = $1, cog = $2, markup_percentage = $3, markup_amount = $4,
        vat_applicable = $5, vat_percentage = $6, vat_amount = $7,
        supplier_discount = $8, total_item_price = $9, updated_at = NOW()
       WHERE supplier_id = $10
       RETURNING *`,
            [filled_by, cog, markup_percentage, markup_amount, vat_applicable, vat_percentage, vat_amount, supplier_discount, total_item_price, supplier_id]
        );
        return result.rows[0];
    }

    const result = await pool.query(
        `INSERT INTO finance_data
      (supplier_id, filled_by, cog, markup_percentage, markup_amount, vat_applicable, vat_percentage, vat_amount, supplier_discount, total_item_price)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
        [supplier_id, filled_by, cog, markup_percentage, markup_amount, vat_applicable, vat_percentage, vat_amount, supplier_discount, total_item_price]
    );
    return result.rows[0];
};

const getFinanceDataByRequestId = async (request_id) => {
    const result = await pool.query(
        `SELECT f.*, s.supplier_name, s.unit_cost, s.discount_percentage, s.net_unit_cost,
            ri.item_name, ri.quantity, ri.item_code
     FROM finance_data f
     JOIN item_suppliers s ON f.supplier_id = s.id
     JOIN request_items ri ON s.item_id = ri.id
     WHERE ri.request_id = $1
     ORDER BY ri.created_at ASC, s.created_at ASC`,
        [request_id]
    );
    return result.rows;
};

const lockFinanceData = async (request_id) => {
    await pool.query(
        `UPDATE finance_data SET is_locked = true
     WHERE supplier_id IN (
       SELECT s.id FROM item_suppliers s
       JOIN request_items ri ON s.item_id = ri.id
       WHERE ri.request_id = $1
     )`,
        [request_id]
    );
};

module.exports = { upsertFinanceData, getFinanceDataByRequestId, lockFinanceData };