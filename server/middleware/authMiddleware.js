const authMiddleware = (req, res, next) => {
  console.log('Auth Middleware Invoked');
  // Check if a session exists and has a user property
  if (req.session && req.session.user) {
    console.log('User is authenticated:', req.session.user);
    // Attach user ID to the request object for use in other routes
    req.user = req.session.user; 
    next();
  } else {
    res.status(401).json({ msg: 'Not authorized' });
  }
};

export default authMiddleware;