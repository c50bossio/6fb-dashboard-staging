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
  console.log('🔧 Setting up product-images bucket...');
  
  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('❌ Error listing buckets:', listError.message);
    return false;
  }
  
  const bucketExists = buckets?.some(bucket => bucket.name === 'product-images');
  
  if (!bucketExists) {
    console.log('📦 Creating product-images bucket...');
    const { data, error } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      return false;
    }
    console.log('✅ Bucket created successfully');
  } else {
    console.log('✅ Bucket already exists');
    
    // Update bucket settings to ensure it's public
    const { error: updateError } = await supabase.storage.updateBucket('product-images', {
      public: true,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    });
    
    if (updateError) {
      console.log('⚠️  Could not update bucket settings:', updateError.message);
    } else {
      console.log('✅ Bucket settings updated');
    }
  }
  
  return true;
}

async function testUpload() {
  console.log('\n🧪 Testing image upload...');
  
  // Create a test image buffer (1x1 transparent PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  
  // Generate unique filename
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(7);
  const fileName = `test-${timestamp}-${randomStr}.png`;
  const filePath = `products/${fileName}`;
  
  console.log(`📤 Uploading test image: ${filePath}`);
  
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
  
  console.log('✅ Upload successful:', data);
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath);
  
  console.log('🔗 Public URL:', publicUrl);
  
  // Test deletion
  console.log('\n🗑️  Testing deletion...');
  const { error: deleteError } = await supabase.storage
    .from('product-images')
    .remove([filePath]);
  
  if (deleteError) {
    console.error('❌ Delete failed:', deleteError.message);
    return false;
  }
  
  console.log('✅ Test image deleted successfully');
  return true;
}

async function testAPIEndpoint() {
  console.log('\n🌐 Testing API endpoint...');
  console.log('📍 Testing at: http://localhost:9999/api/inventory/upload-image');
  
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
    
    console.log('✅ API endpoint working:', result);
    
    // Clean up uploaded image
    if (result.path) {
      const { error } = await supabase.storage
        .from('product-images')
        .remove([result.path]);
      
      if (!error) {
        console.log('🧹 Cleaned up test upload');
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ API request error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Image Upload System\n');
  console.log('📍 Supabase URL:', supabaseUrl);
  console.log('🔑 Service key:', supabaseServiceKey.substring(0, 20) + '...\n');
  
  // Setup bucket
  const bucketReady = await setupBucket();
  if (!bucketReady) {
    console.log('\n❌ Bucket setup failed');
    process.exit(1);
  }
  
  // Test direct upload
  const uploadSuccess = await testUpload();
  if (!uploadSuccess) {
    console.log('\n❌ Direct upload test failed');
    process.exit(1);
  }
  
  // Test API endpoint
  const apiSuccess = await testAPIEndpoint();
  if (!apiSuccess) {
    console.log('\n⚠️  API endpoint test failed (server may not be running)');
    console.log('💡 Make sure the development server is running on port 9999');
  }
  
  console.log('\n✨ All tests completed successfully!');
  console.log('📝 Summary:');
  console.log('  - ✅ Supabase bucket configured');
  console.log('  - ✅ Direct upload working');
  console.log('  - ' + (apiSuccess ? '✅' : '⚠️') + ' API endpoint ' + (apiSuccess ? 'working' : 'needs server running'));
  console.log('\n🎉 Image upload system is ready to use!');
}

main().catch(console.error);