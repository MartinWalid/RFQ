const { v4: uuidv4 } = require('uuid');
const { createRequest, createRequestItem, getAllRequests, getRequestById, updateRequestStatus } = require('../models/requestModel');
const pool = require('../config/db');

const generateReferenceNumber = async () => {
    const result = await pool.query('SELECT COUNT(*) FROM requests');
    const count = parseInt(result.rows[0].count) + 1;
    return `REQ-${String(count).padStart(3, '0')}`;
};

const create = async (req, res) => {
    const { client_name, project_title, quotation_deadline, delivery_date, payment_terms, client_budget, items } = req.body;

    try {
        if (!client_name || !project_title || !quotation_deadline || !delivery_date || !items?.length) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const reference_number = await generateReferenceNumber();

        const request = await createRequest({
            reference_number,
            created_by: req.user.id,
            client_name,
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

module.exports = { create, getAll, getOne, getDashboardStats, changeStatus };