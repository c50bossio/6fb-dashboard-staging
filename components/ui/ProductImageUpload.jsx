'use client';

import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { Button } from './Button';
import { Progress } from './progress';

export const ImageUpload = ({ 
  onImageSelect, 
  onImageRemove,
  existingImage = null,
  maxSizeMB = 5,
  acceptedFormats = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(existingImage);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file) => {
    setError(null);
    
    if (!file) {
      setError('No file selected');
      return false;
    }

    // Check file type
    if (!acceptedFormats.includes(file.type)) {
      setError('Invalid file format. Please upload JPG, PNG, GIF, or WebP images.');
      return false;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File too large. Maximum size is ${maxSizeMB}MB.`);
      return false;
    }

    return true;
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      handleFile(file);
    }
  }, []);

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (file && validateFile(file)) {
      handleFile(file);
    }
  };

  const handleFile = async (file) => {
    // Create local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percentComplete);
        }
      });

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.url) {
            onImageSelect(response.url, file);
            setUploadProgress(100);
          } else {
            throw new Error('Upload failed - no URL returned');
          }
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
        setUploading(false);
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        setError('Upload failed. Please try again.');
        setUploading(false);
        setPreview(null);
      });

      // Send request
      xhr.open('POST', '/api/inventory/upload-image');
      xhr.send(formData);

    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setUploading(false);
      setPreview(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    setUploadProgress(0);
    if (onImageRemove) {
      onImageRemove();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {!preview ? (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${error ? 'border-red-300 bg-red-50' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="image-upload"
            className="sr-only"
            accept={acceptedFormats.join(',')}
            onChange={handleChange}
            disabled={uploading}
          />
          
          <label
            htmlFor="image-upload"
            className="flex flex-col items-center justify-center cursor-pointer"
          >
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {dragActive ? 'Drop image here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, GIF, WebP up to {maxSizeMB}MB
            </p>
          </label>

          {uploading && (
            <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
              <div className="w-full max-w-xs space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-center text-gray-600">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-24 bg-white rounded border">
              <img
                src={preview}
                alt="Product"
                className="w-full h-full object-cover rounded"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Image uploaded</p>
              <p className="text-xs text-gray-500 mt-1">
                Image will be optimized for web display
              </p>
              {uploading && (
                <div className="mt-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-gray-600 mt-1">
                    {uploadProgress}% complete
                  </p>
                </div>
              )}
            </div>
            {!uploading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                className="p-1"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};