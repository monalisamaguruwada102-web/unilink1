import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { requireAuth } from './middleware/requireAuth';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Public Route
app.get('/', (req, res) => {
  res.json({ message: 'UniLink Backend API Server running successfully! 🚀' });
});

// Protected Route Example (Phase 3 Prep)
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ 
    message: 'You have entered the secure zone',
    userId: req.userId 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Test simple endpoint: http://localhost:${PORT}/`);
});
