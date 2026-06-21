const { v4: uuidv4 } = require('uuid');
const { createRequest, createRequestItem, getAllRequests, getRequestById, updateRequest, updateRequestStatus } = require('../models/requestModel');
const pool = require('../config/db');

// Statuses where a request is finalized and can no longer be edited or cancelled.
const TERMINAL_STATUSES = ['approved', 'rejected', 'cancelled'];

const EDITABLE_KEYS = [
    'client_name',
    'contact_person',
    'project_title',
    'quotation_deadline',
    'delivery_date',
    'payment_terms',
    'client_budget',
];

const generateReferenceNumber = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM requests');
    const count = parseInt(result.rows[0].count) + 1;
    return `REQ-${String(count).padStart(3, '0')}`;
};

const create = async (req, res) => {
    const { client_name, contact_person, project_title, quotation_deadline, delivery_date, payment_terms, client_budget, items } = req.body;

    try {
        if (!client_name || !project_title || !quotation_deadline || !delivery_date || !items?.length) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const reference_number = await generateReferenceNumber();

        const request = await createRequest({
            reference_number,
            created_by: req.user.id,
            client_name,
            contact_person: contact_person || null,
            project_title,
            quotation_deadline,
            delivery_date,
            payment_terms,
            client_budget: client_budget || null,
        });

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            await createRequestItem({
                request_id: request.id,
                item_code: `ITEM-${String(i + 1).padStart(2, '0')}`,
                item_name: item.description || item.item_name,
                quantity: item.quantity,
                specifications: item.specifications || item.description,
            });
        }

        res.status(201).json({ message: 'Request created successfully.', request });

    } catch (err) {
        console.error('Create request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const getAll = async (req, res) => {
    try {
        const requests = await getAllRequests();
        res.json(requests);
    } catch (err) {
        console.error('Get requests error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const getOne = async (req, res) => {
    try {
        const request = await getRequestById(req.params.id);
        if (!request) return res.status(404).json({ error: 'Request not found.' });
        res.json(request);
    } catch (err) {
        console.error('Get request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const requests = await getAllRequests();
        const done = requests.filter(r => r.status === 'approved').length;
        const pending = requests.filter(r => r.status !== 'approved').length;
        const overdue = requests.filter(r => r.is_overdue).length;
        res.json({ done, pending, overdue, requests });
    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const update = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await getRequestById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        // Sales may only edit their own requests; admin may edit any.
        if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
            return res.status(403).json({ error: 'You can only edit your own requests.' });
        }

        if (TERMINAL_STATUSES.includes(existing.status)) {
            return res.status(400).json({ error: 'This request is finalized and can no longer be edited.' });
        }

        const fields = {};
        for (const key of EDITABLE_KEYS) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                fields[key] = req.body[key];
            }
        }

        await updateRequest(id, fields);
        const request = await getRequestById(id);

        res.json({ message: 'Request updated successfully.', request });
    } catch (err) {
        console.error('Update request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const cancel = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await getRequestById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        if (req.user.role !== 'admin' && existing.created_by !== req.user.id) {
            return res.status(403).json({ error: 'You can only cancel your own requests.' });
        }

        if (TERMINAL_STATUSES.includes(existing.status)) {
            return res.status(400).json({ error: 'This request is finalized and can no longer be cancelled.' });
        }

        await updateRequestStatus({
            request_id: id,
            status: 'cancelled',
            changed_by: req.user.id,
            comment: req.body?.comment || 'Request cancelled by requester.',
            current_assignee: null,
        });

        const request = await getRequestById(id);

        res.json({ message: 'Request cancelled successfully.', request });
    } catch (err) {
        console.error('Cancel request error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

const changeStatus = async (req, res) => {
    const { status, comment, current_assignee } = req.body;
    try {
        await updateRequestStatus({
            request_id: req.params.id,
            status,
            changed_by: req.user.id,
            comment,
            current_assignee,
        });
        res.json({ message: 'Status updated successfully.' });
    } catch (err) {
        console.error('Status update error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
};

module.exports = { create, getAll, getOne, getDashboardStats, update, cancel, changeStatus };