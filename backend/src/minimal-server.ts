import express from 'express';

const app = express();
const PORT = 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

const server = app.listen(PORT, () => {
  console.log(`✓ Minimal backend server running on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
});

export default server;
