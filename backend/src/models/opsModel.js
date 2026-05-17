const pool = require('../config/db');

const createItemSupplier = async ({ item_id, filled_by, supplier_name, unit_cost, discount_percentage, net_unit_cost, payment_terms, production_time, delivery_time, notes }) => {
    const result = await pool.query(
        `INSERT INTO item_suppliers 
      (item_id, filled_by, supplier_name, unit_cost, discount_percentage, net_unit_cost, payment_terms, production_time, delivery_time, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
        [item_id, filled_by, supplier_name, unit_cost, discount_percentage, net_unit_cost, payment_terms, production_time, delivery_time, notes]
    );
    return result.rows[0];
};

const getSuppliersByRequestId = async (request_id) => {
    const result = await pool.query(
        `SELECT s.*, ri.item_name, ri.quantity, ri.item_code
     FROM item_suppliers s
     JOIN request_items ri ON s.item_id = ri.id
     WHERE ri.request_id = $1
     ORDER BY ri.created_at ASC, s.created_at ASC`,
        [request_id]
    );
    return result.rows;
};

const deleteSuppliersByItemId = async (item_id) => {
    await pool.query('DELETE FROM item_suppliers WHERE item_id = $1', [item_id]);
};

module.exports = { createItemSupplier, getSuppliersByRequestId, deleteSuppliersByItemId };