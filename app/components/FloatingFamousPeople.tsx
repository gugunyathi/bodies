"use client";

import { useState } from "react";

type FamousPersonConnection = {
  name: string;
  image: string;
  relationship: string;
  duration?: string;
  notes?: string;
  famousLevel: number; // 1-10 scale for sorting
};

type FloatingFamousPeopleProps = {
  profileName: string;
  relationships: FamousPersonConnection[];
};

export function FloatingFamousPeople({ profileName, relationships }: FloatingFamousPeopleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<FamousPersonConnection | null>(null);

  // Sort relationships by fame level (highest first) and take top 3
  const topFamousRelationships = relationships
    .sort((a, b) => b.famousLevel - a.famousLevel)
    .slice(0, 3);

  const mostFamousPerson = topFamousRelationships[0];

  if (!mostFamousPerson) {
    return null;
  }

  return (
    <>
      {/* Floating Circle */}
      <div 
        className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400 shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 bg-white"
        onClick={() => setIsOpen(true)}
      >
        <img 
          src={mostFamousPerson.image} 
          alt={mostFamousPerson.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl my-4">
            {/* Header */}
            <div className="relative p-8 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 text-white rounded-t-3xl">
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white text-xl font-bold"
              >
                ×
              </button>
              
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl">
                  <img 
                    src={mostFamousPerson.image} 
                    alt={mostFamousPerson.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">{mostFamousPerson.name}</h2>
                  <p className="text-white/90 text-sm mt-1">
                    Most Famous Connection of {profileName}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* About */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Connection</h3>
                <p className="text-gray-700">
                  <strong>Relationship:</strong> {mostFamousPerson.relationship}
                </p>
                {mostFamousPerson.duration && (
                  <p className="text-gray-700 mt-1">
                    <strong>Duration:</strong> {mostFamousPerson.duration}
                  </p>
                )}
                {mostFamousPerson.notes && (
                  <p className="text-gray-600 mt-2 text-sm">{mostFamousPerson.notes}</p>
                )}
              </div>

              {/* Famous Connections Network */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Famous Connections</h3>
                <div className="relative bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-12 min-h-[300px] overflow-hidden">
                  {/* Central person circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-yellow-500 shadow-xl bg-white">
                      <img
                        src={mostFamousPerson.image}
                        alt={mostFamousPerson.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {topFamousRelationships.slice(1).map((_, index) => {
                      const angle = (index * 120) - 60; // Spread around the center
                      const radian = (angle * Math.PI) / 180;
                      const radius = 35;
                      const relationshipX = 50 + radius * Math.cos(radian);
                      const relationshipY = 50 + radius * Math.sin(radian);
                      
                      return (
                        <line
                          key={index}
                          x1="50"
                          y1="50"
                          x2={relationshipX}
                          y2={relationshipY}
                          stroke="#f59e0b"
                          strokeWidth="0.5"
                          strokeDasharray="2,2"
                          opacity="0.6"
                        />
                      );
                    })}
                  </svg>

                  {/* Relationship circles */}
                  {topFamousRelationships.slice(1).map((relationship, index) => {
                    const angle = (index * 120) - 60;
                    const radian = (angle * Math.PI) / 180;
                    const radius = 35;
                    const relationshipX = 50 + radius * Math.cos(radian);
                    const relationshipY = 50 + radius * Math.sin(radian);
                    
                    return (
                      <div
                        key={index}
                        className="absolute w-12 h-12 rounded-full overflow-hidden border-2 border-orange-400 shadow-lg cursor-pointer hover:scale-110 transition-all duration-200 bg-white"
                        style={{
                          left: `${relationshipX}%`,
                          top: `${relationshipY}%`,
                          transform: 'translate(-50%, -50%)'
                        }}
                        onClick={() => setSelectedRelationship(relationship)}
                      >
                        <img
                          src={relationship.image}
                          alt={relationship.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Relationship Details */}
              {selectedRelationship && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl p-4 border border-yellow-200">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-yellow-400">
                      <img
                        src={selectedRelationship.image}
                        alt={selectedRelationship.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{selectedRelationship.name}</h4>
                      <p className="text-sm text-gray-600">{selectedRelationship.relationship}</p>
                    </div>
                  </div>
                  {selectedRelationship.duration && (
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Duration:</strong> {selectedRelationship.duration}
                    </p>
                  )}
                  {selectedRelationship.notes && (
                    <p className="text-sm text-gray-600">{selectedRelationship.notes}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}