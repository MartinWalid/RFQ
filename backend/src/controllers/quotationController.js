const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { getRequestById } = require('../models/requestModel');
const { getFinanceDataByRequestId } = require('../models/financeModel');

// ── Static company data, taken verbatim from the Quotation template ──────────
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'elevate-logo.png');

const COMPANY = {
    address: '38 Nehro street, Roxy, Cairo - Egypt',
    tel: 'Tel: +222919702 - +201000004970',
    email: 'Info@elevate.com.eg',
    taxId: 'Tax ID: 765-012-049',
    web: 'elevate.com.eg',
};

const BANK_LINES = [
    'Bank details: CIB (Commercial international bank)',
    'Account number 100063986784 EGP',
    'Account number 100063986814 USD',
    'IBANEG970010014300000100063986784',
    'BIC:CIBEEGCX143',
];

const FOOTER_TEXT =
    '+20222919702 / +2 010 0000 4970          info@elevate.com.eg          WWW.elevate.com.eg';

// ── Colors ───────────────────────────────────────────────────────────────────
const NAVY = '#111D39';
const HEADER_FILL = '#CED4D9';
const GRAY = '#6B7280';
const LIGHT_BORDER = '#D1D5DB';

const money = (value) => {
    const number = Number(value);
    return (Number.isFinite(number) ? number : 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const fmtDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

// Build one quotation line per supplier costing row.
const buildLines = (rows) =>
    rows.map((row) => {
        const quantity = Number(row.quantity) || 0;
        const cog = Number(row.cog) || 0;
        const markupAmount = Number(row.markup_amount) || 0;
        const vatAmount = Number(row.vat_amount) || 0;

        const netBeforeVat = cog + markupAmount; // customer subtotal for the line, before VAT
        const unitPrice = quantity > 0 ? netBeforeVat / quantity : netBeforeVat;

        return {
            description: row.supplier_name
                ? `${row.item_name} (${row.supplier_name})`
                : row.item_name,
            quantity,
            unitPrice,
            total: netBeforeVat,
            vatAmount,
            vatApplicable: Boolean(row.vat_applicable),
            vatPercentage: Number(row.vat_percentage) || 0,
        };
    });

// Table column layout (x offsets are absolute page coordinates).
const COLS = [
    { key: 'index', label: '#', x: 40, w: 26, align: 'center' },
    { key: 'description', label: 'DESCRIPTION', x: 66, w: 233, align: 'left' },
    { key: 'unit', label: 'Unit', x: 299, w: 46, align: 'center' },
    { key: 'quantity', label: 'Quantity', x: 345, w: 60, align: 'center' },
    { key: 'unitPrice', label: 'unit price', x: 405, w: 75, align: 'right' },
    { key: 'total', label: 'Total', x: 480, w: 75, align: 'right' },
];

const TABLE_LEFT = 40;
const TABLE_RIGHT = 555;
const PAGE_BOTTOM = 760;

const drawTableHeader = (doc, y) => {
    const headerH = 22;
    doc.save();
    doc.rect(TABLE_LEFT, y, TABLE_RIGHT - TABLE_LEFT, headerH).fill(NAVY);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9);
    COLS.forEach((col) => {
        doc.text(col.label, col.x + 3, y + 7, { width: col.w - 6, align: col.align });
    });
    doc.restore();
    return y + headerH;
};

const generateQuotation = async (req, res) => {
    const { id } = req.params;

    try {
        const request = await getRequestById(id);
        if (!request) {
            return res.status(404).json({ error: 'Request not found.' });
        }

        const rows = await getFinanceDataByRequestId(id);
        const lines = buildLines(rows);

        const subtotal = lines.reduce((sum, line) => sum + line.total, 0);
        const vatTotal = lines.reduce((sum, line) => sum + line.vatAmount, 0);
        const grandTotal = subtotal + vatTotal;

        // Effective VAT label: if every VAT-applicable line shares one rate, show it.
        const appliedRates = [
            ...new Set(lines.filter((l) => l.vatApplicable).map((l) => l.vatPercentage)),
        ];
        const vatLabel = appliedRates.length === 1 ? `VAT ${appliedRates[0]}%` : 'VAT';

        const doc = new PDFDocument({ size: 'A4', margin: 40 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="quotation-${request.reference_number || id}.pdf"`
        );

        doc.pipe(res);

        // ── Header: logo + company info (left) ───────────────────────────────
        if (fs.existsSync(LOGO_PATH)) {
            doc.image(LOGO_PATH, 40, 40, { width: 110 });
        }

        let companyY = 160;
        doc.font('Helvetica').fontSize(8).fillColor(GRAY);
        [COMPANY.address, COMPANY.tel, COMPANY.email, COMPANY.taxId, COMPANY.web].forEach(
            (text) => {
                doc.text(text, 40, companyY, { width: 250 });
                companyY += 12;
            }
        );

        // ── Header: title + meta (right) ─────────────────────────────────────
        doc.font('Helvetica-Bold').fontSize(26).fillColor(NAVY);
        doc.text('Quotation', 330, 45, { width: 225, align: 'right' });

        const meta = [
            ['DATE:', fmtDate(new Date())],
            ['Quotation #', request.reference_number || ''],
            ['Customer:', request.client_name || ''],
            ['Contact Person:', request.contact_person || ''],
            ['Acc. Man.:', request.created_by_name || ''],
            ['Mobile:', request.mobile || ''],
        ];

        let metaY = 90;
        meta.forEach(([label, value]) => {
            doc.font('Helvetica-Bold').fontSize(9).fillColor(NAVY);
            doc.text(label, 330, metaY, { width: 95, align: 'right' });
            doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
            doc.text(String(value), 430, metaY, { width: 125, align: 'right' });
            metaY += 15;
        });

        // ── Items table ──────────────────────────────────────────────────────
        let y = Math.max(companyY, metaY) + 20;
        y = drawTableHeader(doc, y);

        doc.font('Helvetica').fontSize(9).fillColor('#1F2937');

        lines.forEach((line, index) => {
            const descHeight = doc.heightOfString(line.description, {
                width: COLS[1].w - 6,
            });
            const rowH = Math.max(20, descHeight + 8);

            if (y + rowH > PAGE_BOTTOM) {
                doc.addPage();
                y = 40;
                y = drawTableHeader(doc, y);
                doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
            }

            const cells = {
                index: String(index + 1),
                description: line.description,
                unit: '',
                quantity: String(line.quantity),
                unitPrice: money(line.unitPrice),
                total: money(line.total),
            };

            COLS.forEach((col) => {
                doc.text(cells[col.key], col.x + 3, y + 5, {
                    width: col.w - 6,
                    align: col.align,
                });
            });

            doc.save().strokeColor(LIGHT_BORDER).lineWidth(0.5);
            doc.moveTo(TABLE_LEFT, y + rowH).lineTo(TABLE_RIGHT, y + rowH).stroke();
            doc.restore();

            y += rowH;
        });

        // Side borders of the table body.
        doc.save().strokeColor(LIGHT_BORDER).lineWidth(0.5);
        doc.moveTo(TABLE_LEFT, y).lineTo(TABLE_LEFT, y).stroke();
        doc.restore();

        // ── Totals (right-aligned block) ─────────────────────────────────────
        const totalsX = 330;
        const totalsW = TABLE_RIGHT - totalsX;
        let ty = y + 12;

        const totalsRow = (label, value, opts = {}) => {
            const rowH = 20;
            if (opts.fill) {
                doc.save().rect(totalsX, ty, totalsW, rowH).fill(NAVY).restore();
            }
            doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 11 : 9);
            doc.fillColor(opts.fill ? '#FFFFFF' : NAVY);
            doc.text(label, totalsX + 6, ty + 5, { width: totalsW / 2 - 6, align: 'left' });
            doc.text(money(value), totalsX + totalsW / 2, ty + 5, {
                width: totalsW / 2 - 6,
                align: 'right',
            });
            ty += rowH;
        };

        totalsRow('SUBTOTAL', subtotal);
        totalsRow(vatLabel, vatTotal);
        totalsRow('TOTAL', grandTotal, { bold: true, fill: true });

        // ── Conditions (left) + Bank details (right) ─────────────────────────
        const blockY = ty + 30;

        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY);
        doc.text('Conditions', 40, blockY);

        doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
        let condY = blockY + 18;
        const conditions = [
            `Payment : ${request.payment_terms || ''}`,
            `Delivery : ${fmtDate(request.delivery_date)}`,
            'Quotation validity : 3 days',
        ];
        conditions.forEach((text) => {
            doc.text(text, 40, condY, { width: 260 });
            condY += 14;
        });

        doc.font('Helvetica-Bold').fontSize(11).fillColor(NAVY);
        doc.text('Bank details:', 330, blockY, { width: 225 });

        doc.font('Helvetica').fontSize(9).fillColor('#1F2937');
        let bankY = blockY + 18;
        BANK_LINES.forEach((text) => {
            doc.text(text, 330, bankY, { width: 225 });
            bankY += 14;
        });

        // ── Footer bar ───────────────────────────────────────────────────────
        // Temporarily drop the bottom margin so writing the footer near the page
        // edge doesn't make PDFKit auto-append a blank page.
        const savedBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const footerY = 790;
        doc.save();
        doc.roundedRect(40, footerY, TABLE_RIGHT - 40, 22, 6).fill(NAVY);
        doc.fillColor('#FFFFFF').font('Helvetica').fontSize(8);
        doc.text(FOOTER_TEXT, 40, footerY + 7, {
            width: TABLE_RIGHT - 40,
            align: 'center',
            lineBreak: false,
        });
        doc.restore();

        doc.page.margins.bottom = savedBottomMargin;

        doc.end();
    } catch (err) {
        console.error('Generate quotation error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error.' });
        }
    }
};

module.exports = { generateQuotation };
