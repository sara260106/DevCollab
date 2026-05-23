const db = require('../db/connection');

const getUserProfile = async (req, res) => {
    const { id } = req.params;
    
    try {
        const [users] = await db.query(
            'SELECT id, name, email, bio, github_url, linkedin_url, reputation_score, created_at FROM users WHERE id = ?',
            [id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const [skills] = await db.query('SELECT skill_name FROM user_skills WHERE user_id = ?', [id]);
        const [projects] = await db.query(
            'SELECT id, title, status FROM projects WHERE owner_id = ? ORDER BY created_at DESC LIMIT 5',
            [id]
        );
        
        res.json({
            ...users[0],
            skills: skills.map(s => s.skill_name),
            recentProjects: projects
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
};

const updateProfile = async (req, res) => {
    const { id } = req.params;
    const { name, bio, github_url, linkedin_url, skills } = req.body;
    const userId = req.user.id;
    
    if (parseInt(id) !== userId) {
        return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    try {
        await db.query(
            'UPDATE users SET name = COALESCE(?, name), bio = COALESCE(?, bio), github_url = COALESCE(?, github_url), linkedin_url = COALESCE(?, linkedin_url) WHERE id = ?',
            [name, bio, github_url, linkedin_url, id]
        );
        
        if (skills) {
            await db.query('DELETE FROM user_skills WHERE user_id = ?', [id]);
            const skillValues = skills.map(s => [id, s]);
            await db.query('INSERT INTO user_skills (user_id, skill_name) VALUES ?', [skillValues]);
        }
        
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

const searchUsers = async (req, res) => {
    const { q } = req.query;
    
    if (!q) {
        return res.json({ users: [] });
    }
    
    try {
        const [users] = await db.query(
            'SELECT id, name, email, reputation_score FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 20',
            [`%${q}%`, `%${q}%`]
        );
        
        res.json({ users });
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports = { getUserProfile, updateProfile, searchUsers };