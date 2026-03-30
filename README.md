# king-api

- PORT=5000
- NODE_ENV=development
- MONGO_URI=mongodb://127.0.0.1:27017/auth_db
- JWT_SECRET=your_super_strong_jwt_secret_here
- JWT_EXPIRE=1d
- SCRAPE_SECRET=king-scrape-2026

# Performance
- REQUEST_TIMEOUT=10000
- MAX_BODY_SIZE=100kb
- CACHE_TTL=30

# CORS
- ALLOWED_ORIGINS=http://localhost:5173,https://www.sattakingresult.info
