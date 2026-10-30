require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth');
const classRoutes = require('./routes/classes');
const noteRoutes = require('./routes/notes');
const assignmentRoutes = require('./routes/assignments');
const quizRoutes = require('./routes/quizzes');
const { db } = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for localhost and production client URLs
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    database: db.isMongoConnected ? 'mongodb-atlas' : 'local-json',
    cloudinary: Boolean(process.env.CLOUDINARY_CLOUD_NAME)
  });
});

// Serve frontend build if present
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  const indexHtml = path.join(clientDistPath, 'index.html');
  res.sendFile(indexHtml, (err) => {
    if (err) {
      res.status(200).send('College Portal API is running. Start the Vite client for the UI in development.');
    }
  });
});

app.listen(PORT, async () => {
  console.log(`===============================================`);
  console.log(` College Portal API Server running on port ${PORT}`);
  console.log(` Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);

  // Connect to MongoDB Atlas if MONGODB_URI is provided
  if (process.env.MONGODB_URI) {
    await db.connectMongo(process.env.MONGODB_URI);
  } else {
    console.log(`[Database] Running in local JSON mode (server/data/db.json).`);
    console.log(`[Database] Set MONGODB_URI in .env to connect to MongoDB Atlas.`);
  }

  if (process.env.CLOUDINARY_CLOUD_NAME) {
    console.log(`[Storage] Cloudinary configured (${process.env.CLOUDINARY_CLOUD_NAME}).`);
  } else {
    console.log(`[Storage] Cloudinary not configured yet. Using local disk fallback.`);
  }
});
