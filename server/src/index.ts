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

import path from 'path';

// Register API Routes
app.use('/api', apiRouter);

// Serve Static React Frontend Production Build
const clientPath = path.join(__dirname, '../../dist');
app.use(express.static(clientPath));

// Catch-All Route for React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
  console.log(`Serving API and React Frontend from ${clientPath}`);
});
