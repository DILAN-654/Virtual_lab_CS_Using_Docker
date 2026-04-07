const express = require('express');
const router = express.Router();
const {
    getGamification,
    awardPoints,
    addXP,
    awardBadge,
    getLeaderboard
} = require('../controllers/gamificationController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getGamification);
router.post('/award', awardPoints);
router.post('/xp', addXP);
router.post('/badge', awardBadge);
router.get('/leaderboard', getLeaderboard);

module.exports = router;

