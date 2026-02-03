import express from 'express';
import { matchesRouter } from './routes/matches.js';

const app = express();
const PORT = 8000;

// JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Sportz API!' });
});

// Matches routes
app.use('/matches', matchesRouter);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
