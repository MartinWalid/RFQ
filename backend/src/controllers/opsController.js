const { createItemSupplier, getSuppliersByRequestId, deleteSuppliersByItemId } = require('../models/opsModel');
const { updateRequestStatus } = require('../models/requestModel');
const pool = require('../config/db');

const submitOpsData = async (req, res) => {
    const { id } = req.params;
    const { items, save_as_draft } = req.body;

    try {
        if (!items?.length) {
            return res.status(400).json({ error: 'No items provided.' });
        }

        for (const item of items) {
            await deleteSuppliersByItemId(item.item_id);

            for (const supplier of item.suppliers) {
                const net_unit_cost = supplier.unit_cost - (supplier.unit_cost * (supplier.discount_percentage || 0) / 100);

                await createItemSupplier({
                    item_id: item.item_id,
                    filled_by: req.user.id,
                    supplier_name: supplier.supplier_name,
                    unit_cost: supplier.unit_cost,
                    discount_percentage: supplier.discount_percentage || 0,
                    net_unit_cost,
                    payment_terms: supplier.payment_terms,
                    production_time: supplier.production_time,
                    delivery_time: supplier.delivery_time,
                    notes: supplier.notes || null,
                });
            }
        }

        if (!save_as_draft) {
            const financeUsers = await pool.query(
                `SELECT id FROM users WHERE role = 'finance' LIMIT 1`
            );
            const financeAssignee = financeUsers.rows[0]?.id || req.user.id;

            await updateRequestStatus({
                request_id: id,
                status: 'pending_finance',
                changed_by: req.user.id,
                comment: 'Operations costing submitted.',
                current_assignee: financeAssignee,
            });
        }

        res.json({ message: save_as_draft ? 'Draft saved.' : 'Submitted to Finance successfully.' });

    } catch (err) {
        console.error('Ops submit error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const getOpsData = async (req, res) => {
    try {
        const suppliers = await getSuppliersByRequestId(req.params.id);
        res.json(suppliers);
    } catch (err) {
        console.error('Get ops data error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

module.exports = { submitOpsData, getOpsData };