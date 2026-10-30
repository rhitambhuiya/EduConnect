const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary if environment variables are provided
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// Memory storage for multer so files can be directly streamed to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB max limit
});

/**
 * Upload a file buffer to Cloudinary (or fallback to local disk if Cloudinary is not yet configured)
 * @param {Buffer} buffer - File buffer from multer
 * @param {string} originalname - Original file name
 * @param {string} folder - Target folder in Cloudinary
 * @returns {Promise<{ fileUrl: string, cloudinaryId: string, fileName: string }>}
 */
async function uploadToCloudinary(buffer, originalname, folder = 'college_portal') {
  const safeName = originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;

  if (!isCloudinaryConfigured) {
    // Graceful fallback to local disk when testing without Cloudinary credentials
    const localUploadsDir = path.join(__dirname, '..', 'data', 'uploads');
    if (!fs.existsSync(localUploadsDir)) {
      fs.mkdirSync(localUploadsDir, { recursive: true });
    }
    const localFilePath = path.join(localUploadsDir, uniqueName);
    fs.writeFileSync(localFilePath, buffer);

    return {
      fileUrl: `/api/notes/file/${uniqueName}`,
      cloudinaryId: uniqueName,
      fileName: uniqueName
    };
  }

  // Stream to Cloudinary
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'raw', // Preserves exact PDF binary format
        public_id: uniqueName
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          return reject(new Error(error.message || 'Cloudinary upload failed'));
        }
        resolve({
          fileUrl: result.secure_url,
          cloudinaryId: result.public_id,
          fileName: uniqueName
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Delete a file from Cloudinary (or local disk if fallback was used)
 * @param {string} cloudinaryId
 */
async function deleteFromCloudinary(cloudinaryId) {
  if (!cloudinaryId) return;

  if (!isCloudinaryConfigured) {
    const localUploadsDir = path.join(__dirname, '..', 'data', 'uploads');
    const localFilePath = path.join(localUploadsDir, cloudinaryId);
    if (fs.existsSync(localFilePath)) {
      try {
        fs.unlinkSync(localFilePath);
      } catch (err) {
        console.error('Error deleting local file:', err);
      }
    }
    return;
  }

  try {
    await cloudinary.uploader.destroy(cloudinaryId, { resource_type: 'raw' });
  } catch (err) {
    console.error('Error deleting file from Cloudinary:', err);
  }
}

module.exports = {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  isCloudinaryConfigured
};

