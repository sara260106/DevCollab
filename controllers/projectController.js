const db = require('../db/connection');

const getAllProjects = async (req, res) => {
    const { limit = 20, offset = 0, skill } = req.query;
    
    try {
        let query = `
            SELECT p.*, u.name as owner_name 
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            WHERE p.status = 'open'
        `;
        const params = [];
        
        if (skill) {
            query += ` AND EXISTS (
                SELECT 1 FROM project_skills ps 
                WHERE ps.project_id = p.id AND ps.skill_name = ?
            )`;
            params.push(skill);
        }
        
        query += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), parseInt(offset));
        
        const [projects] = await db.query(query, params);
        
        // Get skills for each project
        for (let project of projects) {
            const [skills] = await db.query('SELECT skill_name FROM project_skills WHERE project_id = ?', [project.id]);
            project.skills = skills.map(s => s.skill_name);
        }
        
        res.json({ projects, hasMore: projects.length === parseInt(limit) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

const getProjectById = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [projects] = await db.query(`
            SELECT p.*, u.name as owner_name, u.id as owner_id, u.email as owner_email
            FROM projects p
            JOIN users u ON p.owner_id = u.id
            WHERE p.id = ?
        `, [id]);
        
        if (projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const project = projects[0];
        const [skills] = await db.query('SELECT skill_name FROM project_skills WHERE project_id = ?', [id]);
        project.skills = skills.map(s => s.skill_name);
        
        res.json(project);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

const createProject = async (req, res) => {
    const { title, description, skills, collaborators_needed = 1 } = req.body;
    const userId = req.user.id;
    
    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
    }
    
    try {
        const [result] = await db.query(
            'INSERT INTO projects (title, description, owner_id, collaborators_needed) VALUES (?, ?, ?, ?)',
            [title, description, userId, collaborators_needed]
        );
        
        const projectId = result.insertId;
        
        if (skills && skills.length > 0) {
            const skillValues = skills.map(skill => [projectId, skill]);
            await db.query('INSERT INTO project_skills (project_id, skill_name) VALUES ?', [skillValues]);
        }
        
        res.status(201).json({ id: projectId, message: 'Project created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

const updateProject = async (req, res) => {
    const { id } = req.params;
    const { title, description, status, collaborators_needed } = req.body;
    const userId = req.user.id;
    
    try {
        const [project] = await db.query('SELECT owner_id FROM projects WHERE id = ?', [id]);
        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        if (project[0].owner_id !== userId) {
            return res.status(403).json({ error: 'You can only edit your own projects' });
        }
        
        await db.query(
            'UPDATE projects SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status), collaborators_needed = COALESCE(?, collaborators_needed) WHERE id = ?',
            [title, description, status, collaborators_needed, id]
        );
        
        res.json({ message: 'Project updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update project' });
    }
};

const deleteProject = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        const [project] = await db.query('SELECT owner_id FROM projects WHERE id = ?', [id]);
        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        if (project[0].owner_id !== userId) {
            return res.status(403).json({ error: 'You can only delete your own projects' });
        }
        
        await db.query('DELETE FROM projects WHERE id = ?', [id]);
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

module.exports = { getAllProjects, getProjectById, createProject, updateProject, deleteProject };