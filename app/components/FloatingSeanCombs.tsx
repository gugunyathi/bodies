"use client";

import { useState } from "react";

type RelationshipConnection = {
  name: string;
  image: string;
  relationship: string;
  duration?: string;
  notes?: string;
};

type SeanCombsProfile = {
  name: string;
  age: number;
  bio: string;
  image: string;
  location: string;
  socialHandles: {
    instagram?: string;
    twitter?: string;
  };
  relationships: RelationshipConnection[];
};

const seanCombsData: SeanCombsProfile = {
  name: 'Sean "Diddy" Combs',
  age: 54,
  bio: 'Music mogul, entrepreneur, and cultural icon. Known for his influence in hip-hop, fashion, and business ventures. Father of seven children.',
  image: '/Sean Combs.png',
  location: 'Los Angeles, CA / New York, NY',
  socialHandles: {
    instagram: '@diddy',
    twitter: '@Diddy'
  },
  relationships: [
    {
      name: 'Kim Porter',
      image: '/Kim Porter.png',
      relationship: 'Long-term partner',
      duration: '1994-2007 (on/off)',
      notes: 'Mother of three children (Christian, D\'Lila, Jessie). Relationship spanned many years with breaks.'
    },
    {
      name: 'Cassie Ventura',
      image: '/Cassie Ventura.png',
      relationship: 'Girlfriend',
      duration: '2007-2018',
      notes: 'On-and-off relationship for over a decade. Ended when Cassie began dating Alex Fine.'
    },
    {
      name: 'Jennifer Lopez',
      image: '/Jennifer Lopez.png',
      relationship: 'Girlfriend',
      duration: '1999-2001',
      notes: 'High-profile relationship that ended after nightclub incident and differing life goals.'
    },
    {
      name: 'Sarah Chapman',
      image: '/Sarah Chapman.png',
      relationship: 'Brief relationship',
      duration: '2006-2007',
      notes: 'Mother of daughter Chance. Brief relationship while he was still involved with Kim Porter.'
    },
    {
      name: 'Misa Hylton',
      image: '/Misa Hylton.png',
      relationship: 'High school sweetheart',
      duration: '1991-1995',
      notes: 'Mother of son Justin. Early relationship during start of his career.'
    },
    {
      name: 'Yung Miami',
      image: '/Yung Miami.png',
      relationship: 'Current partner',
      duration: '2022-present',
      notes: 'Confirmed relationship described as "non-traditional" and open.'
    },
    {
      name: 'Aubrey O\'Day',
      image: '/Aubrey O\'Day.png',
      relationship: 'Rumored relationship',
      duration: '2007-2009',
      notes: 'Met during Making the Band, rumors during Danity Kane era.'
    },
    {
      name: 'Sienna Miller',
      image: '/Sienna Miller.png',
      relationship: 'Brief link',
      duration: '2007',
      notes: 'Briefly linked after her split from Jude Law.'
    },
    {
      name: 'Emma Heming',
      image: '/Emma Heming.png',
      relationship: 'Rumored fling',
      duration: '2008',
      notes: 'Before she married Bruce Willis.'
    },
    {
      name: 'Gina Huynh',
      image: '/Gina Huynh.png',
      relationship: 'Frequent companion',
      duration: '2019-2022',
      notes: 'Frequently seen together over the years, including during Yung Miami relationship.'
    },
    {
      name: 'Joie Chavis',
      image: '/Joie Chavis.png',
      relationship: 'Rumored link',
      duration: '2021',
      notes: 'Previously dated Future and Bow Wow.'
    },
    {
      name: 'Miracle Watts',
      image: '/Miracle Watts.png',
      relationship: 'Brief connection',
      duration: '2020',
      notes: 'Later confirmed relationship with Tyler Lepley.'
    },
    {
      name: 'Lori Harvey',
      image: '/Lori Harvey.png',
      relationship: 'Rumored dating',
      duration: '2019',
      notes: 'Controversial due to previous links to his son Justin Combs and Future.'
    }
  ]
};

export function FloatingSeanCombs() {
  const [showProfile, setShowProfile] = useState(false);
  const [selectedRelationship, setSelectedRelationship] = useState<RelationshipConnection | null>(null);

  const handleCircleClick = () => {
    setShowProfile(true);
  };

  const closeModal = () => {
    setShowProfile(false);
    setSelectedRelationship(null);
  };

  const handleRelationshipClick = (relationship: RelationshipConnection) => {
    setSelectedRelationship(relationship);
  };

  return (
    <>
      {/* Floating Circle */}
      <div 
        className="cursor-pointer group"
        onClick={handleCircleClick}
        style={{
          animation: 'float 3s ease-in-out infinite'
        }}
      >
        <div className="relative">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-pink-400 shadow-2xl hover:scale-110 transition-transform duration-300 bg-gradient-to-br from-pink-400 to-purple-500">
            <img
              src={seanCombsData.image}
              alt={seanCombsData.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Pulsing ring effect */}
          <div className="absolute inset-0 rounded-full border-4 border-pink-400 opacity-75 animate-ping"></div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Click to view Sean "Diddy" Combs
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl my-4">
            {/* Header */}
            <div className="relative p-8 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-3xl">
              <button
                onClick={closeModal}
                className="absolute top-6 right-6 text-white hover:text-gray-200 text-2xl font-bold z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ×
              </button>
              
              <div className="flex items-center gap-4">
                <img
                  src={seanCombsData.image}
                  alt={seanCombsData.name}
                  className="w-20 h-20 rounded-full border-4 border-white shadow-lg"
                />
                <div>
                  <h2 className="text-3xl font-bold">{seanCombsData.name}</h2>
                  <p className="text-white/90">{seanCombsData.age} years old • {seanCombsData.location}</p>
                  <div className="flex gap-3 mt-2">
                    {seanCombsData.socialHandles?.instagram && (
                      <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                        {seanCombsData.socialHandles?.instagram}
                      </span>
                    )}
                    {seanCombsData.socialHandles?.twitter && (
                      <span className="text-sm bg-white/20 px-2 py-1 rounded-full">
                        {seanCombsData.socialHandles?.twitter}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Bio */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">About</h3>
                <p className="text-gray-700">{seanCombsData.bio}</p>
              </div>

              {/* Relationship Bubble Map */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Relationship Network</h3>
                <div className="relative bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-12 min-h-[450px] overflow-hidden">
                  {/* Central Sean Combs circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-purple-500 shadow-xl bg-white">
                      <img
                        src={seanCombsData.image}
                        alt={seanCombsData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-center mt-2">
                      <p className="font-bold text-sm text-gray-900">Sean Combs</p>
                    </div>
                  </div>

                  {/* Connection lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {seanCombsData.relationships.map((_, index) => {
                      const angle = (index * 360) / seanCombsData.relationships.length;
                      const radian = (angle * Math.PI) / 180;
                      // Center of the container (50% = center)
                      const centerX = 50;
                      const centerY = 50;
                      // Position of relationship circle (matching the actual circle positioning)
                      const radius = 35; // Adjusted for viewBox scale
                      const relationshipX = centerX + Math.cos(radian) * radius;
                      const relationshipY = centerY + Math.sin(radian) * radius;
                      
                      return (
                        <line
                          key={`connection-${index}`}
                          x1={centerX}
                          y1={centerY}
                          x2={relationshipX}
                          y2={relationshipY}
                          stroke="#ec4899"
                          strokeWidth="0.5"
                          opacity="0.7"
                          strokeDasharray="1,1"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>

                  {/* Relationship circles positioned around the center */}
                  {seanCombsData.relationships.map((relationship, index) => {
                    const angle = (index * 360) / seanCombsData.relationships.length;
                    const radius = 140;
                    const x = Math.cos((angle * Math.PI) / 180) * radius;
                    const y = Math.sin((angle * Math.PI) / 180) * radius;

                    return (
                      <div
                        key={index}
                        className="absolute cursor-pointer group"
                        style={{
                          left: `calc(50% + ${x}px - 30px)`,
                          top: `calc(50% + ${y}px - 30px)`,
                          animation: `float ${2 + (index * 0.3)}s ease-in-out infinite`,
                          animationDelay: `${index * 0.2}s`
                        }}
                        onClick={() => handleRelationshipClick(relationship)}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-pink-400 shadow-lg hover:scale-110 transition-transform duration-300 bg-white">
                          <img
                            src={relationship.image}
                            alt={relationship.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        

                        
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          {relationship.name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Relationship Details */}
              {selectedRelationship && (
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={selectedRelationship.image}
                      alt={selectedRelationship.name}
                      className="w-16 h-16 rounded-full border-2 border-pink-400"
                    />
                    <div>
                      <h4 className="text-xl font-bold text-gray-900">{selectedRelationship.name}</h4>
                      <p className="text-pink-600 font-medium">{selectedRelationship.relationship}</p>
                      {selectedRelationship.duration && (
                        <p className="text-gray-600 text-sm">{selectedRelationship.duration}</p>
                      )}
                    </div>
                  </div>
                  {selectedRelationship.notes && (
                    <p className="text-gray-700">{selectedRelationship.notes}</p>
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