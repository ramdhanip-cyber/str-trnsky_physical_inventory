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
router.post('/reconcile/getreportbyall', authMiddleware, reconciliationController.getReconciliationReportByAll);

//getreservationreport
router.post('/reconcile/getreservationreport', authMiddleware, reconciliationController.getReservationReport);
router.post('/reconcile/savereservationreport', authMiddleware, reconciliationController.saveReservationReport);
router.post('/reconcile/getstoredreservationreport', authMiddleware, reconciliationController.getStoredReservationReport);



// Recheck routes
router.post('/recheck/mark-items', reconciliationController.markItemsForRecheck);
router.get('/recheck/items/:location_id', reconciliationController.getRecheckItems);
router.get('/recheck/marked-items/:location_id', reconciliationController.getMarkedItemsForChecking);
  router.put('/recheck/items/:item_id', reconciliationController.updateRecheckItem);
  router.post('/recheck/complete/:item_id', reconciliationController.completeRecheckItem);
  router.delete('/recheck/items/:item_id', reconciliationController.removeFromRecheck);

// Adjustment routes (marked from reconciliation)
router.post('/adjustment/mark-items', reconciliationController.markItemsForAdjustment);
router.get('/adjustment/items/:location_id', reconciliationController.getAdjustmentItems);
router.delete('/adjustment/items/:item_id', reconciliationController.removeFromAdjustment);

module.exports = router; 