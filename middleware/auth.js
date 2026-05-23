const { verifyToken } = require('../utils/jwt');

const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = { id: decoded.id, email: decoded.email };
    next();
};

module.exports = { authenticate };