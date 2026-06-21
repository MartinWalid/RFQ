const pool = require('../config/db');

const createRequest = async ({
    reference_number,
    created_by,
    client_name,
    contact_person,
    project_title,
    quotation_deadline,
    delivery_date,
    payment_terms,
    client_budget,
}) => {
    const result = await pool.query(
        `INSERT INTO requests 
      (reference_number, created_by, client_name, contact_person, project_title, quotation_deadline, delivery_date, payment_terms, client_budget, status, current_assignee)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending_ops', $2)
     RETURNING *`,
        [
            reference_number,
            created_by,
            client_name,
            contact_person,
            project_title,
            quotation_deadline,
            delivery_date,
            payment_terms,
            client_budget,
        ]
    );

    return result.rows[0];
};

const createRequestItem = async ({
    request_id,
    item_code,
    item_name,
    quantity,
    specifications,
}) => {
    const result = await pool.query(
        `INSERT INTO request_items (request_id, item_code, item_name, quantity, specifications)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [request_id, item_code, item_name, quantity, specifications]
    );

    return result.rows[0];
};

const getAllRequests = async () => {
    const result = await pool.query(
        `SELECT 
      r.*,
      u.name AS created_by_name,
      a.name AS assignee_name,
      COUNT(ri.id) AS item_count,

      -- Aging from submitted/created request date to the real current date/time.
      -- Using EXTRACT(EPOCH) gives total elapsed days.
      -- Do not use EXTRACT(DAY), because it only returns the day part of an interval.
      GREATEST(
        FLOOR(EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400),
        0
      )::int AS aging_days,

      -- Client-deadline overdue logic.
      -- If the quotation deadline passed, the request remains overdue,
      -- even if Operations or Finance already completed their part.
      -- Approved requests can still be overdue if the client deadline was missed.
      CASE
        WHEN r.quotation_deadline IS NULL THEN false
        WHEN r.status IN ('draft', 'cancelled', 'canceled', 'rejected') THEN false
        WHEN CURRENT_DATE > r.quotation_deadline::date THEN true
        ELSE false
      END AS is_overdue

     FROM requests r
     LEFT JOIN users u ON r.created_by = u.id
     LEFT JOIN users a ON r.current_assignee = a.id
     LEFT JOIN request_items ri ON ri.request_id = r.id
     GROUP BY r.id, u.name, a.name
     ORDER BY r.created_at DESC`
    );

    return result.rows;
};

const getRequestById = async (id) => {
    const request = await pool.query(
        `SELECT 
       r.*,
       u.name AS created_by_name,

       GREATEST(
         FLOOR(EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 86400),
         0
       )::int AS aging_days,

       CASE
         WHEN r.quotation_deadline IS NULL THEN false
         WHEN r.status IN ('draft', 'cancelled', 'canceled', 'rejected') THEN false
         WHEN CURRENT_DATE > r.quotation_deadline::date THEN true
         ELSE false
       END AS is_overdue

     FROM requests r
     LEFT JOIN users u ON r.created_by = u.id
     WHERE r.id = $1`,
        [id]
    );

    if (!request.rows[0]) {
        return null;
    }

    const items = await pool.query(
        `SELECT * FROM request_items WHERE request_id = $1 ORDER BY created_at ASC`,
        [id]
    );

    return { ...request.rows[0], items: items.rows };
};

// Editable columns for a Sales/Admin request edit. Anything not in this list
// (status, created_by, reference_number, timestamps) is intentionally ignored.
const EDITABLE_REQUEST_FIELDS = [
    'client_name',
    'contact_person',
    'project_title',
    'quotation_deadline',
    'delivery_date',
    'payment_terms',
    'client_budget',
];

const updateRequest = async (id, fields) => {
    const updates = [];
    const values = [];
    let index = 1;

    for (const column of EDITABLE_REQUEST_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(fields, column)) {
            updates.push(`${column} = $${index}`);
            values.push(fields[column]);
            index += 1;
        }
    }

    if (updates.length === 0) {
        // Nothing to change — return the row as-is.
        const existing = await pool.query('SELECT * FROM requests WHERE id = $1', [id]);
        return existing.rows[0] ?? null;
    }

    values.push(id);

    const result = await pool.query(
        `UPDATE requests
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${index}
         RETURNING *`,
        values
    );

    return result.rows[0] ?? null;
};

const updateRequestStatus = async ({
    request_id,
    status,
    changed_by,
    comment,
    current_assignee,
}) => {
    const current = await pool.query(
        'SELECT status FROM requests WHERE id = $1',
        [request_id]
    );

    const from_status = current.rows[0]?.status;

    await pool.query(
        `UPDATE requests 
         SET status = $1, current_assignee = $2, updated_at = NOW() 
         WHERE id = $3`,
        [status, current_assignee, request_id]
    );

    await pool.query(
        `INSERT INTO status_log (request_id, changed_by, from_status, to_status, comment)
     VALUES ($1, $2, $3, $4, $5)`,
        [request_id, changed_by, from_status, status, comment]
    );
};

module.exports = {
    createRequest,
    createRequestItem,
    getAllRequests,
    getRequestById,
    updateRequest,
    updateRequestStatus,
};