const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./src/config/db');

const app = express();
app.use(cors());
app.use(express.json());

console.log('Loading auth routes...');
const authRoutes = require('./src/routes/authRoutes');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded');

console.log('Loading request routes...');
const requestRoutes = require('./src/routes/requestRoutes');
app.use('/api/requests', requestRoutes);
console.log('✅ Request routes loaded');

console.log('Loading ops routes...');
const opsRoutes = require('./src/routes/opsRoutes');
app.use('/api/requests', opsRoutes);
console.log('✅ Ops routes loaded');

console.log('Loading finance routes...');
const financeRoutes = require('./src/routes/financeRoutes');
app.use('/api/requests', financeRoutes);
console.log('✅ Finance routes loaded');

app.get('/', (req, res) => {
    res.json({ message: '✅ RFQ Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});