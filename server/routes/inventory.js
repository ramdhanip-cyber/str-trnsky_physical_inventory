const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Reconciliation route
router.post('/reconcile', authMiddleware, reconciliationController.reconcileInventory);

module.exports = router; 