import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', apiRouter);

// Public Route
app.get('/', (req, res) => {
  res.json({ message: 'UniLink Backend API Server running successfully! 🚀' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Test simple endpoint: http://localhost:${PORT}/`);
});
