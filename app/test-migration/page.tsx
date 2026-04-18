"use client";

import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { dataPersistence } from '../../lib/data-persistence';
import { WalletButton } from '../components/WalletButton';
import { useAccount } from 'wagmi';

interface MigrationTestResult {
  success: boolean;
  profilesMigrated?: number;
  ratingsMigrated?: number;
  totalProfiles?: number;
  totalRatings?: number;
  error?: string;
}

export default function MigrationTestPage() {
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const { isConnected } = useAccount();
  const [migrationStatus, setMigrationStatus] = useState<{ completed: boolean; lastMigration?: string }>({ completed: false });
  const [localData, setLocalData] = useState<{
    profiles: any[];
    ratings: Record<string, any[]>;
    userSettings: Record<string, unknown>;
    privacySettings: Record<string, unknown>;
  }>({ profiles: [], ratings: {}, userSettings: {}, privacySettings: {} });
  const [migrationResult, setMigrationResult] = useState<MigrationTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [testDataCreated, setTestDataCreated] = useState(false);

  // Load migration status and local data on component mount
  useEffect(() => {
    loadMigrationStatus();
    loadLocalData();
  }, []);

  const loadMigrationStatus = () => {
    const status = dataPersistence.getMigrationStatus();
    setMigrationStatus(status);
  };

  const loadLocalData = () => {
    const profiles = dataPersistence.getLocalProfiles();
    const ratings = dataPersistence.getLocalRatings();
    const userSettings = dataPersistence.getLocalUserSettings();
    const privacySettings = dataPersistence.getLocalPrivacySettings();
    
    setLocalData({ profiles, ratings, userSettings, privacySettings });
  };

  // Create test data in local storage
  const createTestData = async () => {
    try {
      setIsLoading(true);
      
      // Create test profiles
      const testProfiles = [
        {
          userId: 'test-user-1',
          name: 'Alice Johnson',
          age: 25,
          bio: 'Love hiking and photography',
          images: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400'],
          socialHandles: { instagram: '@alice_j' },
          location: 'San Francisco, CA',
          isVerified: false,
          isActive: true
        },
        {
          userId: 'test-user-2', 
          name: 'Bob Smith',
          age: 28,
          bio: 'Software engineer and coffee enthusiast',
          images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
          socialHandles: { twitter: '@bobsmith' },
          location: 'New York, NY',
          isVerified: false,
          isActive: true
        }
      ];

      // Save test profiles to local storage
      for (const profile of testProfiles) {
        await dataPersistence.saveProfile(profile);
      }

      // Create test ratings
      const testRatings = [
        {
          profileId: 'test-profile-1',
          type: 'dated' as const,
          isAnonymous: false,
          evidence: []
        },
        {
          profileId: 'test-profile-2',
          type: 'hookup' as const,
          isAnonymous: true,
          evidence: []
        }
      ];

      // Save test ratings to local storage
      for (const rating of testRatings) {
        await dataPersistence.saveRating(rating);
      }

      setTestDataCreated(true);
      loadLocalData(); // Refresh local data display
    } catch (error) {
      console.error('Error creating test data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test migration functionality
  const testMigration = async () => {
    if (!walletAddress) {
      setMigrationResult({ success: false, error: 'No wallet address available' });
      return;
    }

    try {
      setIsLoading(true);
      setMigrationResult(null);
      
      const result = await dataPersistence.migrateLocalDataToDatabase(walletAddress);
      
      if (result.success) {
        setMigrationResult({
          success: true,
          profilesMigrated: (result.data as any)?.profilesMigrated || 0,
          ratingsMigrated: (result.data as any)?.ratingsMigrated || 0,
          totalProfiles: (result.data as any)?.totalProfiles || 0,
          totalRatings: (result.data as any)?.totalRatings || 0
        });
        loadMigrationStatus(); // Refresh migration status
      } else {
        setMigrationResult({ success: false, error: result.error || 'Migration failed' });
      }
    } catch (error) {
      setMigrationResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Migration error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Clear local data
  const clearLocalData = () => {
    dataPersistence.clearLocalData();
    setTestDataCreated(false);
    loadLocalData();
    loadMigrationStatus();
  };

  // Reset migration status
  const resetMigrationStatus = () => {
    dataPersistence.setMigrationStatus(false);
    loadMigrationStatus();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Data Migration Test</h1>
        
        {/* Wallet Connection Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
          <div className="flex items-center gap-4">
            <WalletButton />
            {isConnected
              ? <p className="text-green-600">✅ Wallet Connected: {walletAddress}</p>
              : <p className="text-red-600">❌ No wallet connected</p>
            }
          </div>
        </div>

        {/* Migration Status */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Status</h2>
          <div className="space-y-2">
            <p className="text-gray-700">
              Status: <span className={migrationStatus.completed ? 'text-green-600' : 'text-orange-600'}>
                {migrationStatus.completed ? '✅ Completed' : '⏳ Not Completed'}
              </span>
            </p>
            {migrationStatus.lastMigration && (
              <p className="text-gray-700">
                Last Migration: <span className="text-blue-600">{migrationStatus.lastMigration}</span>
              </p>
            )}
            <button
              onClick={resetMigrationStatus}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm"
            >
              Reset Migration Status
            </button>
          </div>
        </div>

        {/* Local Data Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Local Storage Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Profiles</h3>
              <p className="text-gray-600">Count: {localData.profiles.length}</p>
              {localData.profiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {localData.profiles.map((profile, index) => (
                    <div key={index} className="text-sm text-gray-500">
                      • {profile.name} (Age: {profile.age})
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Ratings</h3>
              <p className="text-gray-600">Total: {Object.values(localData.ratings).flat().length}</p>
              {Object.keys(localData.ratings).length > 0 && (
                <div className="mt-2 space-y-1">
                  {Object.entries(localData.ratings).map(([profileId, ratings]) => (
                    <div key={profileId} className="text-sm text-gray-500">
                      • {profileId}: {ratings.length} ratings
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 space-x-4">
            <button
              onClick={createTestData}
              disabled={isLoading || testDataCreated}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              {isLoading ? 'Creating...' : testDataCreated ? 'Test Data Created' : 'Create Test Data'}
            </button>
            <button
              onClick={clearLocalData}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Clear Local Data
            </button>
          </div>
        </div>

        {/* Migration Test */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Migration Test</h2>
          
          {!isConnected ? (
            <p className="text-yellow-600 mb-4">⚠️ Connect wallet to test migration</p>
          ) : (
            <div className="space-y-4">
              <button
                onClick={testMigration}
                disabled={isLoading || localData.profiles.length === 0}
                className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold"
              >
                {isLoading ? 'Migrating...' : 'Test Migration'}
              </button>
              
              {localData.profiles.length === 0 && (
                <p className="text-orange-600">⚠️ Create test data first to test migration</p>
              )}
            </div>
          )}
          
          {/* Migration Results */}
          {migrationResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              migrationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <h3 className={`font-semibold mb-2 ${
                migrationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {migrationResult.success ? '✅ Migration Successful' : '❌ Migration Failed'}
              </h3>
              
              {migrationResult.success ? (
                <div className="space-y-1 text-green-700">
                  <p>Profiles migrated: {migrationResult.profilesMigrated}/{migrationResult.totalProfiles}</p>
                  <p>Ratings migrated: {migrationResult.ratingsMigrated}/{migrationResult.totalRatings}</p>
                </div>
              ) : (
                <p className="text-red-700">Error: {migrationResult.error}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="text-center">
          <a
            href="/"
            className="inline-block bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg"
          >
            Back to Main App
          </a>
        </div>
      </div>
    </div>
  );
}