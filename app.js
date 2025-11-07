const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/generated', express.static('generated'));
app.use(express.static('public'));

// Create necessary directories
const directories = ['uploads', 'generated', 'public'];
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
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// FREE AI Integration Functions

// 1. Hugging Face Inference API (100% FREE)
async function generateWithHuggingFace(prompt, imageBase64 = null) {
  try {
    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;
    
    if (!HF_API_KEY) {
      throw new Error('Hugging Face API key not configured. Get free key at https://huggingface.co/settings/tokens');
    }

    // Using Stable Diffusion XL for free text-to-image
    const model = 'stabilityai/stable-diffusion-xl-base-1.0';
    
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${model}`,
      { inputs: prompt },
      {
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error('Hugging Face Error:', error.response?.data || error.message);
    throw error;
  }
}

// 2. Replicate API (Free tier available)
async function generateWithReplicate(prompt, imageUrl = null) {
  try {
    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    
    if (!REPLICATE_API_TOKEN) {
      throw new Error('Replicate API token not configured. Get free credits at https://replicate.com');
    }

    // Using IDM-VTON for virtual try-on (FREE tier)
    const response = await axios.post(
      'https://api.replicate.com/v1/predictions',
      {
        version: 'c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4',
        input: {
          garm_img: imageUrl,
          human_img: 'https://example.com/model.jpg', // You can use a default model image
          garment_des: prompt
        }
      },
      {
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Replicate Error:', error.response?.data || error.message);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Product Image Generator API - FREE AI Integration',
    version: '2.0.0',
    freeServices: {
      huggingFace: 'Stable Diffusion XL - 100% Free',
      replicate: 'Free tier available with credits'
    },
    endpoints: {
      upload: 'POST /upload - Upload dress image',
      generate: 'POST /generate - Generate product image with AI',
      generateSimple: 'POST /generate-simple - Simple text-to-image',
      health: 'GET /health - Check API health'
    },
    setup: {
      huggingFace: 'Get free API key: https://huggingface.co/settings/tokens',
      replicate: 'Get free credits: https://replicate.com'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    freeAPIs: {
      huggingFace: !!process.env.HUGGINGFACE_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN
    }
  });
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
        mimetype: req.file.mimetype,
        url: `${req.protocol}://${req.get('host')}/${req.file.path}`
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Simple text-to-image generation (Hugging Face - 100% FREE)
app.post('/generate-simple', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log('Generating image with prompt:', prompt);
    
    // Generate image using free Hugging Face API
    const imageBuffer = await generateWithHuggingFace(prompt);
    
    // Save generated image
    const filename = `generated-${Date.now()}.png`;
    const filepath = path.join('generated', filename);
    fs.writeFileSync(filepath, imageBuffer);
    
    const imageUrl = `${req.protocol}://${req.get('host')}/generated/${filename}`;
    
    res.json({
      message: 'Image generated successfully',
      generatedImage: imageUrl,
      prompt: prompt,
      service: 'Hugging Face (FREE)'
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate image',
      details: error.message,
      setup: 'Add HUGGINGFACE_API_KEY to .env file. Get free key at https://huggingface.co/settings/tokens'
    });
  }
});

// Generate product image with uploaded dress (Hugging Face or Replicate)
app.post('/generate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { prompt, service } = req.body;
    const uploadedImagePath = req.file.path;
    const uploadedImageUrl = `${req.protocol}://${req.get('host')}/${uploadedImagePath}`;

    // Default prompt for fashion/product images
    const fullPrompt = prompt || 
      'Professional fashion model wearing elegant dress, studio lighting, high quality, detailed, commercial photography';

    let generatedImage;
    let usedService;

    // Try Hugging Face first (100% FREE)
    if (!service || service === 'huggingface') {
      try {
        console.log('Using Hugging Face for image generation...');
        const imageBuffer = await generateWithHuggingFace(fullPrompt);
        
        const filename = `generated-${Date.now()}.png`;
        const filepath = path.join('generated', filename);
        fs.writeFileSync(filepath, imageBuffer);
        
        generatedImage = `${req.protocol}://${req.get('host')}/generated/${filename}`;
        usedService = 'Hugging Face (FREE)';
      } catch (hfError) {
        console.error('Hugging Face failed:', hfError.message);
        
        // Fallback to Replicate if available
        if (process.env.REPLICATE_API_TOKEN) {
          console.log('Falling back to Replicate...');
          const result = await generateWithReplicate(fullPrompt, uploadedImageUrl);
          generatedImage = result.urls?.get || result.id;
          usedService = 'Replicate (Free Tier)';
        } else {
          throw new Error('No AI service configured properly');
        }
      }
    }

    res.json({
      message: 'Image processing completed',
      uploadedImage: uploadedImageUrl,
      generatedImage: generatedImage,
      prompt: fullPrompt,
      service: usedService,
      status: 'completed'
    });
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate product image',
      details: error.message,
      setup: {
        huggingFace: 'Add HUGGINGFACE_API_KEY to .env - Get free at https://huggingface.co/settings/tokens',
        replicate: 'Add REPLICATE_API_TOKEN to .env - Get free credits at https://replicate.com'
      }
    });
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
  console.log(`\n🚀 Product Image Generator Server`);
  console.log(`📍 Running on port ${PORT}`);
  console.log(`🌐 API Documentation: http://localhost:${PORT}/`);
  console.log(`\n✅ FREE AI Services:`);
  console.log(`   - Hugging Face: ${process.env.HUGGINGFACE_API_KEY ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`   - Replicate: ${process.env.REPLICATE_API_TOKEN ? '✓ Configured' : '✗ Not configured'}`);
  console.log(`\n📖 Setup Guide: https://github.com/anbuwebnexs/product-image-generator\n`);
});
