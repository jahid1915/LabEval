const express = require('express');
const router = express.Router();
const {
  getEntitiesOverview,
  getEntityRecords,
  getEntityRecordById,
  getEntityDependencies,
  updateEntityRecord,
  deleteEntityRecord
} = require('../controllers/databaseManagementController');

// All routes require Admin privileges (inherited from parent admin router)
router.get('/entities', getEntitiesOverview);
router.get('/:entity', getEntityRecords);
router.get('/:entity/:id', getEntityRecordById);
router.get('/:entity/:id/dependencies', getEntityDependencies);
router.patch('/:entity/:id', updateEntityRecord);
router.delete('/:entity/:id', deleteEntityRecord);

module.exports = router;
