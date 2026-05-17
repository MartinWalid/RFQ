const { upsertFinanceData, getFinanceDataByRequestId, lockFinanceData } = require('../models/financeModel');
const { updateRequestStatus } = require('../models/requestModel');

const submitFinanceData = async (req, res) => {
    const { id } = req.params;
    const { suppliers, save_as_draft } = req.body;

    try {
        if (!suppliers?.length) {
            return res.status(400).json({ error: 'No supplier pricing provided.' });
        }

        for (const s of suppliers) {
            const markup_amount = s.cog * (s.markup_percentage / 100);
            const subtotal = s.cog + markup_amount;
            const vat_amount = s.vat_applicable ? subtotal * (s.vat_percentage / 100) : 0;
            const total_before_discount = subtotal + vat_amount;
            const supplier_discount = s.discount_percentage > 0 ? total_before_discount * (s.discount_percentage / 100) : 0;
            const total_item_price = total_before_discount - supplier_discount;

            await upsertFinanceData({
                supplier_id: s.supplier_id,
                filled_by: req.user.id,
                cog: s.cog,
                markup_percentage: s.markup_percentage,
                markup_amount,
                vat_applicable: s.vat_applicable || false,
                vat_percentage: s.vat_percentage || 0,
                vat_amount,
                supplier_discount,
                total_item_price,
            });
        }

        if (!save_as_draft) {
            await updateRequestStatus({
                request_id: id,
                status: 'approved',
                changed_by: req.user.id,
                comment: 'Finance pricing confirmed and locked.',
                current_assignee: req.user.id,
            });
            await lockFinanceData(id);
        }

        res.json({ message: save_as_draft ? 'Draft saved.' : 'Pricing confirmed and locked.' });

    } catch (err) {
        console.error('Finance submit error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const getFinanceData = async (req, res) => {
    try {
        const data = await getFinanceDataByRequestId(req.params.id);
        res.json(data);
    } catch (err) {
        console.error('Get finance data error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

module.exports = { submitFinanceData, getFinanceData };