"use client";

import React, { useState, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Evidence } from '@/lib/models';

type EvidenceType = 'image' | 'video' | 'link' | 'text';

interface EvidenceUploadProps {
  onEvidenceAdd: (evidence: Evidence) => void;
  onClose: () => void;
  profileName: string;
  ratingType: 'dated' | 'hookup' | 'transactional';
  ratingId?: string;
}

export const EvidenceUpload = ({ onEvidenceAdd, onClose, profileName, ratingType, ratingId }: EvidenceUploadProps) => {
  const [activeTab, setActiveTab] = useState<EvidenceType>('image');
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [linkDescription, setLinkDescription] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Mock user ID - replace with actual user context
  const userId = 'current-user-id';
  const isAuthenticated = true;

  const getRatingEmoji = (type: 'dated' | 'hookup' | 'transactional') => {
    switch (type) {
      case 'dated': return '❤️';
      case 'hookup': return '🔥';
      case 'transactional': return '💵';
      default: return '📝';
    }
  };

  const getRatingColor = (type: 'dated' | 'hookup' | 'transactional') => {
    switch (type) {
      case 'dated': return 'from-red-400 to-pink-500';
      case 'hookup': return 'from-orange-400 to-red-500';
      case 'transactional': return 'from-green-400 to-emerald-500';
      default: return 'from-gray-400 to-gray-500';
    }
  };

  // Upload file to Cloudinary
  const uploadFileToCloudinary = async (file: File): Promise<{ url: string; filename: string; fileSize: number }> => {
    setIsUploading(true);
    
    try {
      const fileType = file.type.startsWith('image/') ? 'image' : 
                      file.type.startsWith('video/') ? 'video' : 'document';
      
      const response = await apiClient.uploadEvidence(file, {
        uploaderId: userId || 'anonymous',
        type: fileType,
        folder: 'evidence',
        description: `Evidence for ${profileName} - ${ratingType} rating`
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Upload failed');
      }
      
      return {
        url: response.data.url,
        filename: response.data.filename,
        fileSize: response.data.fileSize
      };
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    // Check if user is authenticated
    if (!isAuthenticated || !userId) {
      alert('Please connect your wallet to upload evidence');
      return;
    }
    
    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }
    
    if (file.size > 100 * 1024 * 1024) { // 100MB limit for videos, 10MB for images
      const maxSize = isImage ? '10MB' : '100MB';
      alert(`File size must be less than ${maxSize}`);
      return;
    }
    
    if (isImage && file.size > 10 * 1024 * 1024) {
      alert('Image file size must be less than 10MB');
      return;
    }
    
    try {
      const uploadResult = await uploadFileToCloudinary(file);
      
      // Create evidence record in database
      const evidenceData = {
        ratingId: ratingId || 'temp-' + Date.now(),
        uploaderId: userId || 'anonymous',
        type: (isImage ? 'image' : 'video') as EvidenceType,
        url: uploadResult.url,
        filename: uploadResult.filename,
        fileSize: uploadResult.fileSize,
        mimeType: file.type,
        description: `Evidence for ${profileName} - ${ratingType} rating`
      };
      
      const createResponse = await apiClient.createEvidence(evidenceData);
      
      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to create evidence record');
      }
      
      const evidence: Evidence = {
        _id: (createResponse.data as Evidence)._id,
        ratingId: evidenceData.ratingId,
        uploaderId: evidenceData.uploaderId,
        type: evidenceData.type,
        url: evidenceData.url,
        filename: evidenceData.filename,
        fileSize: evidenceData.fileSize,
        mimeType: evidenceData.mimeType,
        description: evidenceData.description,
        isVerified: false,
        createdAt: new Date()
      };
      
      onEvidenceAdd(evidence);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert(error instanceof Error ? error.message : 'Upload failed. Please try again.');
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkUrl.trim()) {
      alert('Please enter a valid URL');
      return;
    }
    
    // Basic URL validation
    try {
      new URL(linkUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }
    
    try {
      // Create evidence record in database
      const evidenceData = {
        ratingId: ratingId || 'temp-' + Date.now(),
        uploaderId: userId || 'anonymous',
        type: 'link' as EvidenceType,
        url: linkUrl.trim(),
        description: linkDescription.trim() || `Link evidence for ${profileName} - ${ratingType} rating`
      };
      
      const createResponse = await apiClient.createEvidence(evidenceData);
      
      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to create evidence record');
      }
      
      const evidence: Evidence = {
        _id: (createResponse.data as Evidence)._id,
        ratingId: evidenceData.ratingId,
        uploaderId: evidenceData.uploaderId,
        type: evidenceData.type,
        url: evidenceData.url,
        description: evidenceData.description,
        isVerified: false,
        createdAt: new Date()
      };
      
      onEvidenceAdd(evidence);
      onClose();
    } catch (error) {
      console.error('Failed to create link evidence:', error);
      alert(error instanceof Error ? error.message : 'Failed to create evidence. Please try again.');
    }
  };

  const handleTextSubmit = async () => {
    if (!textContent.trim()) {
      alert('Please enter some text content');
      return;
    }
    
    try {
      // Create evidence record in database
      const evidenceData = {
        ratingId: ratingId || 'temp-' + Date.now(),
        uploaderId: userId || 'anonymous',
        type: 'text' as EvidenceType,
        url: `text:${Date.now()}`, // Use a unique identifier for text content
        description: textContent.trim(),
        filename: textTitle.trim() || 'Text Evidence'
      };
      
      const createResponse = await apiClient.createEvidence(evidenceData);
      
      if (!createResponse.success) {
        throw new Error(createResponse.error || 'Failed to create evidence record');
      }
      
      const evidence: Evidence = {
        _id: (createResponse.data as Evidence)._id,
        ratingId: evidenceData.ratingId,
        uploaderId: evidenceData.uploaderId,
        type: evidenceData.type,
        url: evidenceData.url,
        description: evidenceData.description,
        filename: evidenceData.filename,
        isVerified: false,
        createdAt: new Date()
      };
      
      onEvidenceAdd(evidence);
      onClose();
    } catch (error) {
      console.error('Failed to create text evidence:', error);
      alert(error instanceof Error ? error.message : 'Failed to create evidence. Please try again.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const ImageVideoUpload = () => (
    <div className="space-y-6">
      {/* Drag & Drop Area */}
      <div
        className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 ${
          dragActive
            ? 'border-pink-400 bg-pink-50 scale-105'
            : 'border-gray-300 hover:border-pink-300 hover:bg-pink-25'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="text-6xl mb-4">
          {activeTab === 'image' ? '📸' : '🎥'}
        </div>
        <div className="text-xl font-bold text-gray-700 mb-2">
          {activeTab === 'image' ? 'Upload Photo Evidence' : 'Upload Video Evidence'}
        </div>
        <div className="text-gray-500 mb-6">
          Drag & drop your {activeTab} here, or click to browse
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isUploading ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Uploading...</span>
            </div>
          ) : (
            `📁 Choose ${activeTab === 'image' ? 'Photo' : 'Video'}`
          )}
        </button>
        
        <input
          ref={fileInputRef}
          type="file"
          accept={activeTab === 'image' ? 'image/*' : 'video/*'}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>
      
      {/* File Requirements */}
      <div className="glass-card p-4">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">📋 Requirements:</div>
          <ul className="space-y-1 text-xs">
            <li>• Max file size: {activeTab === 'image' ? '10MB' : '100MB'}</li>
            <li>• {activeTab === 'image' ? 'Formats: JPG, PNG, GIF, WebP' : 'Formats: MP4, MOV, AVI, WebM'}</li>
            <li>• Keep it appropriate and respectful</li>
            <li>• Evidence should support your rating</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const LinkUpload = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🔗</div>
        <div className="text-xl font-bold text-gray-700 mb-2">Add Link Evidence</div>
        <div className="text-gray-500">Share a link that supports your rating</div>
      </div>
      
      <div className="space-y-4">
        {/* URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">URL *</label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com/evidence"
            className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
          />
        </div>
        
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
          <input
            type="text"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Give this link a title"
            maxLength={100}
            className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
          />
        </div>
        
        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
          <textarea
            value={linkDescription}
            onChange={(e) => setLinkDescription(e.target.value)}
            placeholder="Explain how this link supports your rating"
            rows={3}
            maxLength={200}
            className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm resize-none"
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {linkDescription.length}/200
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <button
        onClick={handleLinkSubmit}
        disabled={!linkUrl.trim()}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
      >
        🔗 Add Link Evidence
      </button>
      
      {/* Link Guidelines */}
      <div className="glass-card p-4">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">💡 Good Link Examples:</div>
          <ul className="space-y-1 text-xs">
            <li>• Social media posts or conversations</li>
            <li>• Dating app screenshots (uploaded to image host)</li>
            <li>• Public photos or check-ins</li>
            <li>• News articles or blog posts</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const TextUpload = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">📝</div>
        <div className="text-xl font-bold text-gray-700 mb-2">Add Text Evidence</div>
        <div className="text-gray-500">Write details that support your rating</div>
      </div>
      
      <div className="space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title (optional)</label>
          <input
            type="text"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            placeholder="Give your text evidence a title"
            maxLength={100}
            className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm"
          />
        </div>
        
        {/* Text Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Text Content *</label>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Describe your experience, share messages, or provide details that support your rating..."
            rows={6}
            maxLength={1000}
            className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all duration-300 bg-white/80 backdrop-blur-sm resize-none"
          />
          <div className="text-xs text-gray-400 mt-1 text-right">
            {textContent.length}/1000
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <button
        onClick={handleTextSubmit}
        disabled={!textContent.trim()}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-2xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:transform-none"
      >
        📝 Add Text Evidence
      </button>
      
      {/* Text Guidelines */}
      <div className="glass-card p-4">
        <div className="text-sm text-gray-600">
          <div className="font-medium mb-2">💡 Good Text Examples:</div>
          <ul className="space-y-1 text-xs">
            <li>• Conversation screenshots (as text)</li>
            <li>• Personal experiences and stories</li>
            <li>• Details about dates or encounters</li>
            <li>• Context and background information</li>
          </ul>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl border border-white/30 bounce-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getRatingEmoji(ratingType)}</span>
              <div>
                <div className="font-bold text-lg">Add Evidence</div>
                <div className="text-sm text-gray-600">
                  For {profileName} • {ratingType.charAt(0).toUpperCase() + ratingType.slice(1)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>
          
          {/* Tab Selector */}
          <div className="grid grid-cols-4 bg-gray-100 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('image')}
              className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                activeTab === 'image'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📸 Photo
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                activeTab === 'video'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🎥 Video
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                activeTab === 'link'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              🔗 Link
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`py-2 px-2 rounded-xl text-xs font-medium transition-all duration-300 ${
                activeTab === 'text'
                  ? 'bg-white text-pink-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📝 Text
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {(activeTab === 'image' || activeTab === 'video') && <ImageVideoUpload />}
          {activeTab === 'link' && <LinkUpload />}
          {activeTab === 'text' && <TextUpload />}
        </div>
      </div>
    </div>
  );
};

// Evidence Display Component
interface EvidenceDisplayProps {
  evidence: Evidence[];
  onRemove?: (evidenceId: string) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
}

// Evidence Viewer Modal Component
interface EvidenceViewerProps {
  evidence: Evidence;
  onClose: () => void;
}

const EvidenceViewer = ({ evidence, onClose }: EvidenceViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Mock user ID - replace with actual user context
  const userId = 'current-user-id';

  const handleImageLoad = () => setIsLoading(false);
  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleDownload = useCallback(async () => {
    if (!evidence.url) {
      console.warn('No URL available for download');
      return;
    }
    
    try {
      await apiClient.trackEvidenceEvent({
        eventType: 'download',
        evidenceId: evidence._id!,
        userId: userId || 'anonymous',
        metadata: {
          type: evidence.type,
          timestamp: new Date().toISOString()
        }
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = evidence.url;
      link.download = evidence.filename || `evidence-${evidence._id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.warn('Failed to track evidence download:', error);
    }
  }, [evidence, userId]);

  const handleShare = useCallback(async () => {
    if (!evidence.url) {
      console.warn('No URL available for sharing');
      return;
    }
    
    try {
      await apiClient.trackEvidenceEvent({
        eventType: 'share',
        evidenceId: evidence._id!,
        userId: userId || 'anonymous',
        metadata: {
          type: evidence.type,
          timestamp: new Date().toISOString()
        }
      });
      
      if (navigator.share) {
        await navigator.share({
          title: `Evidence - ${evidence.type}`,
          text: evidence.description || 'Check out this evidence',
          url: evidence.url
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(evidence.url);
        alert('Link copied to clipboard!');
      }
    } catch (error) {
      console.warn('Failed to share evidence:', error);
    }
  }, [evidence, userId]);

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {evidence.type === 'image' ? '📸' : evidence.type === 'video' ? '🎥' : evidence.type === 'link' ? '🔗' : '📝'}
            </div>
            <div>
              <div className="font-bold text-lg">
                {evidence.type.charAt(0).toUpperCase() + evidence.type.slice(1)} Evidence
              </div>
              <div className="text-sm text-gray-600">
                {formatDate(evidence.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Download Button */}
            {evidence.type !== 'link' && (
              <button
                onClick={handleDownload}
                className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 flex items-center justify-center transition-colors duration-200"
                title="Download"
              >
                📥
              </button>
            )}
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-green-100 hover:bg-green-200 flex items-center justify-center transition-colors duration-200"
              title="Share"
            >
              📤
            </button>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors duration-200"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Media Preview */}
            <div className="space-y-4">
              {evidence.type === 'image' && (
                <div className="relative bg-gray-100 rounded-2xl overflow-hidden">
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {hasError ? (
                    <div className="aspect-video flex items-center justify-center bg-gray-200 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">❌</div>
                        <div className="text-sm">Failed to load image</div>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={evidence.url || ''}
                      alt={evidence.description || 'Evidence'}
                      className="w-full h-auto max-h-96 object-contain"
                      onLoad={handleImageLoad}
                      onError={handleImageError}
                    />
                  )}
                </div>
              )}

              {evidence.type === 'video' && (
                <div className="relative bg-gray-100 rounded-2xl overflow-hidden">
                  <video
                    src={evidence.url || ''}
                    controls
                    className="w-full h-auto max-h-96"
                    onLoadStart={() => setIsLoading(false)}
                    onError={handleImageError}
                  >
                    Your browser does not support the video tag.
                  </video>
                  {hasError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500">
                      <div className="text-center">
                        <div className="text-4xl mb-2">❌</div>
                        <div className="text-sm">Failed to load video</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {evidence.type === 'link' && (
                <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl p-6 text-white">
                  <div className="text-center">
                    <div className="text-4xl mb-4">🔗</div>
                    <div className="text-lg font-medium mb-2">
                      {evidence.description || 'Link Evidence'}
                    </div>
                    {evidence.url && isValidUrl(evidence.url) ? (
                      <a
                        href={evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-colors duration-200"
                      >
                        🌐 Open Link
                      </a>
                    ) : (
                      <div className="text-sm opacity-75">Invalid URL</div>
                    )}
                  </div>
                </div>
              )}

              {evidence.type === 'text' && (
                <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-2xl p-6 text-white">
                  <div className="text-center mb-4">
                    <div className="text-4xl mb-2">📝</div>
                    {evidence.textTitle && (
                      <div className="text-xl font-bold mb-4">
                        {evidence.textTitle}
                      </div>
                    )}
                  </div>
                  <div className="bg-white/10 rounded-xl p-4 text-left">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {evidence.textContent || evidence.description || 'No content available'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                {evidence.isVerified && (
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <span>✓</span>
                    <span>Verified</span>
                  </div>
                )}
                {evidence.isFlagged && (
                  <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Flagged</span>
                  </div>
                )}
                {evidence.isRejected && (
                  <div className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center space-x-1">
                    <span>❌</span>
                    <span>Rejected</span>
                  </div>
                )}
              </div>

              {/* File Information */}
              {(evidence.filename || evidence.fileSize || evidence.mimeType) && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="font-medium text-gray-700 mb-2">File Information</div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {evidence.filename && (
                      <div><span className="font-medium">Filename:</span> {evidence.filename}</div>
                    )}
                    {evidence.fileSize && (
                      <div><span className="font-medium">Size:</span> {(evidence.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                    )}
                    {evidence.mimeType && (
                      <div><span className="font-medium">Type:</span> {evidence.mimeType}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {evidence.description && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <div className="font-medium text-gray-700 mb-2">Description</div>
                  <div className="text-sm text-gray-600">{evidence.description}</div>
                </div>
              )}

              {/* Verification Details */}
              {(evidence.verifiedAt || evidence.adminNotes) && (
                <div className="bg-green-50 rounded-2xl p-4">
                  <div className="font-medium text-green-700 mb-2">Verification Details</div>
                  <div className="space-y-1 text-sm text-green-600">
                    {evidence.verifiedAt && (
                      <div><span className="font-medium">Verified:</span> {formatDate(evidence.verifiedAt)}</div>
                    )}
                    {evidence.verifiedBy && (
                      <div><span className="font-medium">By:</span> {evidence.verifiedBy}</div>
                    )}
                    {evidence.adminNotes && (
                      <div><span className="font-medium">Notes:</span> {evidence.adminNotes}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Moderation Details */}
              {(evidence.isFlagged || evidence.flagReason) && (
                <div className="bg-red-50 rounded-2xl p-4">
                  <div className="font-medium text-red-700 mb-2">Moderation Details</div>
                  <div className="space-y-1 text-sm text-red-600">
                    {evidence.flaggedAt && (
                      <div><span className="font-medium">Flagged:</span> {formatDate(evidence.flaggedAt)}</div>
                    )}
                    {evidence.flagReason && (
                      <div><span className="font-medium">Reason:</span> {evidence.flagReason}</div>
                    )}
                    {evidence.moderationFlags && evidence.moderationFlags.length > 0 && (
                      <div><span className="font-medium">Flags:</span> {evidence.moderationFlags.join(', ')}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EvidenceDisplay = ({ 
  evidence, 
  onRemove, 
  selectable = false, 
  selectedIds = [], 
  onSelectionChange 
}: EvidenceDisplayProps) => {
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  // Mock user ID - replace with actual user context
  const userId = 'current-user-id';

  const handleViewEvidence = async (evidence: Evidence) => {
    setSelectedEvidence(evidence);
    
    // Track view event
    try {
      await apiClient.trackEvidenceEvent({
        eventType: 'view',
        evidenceId: evidence._id!,
        userId: userId || 'anonymous',
        metadata: {
          type: evidence.type,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn('Failed to track evidence view:', error);
    }
  };

  const handleSelectionToggle = (evidenceId: string) => {
    if (!selectable || !onSelectionChange) return;
    
    const isSelected = selectedIds.includes(evidenceId);
    if (isSelected) {
      onSelectionChange(selectedIds.filter(id => id !== evidenceId));
    } else {
      onSelectionChange([...selectedIds, evidenceId]);
    }
  };

  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return;
    
    if (selectedIds.length === evidence.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(evidence.map(e => e._id!).filter(Boolean));
    }
  };

  if (evidence.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        <div className="text-4xl mb-2">📝</div>
        <div className="text-sm">No evidence added yet</div>
      </div>
    );
  }

  return (
    <>
      {selectable && evidence.length > 0 && (
        <div className="mb-4 flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedIds.length === evidence.length && evidence.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedIds.length}/{evidence.length})
            </span>
          </label>
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {evidence.map((item) => {
          const isSelected = selectedIds.includes(item._id!);
          
          return (
            <div key={item._id} className="relative group">
              {selectable && (
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectionToggle(item._id!)}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              )}
            {item.type === 'image' && (
              <div 
                className={`aspect-square rounded-2xl overflow-hidden bg-gray-100 relative cursor-pointer hover:scale-105 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewEvidence(item)}
              >
                <img
                  src={item.url}
                  alt={item.description || 'Evidence'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Verification Badge */}
                {item.isVerified && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>✓</span>
                    <span>Verified</span>
                  </div>
                )}
                {/* Flagged Badge */}
                {item.isFlagged && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Flagged</span>
                  </div>
                )}
                {/* View Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/90 rounded-full p-2">
                    <span className="text-lg">👁️</span>
                  </div>
                </div>
              </div>
            )}
            
            {item.type === 'video' && (
              <div 
                className={`aspect-square rounded-2xl overflow-hidden bg-gray-100 relative cursor-pointer hover:scale-105 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewEvidence(item)}
              >
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  muted
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <div className="w-12 h-12 rounded-full bg-white/80 flex items-center justify-center">
                    ▶️
                  </div>
                </div>
                {/* Verification Badge */}
                {item.isVerified && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>✓</span>
                    <span>Verified</span>
                  </div>
                )}
                {/* Flagged Badge */}
                {item.isFlagged && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Flagged</span>
                  </div>
                )}
              </div>
            )}
            
            {item.type === 'link' && (
              <div 
                className={`aspect-square rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 p-4 flex flex-col justify-center items-center text-white text-center relative cursor-pointer hover:scale-105 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewEvidence(item)}
              >
                <div className="text-2xl mb-2">🔗</div>
                <div className="text-xs font-medium truncate w-full">
                  {item.description || 'Link Evidence'}
                </div>
                {/* Verification Badge */}
                {item.isVerified && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>✓</span>
                    <span>Verified</span>
                  </div>
                )}
                {/* Flagged Badge */}
                {item.isFlagged && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Flagged</span>
                  </div>
                )}
              </div>
            )}
            
            {item.type === 'text' && (
              <div 
                className={`aspect-square rounded-2xl bg-gradient-to-br from-green-400 to-teal-500 p-4 flex flex-col justify-center items-center text-white text-center relative cursor-pointer hover:scale-105 transition-all duration-200 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => handleViewEvidence(item)}
              >
                <div className="text-2xl mb-2">📝</div>
                <div className="text-xs font-medium truncate w-full mb-1">
                  {item.textTitle || 'Text Evidence'}
                </div>
                <div className="text-xs opacity-80 truncate w-full">
                  {item.textContent || item.description || 'Written evidence'}
                </div>
                {/* Verification Badge */}
                {item.isVerified && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>✓</span>
                    <span>Verified</span>
                  </div>
                )}
                {/* Flagged Badge */}
                {item.isFlagged && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    <span>⚠️</span>
                    <span>Flagged</span>
                  </div>
                )}
              </div>
            )}
            
            {/* File Info Tooltip */}
            {(item.filename || item.fileSize) && (
              <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {item.filename && <div className="truncate max-w-20">{item.filename}</div>}
                {item.fileSize && <div>{(item.fileSize / 1024 / 1024).toFixed(1)}MB</div>}
              </div>
            )}
            
            {/* Remove Button */}
            {onRemove && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  
                  // Track removal event
                  try {
                    await apiClient.trackEvidenceEvent({
                      eventType: 'reject',
                      evidenceId: item._id!,
                      userId: userId || 'anonymous',
                      metadata: {
                        type: item.type,
                        timestamp: new Date().toISOString()
                      }
                    });
                  } catch (error) {
                    console.warn('Failed to track evidence removal:', error);
                  }
                  
                  onRemove(item._id!);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center hover:bg-red-600"
              >
                ✕
              </button>
            )}
            </div>
          );
        })}
      </div>

      {/* Evidence Viewer Modal */}
      {selectedEvidence && (
        <EvidenceViewer
          evidence={selectedEvidence}
          onClose={() => setSelectedEvidence(null)}
        />
      )}
    </>
  );
};