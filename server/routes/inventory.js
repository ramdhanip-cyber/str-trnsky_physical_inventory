const express = require('express');
const router = express.Router();
const reconciliationController = require('../controllers/reconciliationController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { jwtAuthMiddleware } = require('../middleware/jwtAuthMiddleware');

// Reconciliation routes
router.post('/reconcile', authMiddleware, reconciliationController.reconcileInventory);
router.post('/reconcile/save', authMiddleware, reconciliationController.saveReconciliationWithComparison);
router.get('/reconcile/check-existing', authMiddleware, reconciliationController.checkExistingReconciliation);
router.get('/reconcile/load/:record_id', authMiddleware, reconciliationController.loadReconciliationData);
router.delete('/reconciliation-records/:record_id', authMiddleware, reconciliationController.deleteReconciliationRecord);

//getReport
router.post('/reconcile/getreport', authMiddleware, reconciliationController.getReconciliationReport);


// Recheck routes
router.post('/recheck/mark-items', reconciliationController.markItemsForRecheck);
router.get('/recheck/items/:location_id', reconciliationController.getRecheckItems);
router.get('/recheck/marked-items/:location_id', reconciliationController.getMarkedItemsForChecking);
  router.put('/recheck/items/:item_id', reconciliationController.updateRecheckItem);
  router.post('/recheck/complete/:item_id', reconciliationController.completeRecheckItem);
  router.delete('/recheck/items/:item_id', reconciliationController.removeFromRecheck);

module.exports = router; 