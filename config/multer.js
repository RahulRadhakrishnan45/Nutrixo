const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('./cloudinary'); // path to config/cloudinary.js

// shared file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  if (allowedTypes.test(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images are allowed'), false);
  }
};

// storage for brand images
const brandStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nutrixo/brands',
    format: async (req, file) => file.mimetype.split('/')[1], // jpg/png/webp...
    public_id: (req, file) => `brand_${Date.now()}_${Math.round(Math.random()*1e6)}`,
  },
});

// storage for product images
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nutrixo/products',
    format: async (req, file) => file.mimetype.split('/')[1],
    public_id: (req, file) => `product_${Date.now()}_${Math.round(Math.random()*1e6)}`,
  },
});

// storage for profile images
const profileStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'nutrixo/profiles',
    format: async (req, file) => file.mimetype.split('/')[1],
    public_id: (req, file) => `profile_${req.session?.user?._id || 'anon'}_${Date.now()}`,
  },
});

const uploadBrand = multer({ storage: brandStorage, fileFilter });
const uploadProduct = multer({ storage: productStorage, fileFilter });
const uploadProfile = multer({ storage: profileStorage, fileFilter });

module.exports = { uploadBrand, uploadProduct, uploadProfile };
