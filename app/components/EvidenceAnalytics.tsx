'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface AnalyticsData {
  totalEvidence: number;
  typeDistribution: {
    image: number;
    video: number;
    link: number;
  };
  statusDistribution: {
    verified: number;
    pending: number;
    flagged: number;
    rejected: number;
  };
  verificationRate: number;
  uploadTrends: {
    date: string;
    count: number;
  }[];
  topUploaders: {
    uploaderId: string;
    count: number;
  }[];
  fileSizeStats: {
    average: number;
    total: number;
    largest: number;
  };
  moderationMetrics: {
    totalModerated: number;
    flaggedCount: number;
    rejectedCount: number;
    averageProcessingTime: number;
  };
}

interface EvidenceAnalyticsProps {
  dateFrom?: string;
  dateTo?: string;
  uploaderId?: string;
  ratingId?: string;
}

export const EvidenceAnalytics: React.FC<EvidenceAnalyticsProps> = ({
  dateFrom,
  dateTo,
  uploaderId,
  ratingId
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateFrom, dateTo, uploaderId, ratingId]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const params: {
        dateFrom?: string;
        dateTo?: string;
        uploaderId?: string;
        ratingId?: string;
      } = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (uploaderId) params.uploaderId = uploaderId;
      if (ratingId) params.ratingId = ratingId;
      
      const response = await apiClient.getEvidenceAnalytics(params);
      setAnalytics(response.data as AnalyticsData);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center text-red-600">
          <p className="text-lg font-semibold mb-2">Error Loading Analytics</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-center text-gray-500">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Evidence Analytics</h2>
      
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-600 mb-1">Total Evidence</h3>
          <p className="text-2xl font-bold text-blue-900">{analytics.totalEvidence}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-green-600 mb-1">Verification Rate</h3>
          <p className="text-2xl font-bold text-green-900">{analytics.verificationRate.toFixed(1)}%</p>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-purple-600 mb-1">Total File Size</h3>
          <p className="text-2xl font-bold text-purple-900">{formatFileSize(analytics.fileSizeStats.total)}</p>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-orange-600 mb-1">Moderated</h3>
          <p className="text-2xl font-bold text-orange-900">{analytics.moderationMetrics.totalModerated}</p>
        </div>
      </div>

      {/* Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Evidence Types</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                Images
              </span>
              <span className="font-medium">
                {analytics.typeDistribution.image} ({formatPercentage(analytics.typeDistribution.image, analytics.totalEvidence)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Videos
              </span>
              <span className="font-medium">
                {analytics.typeDistribution.video} ({formatPercentage(analytics.typeDistribution.video, analytics.totalEvidence)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                Links
              </span>
              <span className="font-medium">
                {analytics.typeDistribution.link} ({formatPercentage(analytics.typeDistribution.link, analytics.totalEvidence)})
              </span>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Verification Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                Verified
              </span>
              <span className="font-medium">
                {analytics.statusDistribution.verified} ({formatPercentage(analytics.statusDistribution.verified, analytics.totalEvidence)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                Pending
              </span>
              <span className="font-medium">
                {analytics.statusDistribution.pending} ({formatPercentage(analytics.statusDistribution.pending, analytics.totalEvidence)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                Flagged
              </span>
              <span className="font-medium">
                {analytics.statusDistribution.flagged} ({formatPercentage(analytics.statusDistribution.flagged, analytics.totalEvidence)})
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                Rejected
              </span>
              <span className="font-medium">
                {analytics.statusDistribution.rejected} ({formatPercentage(analytics.statusDistribution.rejected, analytics.totalEvidence)})
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* File Size Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">File Size Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Average Size:</span>
              <span className="font-medium">{formatFileSize(analytics.fileSizeStats.average)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Largest File:</span>
              <span className="font-medium">{formatFileSize(analytics.fileSizeStats.largest)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Storage:</span>
              <span className="font-medium">{formatFileSize(analytics.fileSizeStats.total)}</span>
            </div>
          </div>
        </div>

        {/* Moderation Metrics */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Moderation Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Total Moderated:</span>
              <span className="font-medium">{analytics.moderationMetrics.totalModerated}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Flagged Items:</span>
              <span className="font-medium">{analytics.moderationMetrics.flaggedCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Rejected Items:</span>
              <span className="font-medium">{analytics.moderationMetrics.rejectedCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Avg Processing Time:</span>
              <span className="font-medium">{analytics.moderationMetrics.averageProcessingTime.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Uploaders */}
      {analytics.topUploaders.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Top Uploaders</h3>
          <div className="space-y-2">
            {analytics.topUploaders.slice(0, 5).map((uploader, index) => (
              <div key={uploader.uploaderId} className="flex justify-between items-center">
                <span className="flex items-center">
                  <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </span>
                  User {uploader.uploaderId.slice(-8)}
                </span>
                <span className="font-medium">{uploader.count} uploads</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceAnalytics;