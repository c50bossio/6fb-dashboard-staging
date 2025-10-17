#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupBucket() {

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return false;
  }
  
  const bucketExists = buckets?.some(bucket => bucket.name === 'product-images');
  
  if (!bucketExists) {
    
    const { data, error } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      return false;
    }
    
  } else {

    // Update bucket settings to ensure it's public
    const { error: updateError } = await supabase.storage.updateBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (updateError) {
      
    } else {
      
    }
  }
  
  return true;
}

async function testUpload() {

  // Create a test image buffer (1x1 transparent PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const fileName = `test-${timestamp}-${randomStr}.png`;
  const filePath = `products/${fileName}`;

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filePath, testImageBuffer, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    console.error('❌ Upload failed:', error.message);
    return false;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);

  // Test deletion
  
  const { error: deleteError } = await supabase.storage
    .from('product-images')
    .remove([filePath]);
  
  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    return false;
  }

  return true;
}

async function testAPIEndpoint() {

  // Create form data with test image
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  const blob = new Blob([testImageBuffer], { type: 'image/png' });
  
  const formData = new FormData();
  formData.append('image', blob, 'test.png');
  
  try {
    const response = await fetch('http://localhost:9999/api/inventory/upload-image', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, result);
      return false;
    }

    // Clean up uploaded image
    if (result.path) {
      const { error } = await supabase.storage
        .from('product-images')
        .remove([result.path]);
      
      if (!error) {
        
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ API request error:', error.message);
    return false;
  }
}

async function main() {

   + '...\n');
  
  // Setup bucket
  const bucketReady = await setupBucket();
  if (!bucketReady) {
    
    process.exit(1);
  }
  
  // Test direct upload
  const uploadSuccess = await testUpload();
  if (!uploadSuccess) {
    
    process.exit(1);
  }
  
  // Test API endpoint
  const apiSuccess = await testAPIEndpoint();
  if (!apiSuccess) {
    ');
    
  }

   + ' API endpoint ' + (apiSuccess ? 'working' : 'needs server running'));
  
}

main().catch(console.error);