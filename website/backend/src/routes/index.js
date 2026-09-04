const express = require('express');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const jobRoutes = require('./jobRoutes');
const categoryRoutes = require('./categoryRoutes');
const reportRoutes = require('./reportRoutes');
const settingRoutes = require('./settingRoutes');
const transactionRoutes = require('./transactionRoutes');
const payoutRoutes = require('./payoutRoutes');
const walletTransactionRoutes = require('./walletTransactionRoutes');
const pricingRoutes = require('./pricingRoutes');
const adRoutes = require('./adRoutes');
const hyperlocalRoutes = require('./hyperlocalRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/jobs', jobRoutes);
router.use('/categories', categoryRoutes);
router.use('/reports', reportRoutes);
router.use('/settings', settingRoutes);
router.use('/transactions', transactionRoutes);
router.use('/payouts', payoutRoutes);
router.use('/wallet', walletTransactionRoutes);
router.use('/pricing', pricingRoutes);
router.use('/ads', adRoutes);
router.use('/hyperlocal', hyperlocalRoutes);

module.exports = router;
