const db = require('../db/connection');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken } = require('../utils/jwt');

const register = async (req, res) => {
    const { name, email, password, skills } = req.body;
    
    try {
        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // Create user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );
        
        const userId = result.insertId;
        
        // Add skills if provided
        if (skills && skills.length > 0) {
            const skillValues = skills.map(skill => [userId, skill]);
            await db.query('INSERT INTO user_skills (user_id, skill_name) VALUES ?', [skillValues]);
        }
        
        // Generate token
        const token = generateToken(userId, email);
        
        res.status(201).json({
            success: true,
            token,
            user: { id: userId, name, email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration failed' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    
    try {
        const [users] = await db.query('SELECT id, name, email, password_hash FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const user = users[0];
        const isValid = await comparePassword(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const token = generateToken(user.id, user.email);
        
        res.json({
            success: true,
            token,
            user: { id: user.id, name: user.name, email: user.email }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Login failed' });
    }
};

const getMe = async (req, res) => {
    try {
        const [users] = await db.query('SELECT id, name, email, bio, github_url, linkedin_url, reputation_score FROM users WHERE id = ?', [req.user.id]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        const [skills] = await db.query('SELECT skill_name FROM user_skills WHERE user_id = ?', [req.user.id]);
        
        res.json({
            ...users[0],
            skills: skills.map(s => s.skill_name)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user info' });
    }
};

module.exports = { register, login, getMe };