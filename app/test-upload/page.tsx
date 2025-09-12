"use client";

import { useState, useRef } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { apiClient } from '../../lib/api-client';

interface UploadResult {
  success: boolean;
  data?: {
    id: string;
    url: string;
    filename: string;
    fileSize: number;
    mimeType: string;
    type: string;
    width?: number;
    height?: number;
    format: string;
    uploadedAt: string;
  };
  error?: string;
}

export default function UploadTestPage() {
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      
      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl('');
      }
      
      setUploadResult('');
    }
  };

  const getFileType = (mimeType: string): 'image' | 'video' | 'document' => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'document';
  };

  const testUpload = async () => {
    if (!selectedFile) {
      setUploadResult('No file selected');
      return;
    }

    if (!userId) {
      setUploadResult('User not authenticated. Please connect wallet first.');
      return;
    }

    setIsUploading(true);
    setUploadResult('Uploading file...');

    try {
      // Prepare form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const metadata = {
        uploaderId: userId,
        type: getFileType(selectedFile.type),
        description: 'Test upload from upload test page',
        folder: 'evidence'
      };
      
      formData.append('metadata', JSON.stringify(metadata));

      // Test direct API call
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          ...(walletAddress && { 'X-Wallet-Address': walletAddress })
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        setUploadResult(`Upload Success!\n${JSON.stringify(result.data, null, 2)}`);
      } else {
        setUploadResult(`Upload Failed: ${result.error}`);
      }
    } catch (error) {
      setUploadResult(`Upload Error: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const testApiClientUpload = async () => {
    if (!selectedFile) {
      setUploadResult('No file selected');
      return;
    }

    if (!userId) {
      setUploadResult('User not authenticated. Please connect wallet first.');
      return;
    }

    setIsUploading(true);
    setUploadResult('Testing API client upload...');

    try {
      const result = await apiClient.uploadEvidence(selectedFile, {
        uploaderId: userId,
        type: getFileType(selectedFile.type),
        description: 'Test upload via API client',
        folder: 'evidence'
      });
      
      if (result.success) {
        setUploadResult(`API Client Upload Success!\n${JSON.stringify(result.data, null, 2)}`);
      } else {
        setUploadResult(`API Client Upload Failed: ${result.error}`);
      }
    } catch (error) {
      setUploadResult(`API Client Upload Error: ${error}`);
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setUploadResult('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Evidence Upload Test</h1>
        
        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Is Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {userId || 'None'}</p>
            <p><strong>Wallet Address:</strong> {walletAddress || 'None'}</p>
          </div>
          {!isAuthenticated && (
            <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
              <p className="text-yellow-800">⚠️ Please connect your wallet first to test uploads</p>
              <a href="/test-wallet" className="text-blue-600 hover:underline">Go to Wallet Test Page</a>
            </div>
          )}
        </div>

        {/* File Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">File Selection</h2>
          
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept="image/*,video/*,.pdf,.txt,.doc,.docx"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            
            {selectedFile && (
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Selected File:</h3>
                <div className="text-sm space-y-1">
                  <p><strong>Name:</strong> {selectedFile.name}</p>
                  <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  <p><strong>Type:</strong> {selectedFile.type}</p>
                  <p><strong>Detected Category:</strong> {getFileType(selectedFile.type)}</p>
                </div>
                
                {previewUrl && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2">Preview:</h4>
                    <img 
                      src={previewUrl} 
                      alt="Preview" 
                      className="max-w-xs max-h-48 object-contain border rounded-lg"
                    />
                  </div>
                )}
                
                <button
                  onClick={clearSelection}
                  className="mt-4 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Upload Tests */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload Tests</h2>
          
          <div className="space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={testUpload}
                disabled={!selectedFile || isUploading || !isAuthenticated}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg"
              >
                {isUploading ? 'Uploading...' : 'Test Direct API Upload'}
              </button>
              
              <button
                onClick={testApiClientUpload}
                disabled={!selectedFile || isUploading || !isAuthenticated}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-lg"
              >
                {isUploading ? 'Uploading...' : 'Test API Client Upload'}
              </button>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Upload Result:</h3>
              <pre className="text-sm font-mono whitespace-pre-wrap overflow-auto max-h-96">
                {uploadResult || 'No upload attempted yet'}
              </pre>
            </div>
          </div>
        </div>

        {/* Cloudinary Configuration Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cloudinary Configuration</h2>
          <div className="text-sm space-y-2">
            <p><strong>Cloud Name:</strong> {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'Not set'}</p>
            <p><strong>API Key:</strong> {process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ? 'Set' : 'Not set'}</p>
            <p><strong>API Secret:</strong> {'Set (hidden for security)'}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg mr-4"
          >
            Back to Main App
          </a>
          <a
            href="/test-wallet"
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
          >
            Wallet Test Page
          </a>
        </div>
      </div>
    </div>
  );
}