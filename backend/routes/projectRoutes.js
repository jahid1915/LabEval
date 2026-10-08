const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getProjectWorkspace,
  updateMilestone,
  addMilestone,
  logProjectActivity,
  postProjectMessage
} = require('../controllers/projectController');

// All project routes require valid authentication; internal controller checks project role & membership
router.use(protect);

router.get('/:projectId/workspace', getProjectWorkspace);
router.put('/:projectId/milestones/:milestoneId', updateMilestone);
router.post('/:projectId/milestones', addMilestone);
router.post('/:projectId/activities', logProjectActivity);
router.post('/:projectId/messages', postProjectMessage);

module.exports = router;
