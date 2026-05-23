const express = require('express');
const router = express.Router();
const { getUserProfile, updateProfile, searchUsers } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/:id', getUserProfile);
router.put('/:id', authenticate, updateProfile);
router.get('/search', searchUsers);

module.exports = router;