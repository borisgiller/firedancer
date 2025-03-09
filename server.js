import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Log environment variables for debugging
console.log('Environment variables:');
console.log(`PORT: ${process.env.PORT}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);

// Check if dist directory exists
import fs from 'fs';
const distPath = path.join(__dirname, 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(distPath)) {
  console.error('Error: dist directory does not exist!');
  console.log('Current directory:', __dirname);
  console.log('Files in current directory:', fs.readdirSync(__dirname));
}

if (!fs.existsSync(indexPath)) {
  console.error('Error: index.html does not exist in dist directory!');
  if (fs.existsSync(distPath)) {
    console.log('Files in dist directory:', fs.readdirSync(distPath));
  }
}

// Serve static files from the dist directory
app.use(express.static(distPath));

// For any request that doesn't match a static file, send the index.html
app.get('*', (req, res) => {
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(500).send('Error: index.html not found. The build may not have completed successfully.');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
