const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/generated', express.static('generated'));

// Create necessary directories
const directories = ['uploads', 'generated'];
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Product Image Generator API',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /upload - Upload dress image',
      generate: 'POST /generate - Generate product image with model',
      health: 'GET /health - Check API health'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Generate product image endpoint
app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const uploadedImagePath = req.file.path;
    const uploadedImageUrl = `${req.protocol}://${req.get('host')}/${uploadedImagePath}`;

    // Here you would integrate with AI API (FASHN.ai, DALL-E, etc.)
    // For now, returning a placeholder response
    
    res.json({
      message: 'Image processing initiated',
      uploadedImage: uploadedImageUrl,
      status: 'processing',
      note: 'Integrate with AI API (FASHN.ai, Piccopilot, or similar) to generate product images with models',
      integrationSteps: [
        '1. Sign up for an AI image generation API (FASHN.ai recommended for fashion)',
        '2. Add API key to .env file: AI_API_KEY=your_key_here',
        '3. Implement API call to generate image with model',
        '4. Save generated image to /generated directory',
        '5. Return generated image URL'
      ]
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ error: 'Failed to generate product image' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API Documentation: http://localhost:${PORT}/`);
});
