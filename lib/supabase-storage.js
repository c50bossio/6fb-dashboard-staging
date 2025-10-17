import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Upload image to Supabase Storage
 * @param {File} file - The image file to upload
 * @param {string} bucket - The storage bucket name
 * @param {string} path - The path within the bucket
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadImage(file, bucket = 'product-images', path = '') {
  try {
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = file.name.split('.').pop().toLowerCase();
    const fileName = `${timestamp}-${randomStr}.${fileExt}`;
    const fullPath = path ? `${path}/${fileName}` : fileName;

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(fullPath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(fullPath);

    return {
      url: publicUrl,
      path: fullPath
    };
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
}

/**
 * Delete image from Supabase Storage
 * @param {string} path - The full path to the image
 * @param {string} bucket - The storage bucket name
 */
export async function deleteImage(path, bucket = 'product-images') {
  try {
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }

    return true;
  } catch (error) {
    console.error('Image delete error:', error);
    throw error;
  }
}

/**
 * Create a thumbnail version of an image
 * Note: This is a placeholder - actual implementation would use
 * a service like Supabase Edge Functions or a third-party API
 * @param {string} originalUrl - URL of the original image
 * @returns {Promise<string>} - URL of the thumbnail
 */
export async function createThumbnail(originalUrl) {
  // For now, return the original URL
  // In production, this would call an image processing service
  return originalUrl;
}

/**
 * Validate image file
 * @param {File} file - The file to validate
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {boolean}
 */
export function validateImageFile(file, maxSizeMB = 5) {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.');
  }

  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > maxSizeMB) {
    throw new Error(`File too large. Maximum size is ${maxSizeMB}MB.`);
  }

  return true;
}

/**
 * Get optimized image URL with transformation parameters
 * Note: This requires Supabase Image Transformation to be enabled
 * @param {string} url - Original image URL
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
export function getOptimizedImageUrl(url, options = {}) {
  const { width = 800, height = 800, quality = 80 } = options;
  
  // If using Supabase Image Transformation
  // return `${url}?width=${width}&height=${height}&quality=${quality}`;
  
  // For now, return original URL
  return url;
}