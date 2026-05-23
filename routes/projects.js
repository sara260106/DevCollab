const express = require('express');
const router = express.Router();
const { 
    getAllProjects, 
    getProjectById, 
    createProject, 
    updateProject, 
    deleteProject 
} = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

router.get('/', getAllProjects);
router.get('/:id', getProjectById);
router.post('/', authenticate, createProject);
router.put('/:id', authenticate, updateProject);
router.delete('/:id', authenticate, deleteProject);

module.exports = router;