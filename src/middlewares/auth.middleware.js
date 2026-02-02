const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // 1. Fail fast: Check cookie immediately
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  // 2. Async Verification: Unblocks the Event Loop
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // 3. Performance/UX: Distinguish between Expired vs Invalid
      // This helps frontend decide whether to refresh token or redirect to login
      const message = err.name === 'TokenExpiredError' 
        ? "Token expired" 
        : "Invalid token";
      
      return res.status(401).json({ message });
    }

    // 4. Optimization: Attach data for downstream speed
    // Keep 'req.user' as ID to preserve your existing logic compatibility
    req.user = decoded.id; 
    
    // Attach full payload (e.g., role, email) so controllers DON'T need to query DB
    // Usage in controller: if (req.tokenPayload.role === 'admin') ...
    req.tokenPayload = decoded; 

    next();
  });
};