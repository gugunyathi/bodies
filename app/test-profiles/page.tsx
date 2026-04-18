"use client";

import { useState, useEffect } from 'react';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { apiClient } from '../../lib/api-client';
import { WalletButton } from '../components/WalletButton';
import { useAccount } from 'wagmi';
import { SimpleBodycountScore } from '../components/SimpleBodycountScore';

interface SystemProfile {
  name: string;
  age: number;
  bio: string;
  images: string[];
  location: string;
  socialHandles: {
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  bodycount: {
    confirmed: Array<{
      name: string;
      relationship: string;
      duration: string;
      notes?: string;
    }>;
    rumored: Array<{
      name: string;
      relationship: string;
      timeframe: string;
      notes?: string;
    }>;
    total: number;
  };
  isVerified: boolean;
  isActive: boolean;
}

export default function SystemProfilesPage() {
  const { userId, walletAddress, isAuthenticated } = useCurrentUser();
  const { isConnected } = useAccount();
  const [profiles, setProfiles] = useState<SystemProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SystemProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Sean "Diddy" Combs profile data
  const diddyProfile: SystemProfile = {
    name: 'Sean "Diddy" Combs',
    age: 54,
    bio: 'Music mogul, entrepreneur, and cultural icon. Known for his influence in hip-hop, fashion, and business ventures. Father of seven children.',
    images: [
      '/Sean Combs.png'
    ],
    location: 'Los Angeles, CA / New York, NY',
    socialHandles: {
      instagram: '@diddy',
      twitter: '@Diddy'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Porter',
          relationship: 'Long-term partner',
          duration: '1994-2007 (on/off)',
          notes: 'Mother of three children (Christian, D\'Lila, Jessie). Relationship spanned many years with breaks.'
        },
        {
          name: 'Cassie Ventura',
          relationship: 'Girlfriend',
          duration: '2007-2018',
          notes: 'On-and-off relationship for over a decade. Ended when Cassie began dating Alex Fine.'
        },
        {
          name: 'Jennifer Lopez',
          relationship: 'Girlfriend',
          duration: '1999-2001',
          notes: 'High-profile relationship that ended after nightclub incident and differing life goals.'
        },
        {
          name: 'Sarah Chapman',
          relationship: 'Brief relationship',
          duration: '2006-2007',
          notes: 'Mother of daughter Chance. Brief relationship while still involved with Kim Porter.'
        },
        {
          name: 'Misa Hylton-Brim',
          relationship: 'High school sweetheart',
          duration: '1991-1995',
          notes: 'Mother of son Justin. Early relationship during start of career.'
        },
        {
          name: 'Yung Miami (Caresha Brownlee)',
          relationship: 'Current partner',
          duration: '2022-present',
          notes: 'Confirmed relationship described as "non-traditional" and open.'
        }
      ],
      rumored: [
        {
          name: 'Cameron Diaz',
          relationship: 'Rumored dating',
          timeframe: '2008-2012',
          notes: 'Multiple sightings and reports, she was reportedly single during this period.'
        },
        {
          name: 'Sienna Miller',
          relationship: 'Brief link',
          timeframe: '2007',
          notes: 'Briefly linked after her split from Jude Law.'
        },
        {
          name: 'Emma Heming',
          relationship: 'Rumored fling',
          timeframe: '2008',
          notes: 'Before she married Bruce Willis.'
        },
        {
          name: 'Gina Huynh',
          relationship: 'Frequent companion',
          timeframe: '2019-2022',
          notes: 'Frequently seen together over the years, including during Yung Miami relationship.'
        },
        {
          name: 'Joie Chavis',
          relationship: 'Rumored link',
          timeframe: '2021',
          notes: 'Previously dated Future and Bow Wow.'
        },
        {
          name: 'Miracle Watts',
          relationship: 'Brief connection',
          timeframe: '2020',
          notes: 'Later confirmed relationship with Tyler Lepley.'
        },
        {
          name: 'Lori Harvey',
          relationship: 'Rumored dating',
          timeframe: '2019',
          notes: 'Controversial due to previous links to his son Justin Combs and Future.'
        },
        {
          name: 'Aubrey O\'Day',
          relationship: 'Rumored relationship',
          timeframe: '2007-2009',
          notes: 'Met during Making the Band, rumors during Danity Kane era.'
        }
      ],
      total: 14
    },
    isVerified: true,
    isActive: true
  };

  // Individual profiles for Sean Combs' relationships
  const kimPorterProfile: SystemProfile = {
    name: 'Kim Porter',
    age: 47, // Age at time of passing in 2018
    bio: 'Model, actress, and entrepreneur. Long-term partner of Sean Combs and mother to four children. Known for her work in fashion and entertainment industry.',
    images: ['/Kim Porter.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@ladykp'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Long-term partner',
          duration: '1994-2007 (on/off)',
          notes: 'Mother of three children together (Christian, D\'Lila, Jessie). Relationship spanned many years with breaks.'
        },
        {
          name: 'Al B. Sure!',
          relationship: 'Relationship',
          duration: '1989-1990',
          notes: 'Mother of son Quincy Brown. Early relationship before Sean Combs.'
        }
      ],
      rumored: [],
      total: 2
    },
    isVerified: true,
    isActive: false // Passed away in 2018
  };

  const cassieVenturaProfile: SystemProfile = {
    name: 'Cassie Ventura',
    age: 38,
    bio: 'Singer, model, and actress. Known for hit single "Me & U" and long-term relationship with Sean Combs. Now married to Alex Fine.',
    images: ['/Cassie Ventura.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@cassie',
      twitter: '@cassieventura'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Girlfriend',
          duration: '2007-2018',
          notes: 'On-and-off relationship for over a decade. Ended when she began dating Alex Fine.'
        },
        {
          name: 'Alex Fine',
          relationship: 'Husband',
          duration: '2018-present',
          notes: 'Married in 2019, have two children together.'
        }
      ],
      rumored: [],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const jenniferLopezProfile: SystemProfile = {
    name: 'Jennifer Lopez',
    age: 55,
    bio: 'Multi-talented entertainer, singer, actress, and businesswoman. Global superstar known for music, films, and fashion ventures.',
    images: ['/Jennifer Lopez.png'],
    location: 'Los Angeles, CA / New York, NY',
    socialHandles: {
      instagram: '@jlo',
      twitter: '@JLo'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Girlfriend',
          duration: '1999-2001',
          notes: 'High-profile relationship that ended after nightclub incident and differing life goals.'
        },
        {
          name: 'Ojani Noa',
          relationship: 'Husband',
          duration: '1997-1998',
          notes: 'First marriage, brief relationship.'
        },
        {
          name: 'Cris Judd',
          relationship: 'Husband',
          duration: '2001-2003',
          notes: 'Second marriage, met on music video set.'
        },
        {
          name: 'Ben Affleck',
          relationship: 'Fiancé',
          duration: '2002-2004, 2021-2024',
          notes: 'High-profile engagement, rekindled romance years later.'
        },
        {
          name: 'Marc Anthony',
          relationship: 'Husband',
          duration: '2004-2014',
          notes: 'Third marriage, two children together (twins Max and Emme).'
        },
        {
          name: 'Casper Smart',
          relationship: 'Boyfriend',
          duration: '2011-2016',
          notes: 'On-and-off relationship with backup dancer.'
        },
        {
          name: 'Alex Rodriguez',
          relationship: 'Fiancé',
          duration: '2017-2021',
          notes: 'Engaged, high-profile relationship that ended before marriage.'
        }
      ],
      rumored: [
        {
          name: 'Drake',
          relationship: 'Rumored dating',
          timeframe: '2016',
          notes: 'Brief rumored connection.'
        }
      ],
      total: 8
    },
    isVerified: true,
    isActive: true
  };

  const sarahChapmanProfile: SystemProfile = {
    name: 'Sarah Chapman',
    age: 44,
    bio: 'Entrepreneur and mother. Known for brief relationship with Sean Combs and mother to daughter Chance Combs.',
    images: ['/Sarah Chapman.png'],
    location: 'Atlanta, GA',
    socialHandles: {
      instagram: '@sarahchapman'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Brief relationship',
          duration: '2006-2007',
          notes: 'Mother of daughter Chance. Brief relationship while he was still involved with Kim Porter.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const misaHyltonProfile: SystemProfile = {
    name: 'Misa Hylton-Brim',
    age: 50,
    bio: 'Fashion stylist and designer. Pioneer in hip-hop fashion and mother to Justin Combs. Known for styling major artists in the 90s.',
    images: ['/Misa Hylton.png'],
    location: 'New York, NY',
    socialHandles: {
      instagram: '@misahylton',
      twitter: '@MisaHylton'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'High school sweetheart',
          duration: '1991-1995',
          notes: 'Mother of son Justin. Early relationship during start of his career.'
        },
        {
          name: 'JoJo Brim',
          relationship: 'Husband',
          duration: '1995-2000s',
          notes: 'Married after relationship with Sean Combs ended.'
        }
      ],
      rumored: [],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const yungMiamiProfile: SystemProfile = {
    name: 'Yung Miami (Caresha Brownlee)',
    age: 30,
    bio: 'Rapper and member of City Girls. Known for hit songs and current relationship with Sean Combs. Mother of two children.',
    images: ['/Yung Miami.png'],
    location: 'Miami, FL',
    socialHandles: {
      instagram: '@yungmiami305',
      twitter: '@YungMiami305'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Current partner',
          duration: '2022-present',
          notes: 'Confirmed relationship described as "non-traditional" and open.'
        },
        {
          name: 'Jai Wiggins',
          relationship: 'Ex-boyfriend',
          duration: '2015-2020',
          notes: 'Father of son Jai Jr. On-and-off relationship.'
        },
        {
          name: 'Southside',
          relationship: 'Ex-boyfriend',
          duration: '2018-2020',
          notes: 'Producer, father of daughter Summer.'
        }
      ],
      rumored: [],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  // Rumored relationships profiles
  const cameronDiazProfile: SystemProfile = {
    name: 'Cameron Diaz',
    age: 52,
    bio: 'Actress and former model. Known for roles in "There\'s Something About Mary," "Charlie\'s Angels," and "Shrek." Retired from acting in 2014.',
    images: ['/Cameron Diaz.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@camerondiaz'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Justin Timberlake',
          relationship: 'Boyfriend',
          duration: '2003-2007',
          notes: 'High-profile relationship, attended many events together.'
        },
        {
          name: 'Benji Madden',
          relationship: 'Husband',
          duration: '2014-present',
          notes: 'Married in 2015, have two children together.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Rumored dating',
          timeframe: '2008-2012',
          notes: 'Multiple sightings and reports, she was reportedly single during this period.'
        },
        {
          name: 'Matt Dillon',
          relationship: 'Rumored dating',
          timeframe: '1995-1998',
          notes: 'Early career rumored relationship.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const siennaMillerProfile: SystemProfile = {
    name: 'Sienna Miller',
    age: 42,
    bio: 'British actress and fashion icon. Known for films like "Layer Cake" and "American Sniper." Fashion trendsetter in the 2000s.',
    images: ['/Sienna Miller.png'],
    location: 'London, UK / New York, NY',
    socialHandles: {
      instagram: '@siennamiller'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Jude Law',
          relationship: 'Fiancé',
          duration: '2003-2006, 2009-2011',
          notes: 'High-profile engagement, broke up due to his infidelity, briefly rekindled.'
        },
        {
          name: 'Rhys Ifans',
          relationship: 'Boyfriend',
          duration: '2007-2008',
          notes: 'Relationship after Jude Law split.'
        },
        {
          name: 'Tom Sturridge',
          relationship: 'Partner',
          duration: '2011-2015',
          notes: 'Had daughter Marlowe together.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Brief link',
          timeframe: '2007',
          notes: 'Briefly linked after her split from Jude Law.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const emmaHemingProfile: SystemProfile = {
    name: 'Emma Heming',
    age: 46,
    bio: 'Model and actress. Known for modeling work and marriage to Bruce Willis. Mother of two daughters.',
    images: ['/Emma Heming.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@emmahemingwillis'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Bruce Willis',
          relationship: 'Husband',
          duration: '2009-present',
          notes: 'Married in 2009, have two daughters together. Supporting him through his health challenges.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Rumored fling',
          timeframe: '2008',
          notes: 'Before she married Bruce Willis.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const ginaHuynhProfile: SystemProfile = {
    name: 'Gina Huynh',
    age: 32,
    bio: 'Model and social media influencer. Known for her fashion content and rumored relationships with high-profile figures.',
    images: ['/Gina Huynh.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@ginahuynh'
    },
    bodycount: {
      confirmed: [],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Frequent companion',
          timeframe: '2019-2022',
          notes: 'Frequently seen together over the years, including during Yung Miami relationship.'
        },
        {
          name: 'Chris Brown',
          relationship: 'Rumored dating',
          timeframe: '2020',
          notes: 'Brief rumored connection.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const joieChavisProfile: SystemProfile = {
    name: 'Joie Chavis',
    age: 36,
    bio: 'Model, entrepreneur, and fitness enthusiast. Mother of children with Future and Bow Wow. Known for her fitness brand.',
    images: ['/Joie Chavis.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@joiechavis'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Bow Wow',
          relationship: 'Ex-boyfriend',
          duration: '2010-2013',
          notes: 'Mother of daughter Shai together.'
        },
        {
          name: 'Future',
          relationship: 'Ex-boyfriend',
          duration: '2017-2018',
          notes: 'Mother of son Hendrix together.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Rumored link',
          timeframe: '2021',
          notes: 'Previously dated Future and Bow Wow.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const miracleWattsProfile: SystemProfile = {
    name: 'Miracle Watts',
    age: 30,
    bio: 'Model, entrepreneur, and social media influencer. Known for her beauty brand and high-profile relationships.',
    images: ['/Miracle Watts.png'],
    location: 'Houston, TX / Los Angeles, CA',
    socialHandles: {
      instagram: '@miraclewatts00'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Tyler Lepley',
          relationship: 'Boyfriend',
          duration: '2021-present',
          notes: 'Actor known for "The Haves and Have Nots." Have children together.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Brief connection',
          timeframe: '2020',
          notes: 'Later confirmed relationship with Tyler Lepley.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const loriHarveyProfile: SystemProfile = {
    name: 'Lori Harvey',
    age: 28,
    bio: 'Model and social media influencer. Stepdaughter of Steve Harvey. Known for high-profile relationships and fashion influence.',
    images: ['/Lori Harvey.png'],
    location: 'Los Angeles, CA / Atlanta, GA',
    socialHandles: {
      instagram: '@loriharvey'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Michael B. Jordan',
          relationship: 'Boyfriend',
          duration: '2020-2022',
          notes: 'High-profile relationship, very public on social media.'
        },
        {
          name: 'Future',
          relationship: 'Ex-boyfriend',
          duration: '2019-2020',
          notes: 'Brief but highly publicized relationship.'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Rumored dating',
          timeframe: '2019',
          notes: 'Controversial due to previous links to his son Justin Combs and Future.'
        },
        {
          name: 'Justin Combs',
          relationship: 'Rumored dating',
          timeframe: '2018',
          notes: 'Sean Combs\' son, brief rumored connection.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const aubreyODayProfile: SystemProfile = {
    name: 'Aubrey O\'Day',
    age: 40,
    bio: 'Singer, actress, and reality TV personality. Former member of Danity Kane. Known for her time on "Making the Band."',
    images: ["/Aubrey O'Day.png"],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@aubreyoday',
      twitter: '@AubreyODay'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Pauly D',
          relationship: 'Ex-boyfriend',
          duration: '2015-2017',
          notes: 'Reality TV relationship, appeared on "Famously Single."'
        }
      ],
      rumored: [
        {
          name: 'Sean "Diddy" Combs',
          relationship: 'Rumored relationship',
          timeframe: '2007-2009',
          notes: 'Met during Making the Band, rumors during Danity Kane era.'
        },
        {
          name: 'Donald Trump Jr.',
          relationship: 'Rumored affair',
          timeframe: '2011-2012',
          notes: 'Alleged affair while he was married.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  // Elon Musk profile data
  const elonMuskProfile: SystemProfile = {
    name: 'Elon Musk',
    age: 52,
    bio: 'Entrepreneur, business magnate, and investor. CEO of Tesla and SpaceX, owner of X (formerly Twitter). Known for revolutionary work in electric vehicles, space exploration, and social media.',
    images: ['/Elon Musk.png'],
    location: 'Austin, TX / Los Angeles, CA',
    socialHandles: {
      twitter: '@elonmusk'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Justine Wilson',
          relationship: 'Ex-wife',
          duration: '2000-2008',
          notes: 'First marriage, mother of five sons (including twins and triplets). Divorced in 2008.'
        },
        {
          name: 'Talulah Riley',
          relationship: 'Ex-wife',
          duration: '2010-2012, 2013-2016',
          notes: 'Married twice to the same person. British actress known for "Pride and Prejudice" and "Westworld."'
        },
        {
          name: 'Grimes (Claire Boucher)',
          relationship: 'Ex-girlfriend',
          duration: '2018-2021',
          notes: 'Canadian musician, mother of two children with Elon (X Æ A-XII and Exa Dark Sideræl).'
        },
        {
          name: 'Shivon Zilis',
          relationship: 'Relationship',
          duration: '2021-2022',
          notes: 'Neuralink executive, mother of twins with Elon born in November 2021.'
        },
        {
          name: 'Ashley St. Clair',
          relationship: 'Brief relationship',
          duration: '2022',
          notes: 'Conservative commentator and social media personality.'
        },
        {
          name: 'Natasha Bassett',
          relationship: 'Girlfriend',
          duration: '2022',
          notes: 'Australian actress known for "Elvis" biopic.'
        },
        {
          name: 'Jennifer Gwynne',
          relationship: 'College girlfriend',
          duration: '1994-1995',
          notes: 'University of Pennsylvania girlfriend, sold photos and memorabilia at auction.'
        },
        {
          name: 'Amber Heard',
          relationship: 'Ex-girlfriend',
          duration: '2016-2017',
          notes: 'Actress, dated during her divorce proceedings from Johnny Depp.'
        }
      ],
      rumored: [
        {
          name: 'Cameron Diaz',
          relationship: 'Rumored dating',
          timeframe: '2013',
          notes: 'Brief rumored connection during his divorce from Talulah Riley.'
        },
        {
          name: 'Cara Delevingne',
          relationship: 'Rumored link',
          timeframe: '2016',
          notes: 'Model and actress, rumored brief connection.'
        },
        {
          name: 'Rihanna',
          relationship: 'Rumored interest',
          timeframe: '2017',
          notes: 'Speculation after social media interactions.'
        }
      ],
      total: 12
    },
    isVerified: true,
    isActive: true
  };

  // Individual profiles for Elon Musk's confirmed relationships
  const justineWilsonProfile: SystemProfile = {
    name: 'Justine Wilson',
    age: 51,
    bio: 'Canadian author and ex-wife of Elon Musk. Known for her novels and writing about their relationship. Mother of five sons.',
    images: ['/Justine Wilson.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      twitter: '@justinemusk'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Ex-husband',
          duration: '2000-2008',
          notes: 'First marriage, mother of five sons (including twins and triplets). Divorced in 2008.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const talulahRileyProfile: SystemProfile = {
    name: 'Talulah Riley',
    age: 39,
    bio: 'British actress known for "Pride and Prejudice," "Westworld," and "Inception." Ex-wife of Elon Musk (married twice).',
    images: ['/Talulah Riley.png'],
    location: 'London, UK / Los Angeles, CA',
    socialHandles: {
      twitter: '@talulahriley',
      instagram: '@talulahriley'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Ex-husband',
          duration: '2010-2012, 2013-2016',
          notes: 'Married twice to the same person. British actress known for "Pride and Prejudice" and "Westworld."'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const grimesProfile: SystemProfile = {
    name: 'Grimes (Claire Boucher)',
    age: 36,
    bio: 'Canadian musician, singer, and producer. Known for experimental pop music and relationship with Elon Musk. Mother of two children.',
    images: ['/Grimes.png'],
    location: 'Los Angeles, CA / Austin, TX',
    socialHandles: {
      twitter: '@Grimezsz',
      instagram: '@grimes'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Ex-boyfriend',
          duration: '2018-2021',
          notes: 'Canadian musician, mother of two children with Elon (X Æ A-XII and Exa Dark Sideræl).'
        }
      ],
      rumored: [
        {
          name: 'Chelsea Manning',
          relationship: 'Rumored dating',
          timeframe: '2022',
          notes: 'Brief rumored connection after Elon split.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const shivonZilisProfile: SystemProfile = {
    name: 'Shivon Zilis',
    age: 38,
    bio: 'Executive at Neuralink and former venture capitalist. Known for her work in AI and technology. Mother of twins with Elon Musk.',
    images: ['/Shivon Zilis.png'],
    location: 'Austin, TX',
    socialHandles: {
      twitter: '@shivon'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Relationship',
          duration: '2021-2022',
          notes: 'Neuralink executive, mother of twins with Elon born in November 2021.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const ashleyStClairProfile: SystemProfile = {
    name: 'Ashley St. Clair',
    age: 30,
    bio: 'Conservative commentator, social media personality, and political activist. Known for her commentary on current events.',
    images: ['/Ashley St. Clair.png'],
    location: 'Austin, TX',
    socialHandles: {
      twitter: '@stclairashley',
      instagram: '@ashleystclair'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Brief relationship',
          duration: '2022',
          notes: 'Conservative commentator and social media personality.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const natashaBassettProfile: SystemProfile = {
    name: 'Natasha Bassett',
    age: 31,
    bio: 'Australian actress known for her role as Dixie Locke in "Elvis" and various TV shows. Rising star in Hollywood.',
    images: ['/Natasha Bassett.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@natashabassett'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'Ex-girlfriend',
          duration: '2022',
          notes: 'Australian actress known for "Elvis" biopic.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const jenniferGwynneProfile: SystemProfile = {
    name: 'Jennifer Gwynne',
    age: 52,
    bio: 'Former University of Pennsylvania student and Elon Musk\'s college girlfriend. Later became known for auctioning memorabilia from their relationship.',
    images: ['/Jennifer Gwynne.png'],
    location: 'South Carolina, USA',
    socialHandles: {},
    bodycount: {
      confirmed: [
        {
          name: 'Elon Musk',
          relationship: 'College girlfriend',
          duration: '1994-1995',
          notes: 'University of Pennsylvania girlfriend, sold photos and memorabilia at auction.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const amberHeardProfile: SystemProfile = {
    name: 'Amber Heard',
    age: 38,
    bio: 'American actress known for "Aquaman," "The Rum Diary," and high-profile legal battles. Former wife of Johnny Depp.',
    images: ['/Amber Heard.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@amberheard'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Johnny Depp',
          relationship: 'Ex-husband',
          duration: '2015-2017',
          notes: 'High-profile marriage that ended in controversial divorce and legal battles.'
        },
        {
          name: 'Elon Musk',
          relationship: 'Ex-boyfriend',
          duration: '2016-2017',
          notes: 'Actress, dated during her divorce proceedings from Johnny Depp.'
        }
      ],
      rumored: [
        {
          name: 'James Franco',
          relationship: 'Rumored affair',
          timeframe: '2016',
          notes: 'Alleged affair during marriage to Johnny Depp.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  // Rumored relationship profiles for Elon Musk
  const caraDelevingneProfile: SystemProfile = {
    name: 'Cara Delevingne',
    age: 31,
    bio: 'British model, actress, and singer. Known for her work with major fashion brands and films like "Suicide Squad" and "Valerian."',
    images: ['/Cara Delevingne.png'],
    location: 'London, UK / Los Angeles, CA',
    socialHandles: {
      instagram: '@caradelevingne',
      twitter: '@Caradelevingne'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Ashley Benson',
          relationship: 'Ex-girlfriend',
          duration: '2018-2020',
          notes: 'Actress from "Pretty Little Liars," confirmed relationship.'
        }
      ],
      rumored: [
        {
          name: 'Elon Musk',
          relationship: 'Rumored link',
          timeframe: '2016',
          notes: 'Model and actress, rumored brief connection.'
        },
        {
          name: 'Rihanna',
          relationship: 'Rumored dating',
          timeframe: '2013',
          notes: 'Brief rumored connection.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const rihannaProfile: SystemProfile = {
    name: 'Rihanna',
    age: 36,
    bio: 'Barbadian singer, actress, and businesswoman. Global superstar known for hits like "Umbrella" and "Diamonds." Founder of Fenty Beauty.',
    images: ['/Rihanna.png'],
    location: 'Los Angeles, CA / Barbados',
    socialHandles: {
      instagram: '@badgalriri',
      twitter: '@rihanna'
    },
    bodycount: {
      confirmed: [
        {
          name: 'A$AP Rocky',
          relationship: 'Partner',
          duration: '2020-present',
          notes: 'Father of two children, confirmed relationship and family.'
        },
        {
          name: 'Chris Brown',
          relationship: 'Ex-boyfriend',
          duration: '2007-2009, 2012-2013',
          notes: 'High-profile relationship that ended due to domestic violence incident.'
        },
        {
          name: 'Drake',
          relationship: 'Ex-boyfriend',
          duration: '2009-2016 (on/off)',
          notes: 'Long on-and-off relationship, publicly declared love at VMAs.'
        }
      ],
      rumored: [
        {
          name: 'Elon Musk',
          relationship: 'Rumored interest',
          timeframe: '2017',
          notes: 'Speculation after social media interactions.'
        },
        {
          name: 'Leonardo DiCaprio',
          relationship: 'Rumored dating',
          timeframe: '2015',
          notes: 'Brief rumored connection.'
        }
      ],
      total: 5
    },
    isVerified: true,
    isActive: true
  };

  // Individual profiles for Kim Kardashian's confirmed relationships
  const damonThomasProfile: SystemProfile = {
    name: 'Damon Thomas',
    age: 54,
    bio: 'Music producer and songwriter. Known for producing hits for artists like Pink, Dru Hill, and Lionel Richie. First husband of Kim Kardashian.',
    images: ['/Damon Thomas.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@damonthomas'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Marriage',
          duration: '2000-2004',
          notes: 'First marriage for both. Divorced due to alleged control issues and incompatibility.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const rayJProfile: SystemProfile = {
    name: 'Ray J',
    age: 43,
    bio: 'Singer, actor, and entrepreneur. Known for hit single "One Wish" and reality TV appearances. Brother of singer Brandy.',
    images: ['/Ray J.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@rayj',
      twitter: '@rayj'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Boyfriend',
          duration: '2003-2006',
          notes: 'High-profile on-and-off relationship that included infamous tape.'
        },
        {
          name: 'Whitney Houston',
          relationship: 'Rumored relationship',
          duration: '2007-2012',
          notes: 'Close friendship with romantic rumors before her passing.'
        }
      ],
      rumored: [
        {
          name: 'Teairra Mari',
          relationship: 'Rumored dating',
          timeframe: '2005-2006',
          notes: 'Rumored relationship during music collaboration.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const nickCannonProfile: SystemProfile = {
    name: 'Nick Cannon',
    age: 44,
    bio: 'TV host, comedian, and entrepreneur. Known for hosting Wild N Out and The Masked Singer. Father of 12 children with multiple women.',
    images: ['/Nick Cannon.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@nickcannon',
      twitter: '@NickCannon'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Brief dating',
          duration: '2006',
          notes: 'Short-lived relationship before his marriage to Mariah Carey.'
        },
        {
          name: 'Mariah Carey',
          relationship: 'Marriage',
          duration: '2008-2016',
          notes: 'Marriage with twins Moroccan and Monroe. Divorced amicably.'
        },
        {
          name: 'Brittany Bell',
          relationship: 'Relationship',
          duration: '2015-2020',
          notes: 'Mother of three children: Golden, Powerful Queen, Rise.'
        },
        {
          name: 'Abby De La Rosa',
          relationship: 'Relationship',
          duration: '2020-2021',
          notes: 'Mother of twins Zion and Zillion, and daughter Beautiful.'
        }
      ],
      rumored: [],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const reggieBushProfile: SystemProfile = {
    name: 'Reggie Bush',
    age: 39,
    bio: 'Former NFL running back and Heisman Trophy winner. Played for multiple teams including New Orleans Saints and Miami Dolphins.',
    images: ['/Reggie Bush.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@reggiebush',
      twitter: '@ReggieBush'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Boyfriend',
          duration: '2007-2010',
          notes: 'Serious long-term relationship. Ended due to career pressures and distance.'
        },
        {
          name: 'Lilit Avagyan',
          relationship: 'Marriage',
          duration: '2014-present',
          notes: 'Married with three children. Happy long-term marriage.'
        }
      ],
      rumored: [
        {
          name: 'Jessie James',
          relationship: 'Rumored dating',
          timeframe: '2010-2011',
          notes: 'Brief rumored connection after Kim Kardashian breakup.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const milesAustinProfile: SystemProfile = {
    name: 'Miles Austin',
    age: 40,
    bio: 'Former NFL wide receiver. Played primarily for Dallas Cowboys and Cleveland Browns. Known for his speed and route-running ability.',
    images: ['/Miles Austin.png'],
    location: 'Dallas, TX',
    socialHandles: {
      instagram: '@milesaustin19'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Brief dating',
          duration: '2010',
          notes: 'Short relationship with reality star during NFL career.'
        }
      ],
      rumored: [],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const krisHumphriesProfile: SystemProfile = {
    name: 'Kris Humphries',
    age: 39,
    bio: 'Former NBA power forward. Played for multiple teams including New Jersey Nets and Boston Celtics. Known for brief marriage to Kim Kardashian.',
    images: ['/Kris Humphries.png'],
    location: 'Minneapolis, MN',
    socialHandles: {
      instagram: '@krishumphries',
      twitter: '@KrisHumphries'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Marriage',
          duration: '2011',
          notes: 'Highly publicized 72-day marriage. Divorced citing irreconcilable differences.'
        }
      ],
      rumored: [
        {
          name: 'Myla Sinanaj',
          relationship: 'Rumored dating',
          timeframe: '2012',
          notes: 'Brief rumored relationship after Kim Kardashian divorce.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const kanyeWestProfile: SystemProfile = {
    name: 'Kanye West',
    age: 47,
    bio: 'Rapper, producer, and fashion designer. Multiple Grammy winner and founder of Yeezy brand. Father of four children with Kim Kardashian.',
    images: ['/Kanye West.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@ye',
      twitter: '@kanyewest'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Marriage',
          duration: '2012-2022',
          notes: 'Longest relationship, married with four children (North, Saint, Chicago, Psalm). Divorced due to his mental health issues and erratic behavior.'
        },
        {
          name: 'Amber Rose',
          relationship: 'Girlfriend',
          duration: '2008-2010',
          notes: 'High-profile relationship before Kim. Ended due to his interest in Kim Kardashian.'
        },
        {
          name: 'Bianca Censori',
          relationship: 'Marriage',
          duration: '2022-present',
          notes: 'Current wife, Yeezy architect. Married shortly after Kim Kardashian divorce.'
        }
      ],
      rumored: [
        {
          name: 'Alexis Phifer',
          relationship: 'Former fiancée',
          timeframe: '2002-2008',
          notes: 'Long-term relationship and engagement before fame.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const peteDavidsonProfile: SystemProfile = {
    name: 'Pete Davidson',
    age: 31,
    bio: 'Comedian and actor. Known for Saturday Night Live and various comedy specials. Famous for high-profile relationships.',
    images: ['/Pete Davidson.png'],
    location: 'New York, NY',
    socialHandles: {
      instagram: '@petedavidson',
      twitter: '@petedavidson'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Boyfriend',
          duration: '2021-2022',
          notes: 'High-profile relationship post-Kanye divorce. Ended due to long distance and different life stages.'
        },
        {
          name: 'Ariana Grande',
          relationship: 'Fiancé',
          duration: '2018',
          notes: 'Whirlwind engagement that ended after a few months.'
        },
        {
          name: 'Cazzie David',
          relationship: 'Girlfriend',
          duration: '2016-2018',
          notes: 'Long-term relationship with Larry David\'s daughter.'
        },
        {
          name: 'Phoebe Dynevor',
          relationship: 'Girlfriend',
          duration: '2021',
          notes: 'Brief relationship with Bridgerton actress.'
        }
      ],
      rumored: [
        {
          name: 'Kate Beckinsale',
          relationship: 'Rumored dating',
          timeframe: '2019',
          notes: 'Brief rumored connection despite age difference.'
        }
      ],
      total: 5
    },
    isVerified: true,
    isActive: true
  };

  const odellBeckhamJrProfile: SystemProfile = {
    name: 'Odell Beckham Jr.',
    age: 32,
    bio: 'NFL wide receiver. Known for spectacular catches and fashion sense. Played for New York Giants, Cleveland Browns, and Los Angeles Rams.',
    images: ['/Odell Beckham Jr.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@obj',
      twitter: '@obj'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Dating',
          duration: '2023-2024',
          notes: 'Recent relationship confirmed through multiple public appearances.'
        },
        {
          name: 'Lauren Wood',
          relationship: 'Girlfriend',
          duration: '2019-2023',
          notes: 'Long-term relationship, mother of his son Zydn.'
        }
      ],
      rumored: [
        {
          name: 'Khloe Kardashian',
          relationship: 'Rumored link',
          timeframe: '2016',
          notes: 'Brief rumored connection before Kim.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const theGameProfile: SystemProfile = {
    name: 'The Game',
    age: 45,
    bio: 'Rapper and actor. Known for albums like "The Documentary" and "Doctor\'s Advocate". Member of G-Unit before feud with 50 Cent.',
    images: ['/The Game.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@losangelesconfidential',
      twitter: '@thegame'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Kim Kardashian',
          relationship: 'Brief relationship',
          duration: '2006',
          notes: 'Short-lived relationship during early career.'
        },
        {
          name: 'Tiffney Cambridge',
          relationship: 'Long-term girlfriend',
          duration: '2006-2014',
          notes: 'Mother of two children, featured on VH1 reality show.'
        }
      ],
      rumored: [
        {
          name: 'Khloé Kardashian',
          relationship: 'Rumored link',
          timeframe: '2014',
          notes: 'Brief rumored connection after Tiffney breakup.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  // Individual profiles for Kim Kardashian's rumored relationships
  const nickLacheyProfile: SystemProfile = {
    name: 'Nick Lachey',
    age: 51,
    bio: 'Singer and TV personality. Former member of 98 Degrees and ex-husband of Jessica Simpson. Currently married to Vanessa Lachey.',
    images: ['/Nick Lachey.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@nicklachey',
      twitter: '@NickSLachey'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Jessica Simpson',
          relationship: 'Marriage',
          duration: '2002-2006',
          notes: 'High-profile marriage featured on reality TV show "Newlyweds".'
        },
        {
          name: 'Vanessa Lachey',
          relationship: 'Marriage',
          duration: '2011-present',
          notes: 'Current wife, married with three children. Happy long-term marriage.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored dating',
          timeframe: '2006',
          notes: 'Briefly linked after his divorce from Jessica Simpson.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const gabrielAubryProfile: SystemProfile = {
    name: 'Gabriel Aubry',
    age: 48,
    bio: 'Canadian model and actor. Known for high-profile relationship with Halle Berry and subsequent custody battle.',
    images: ['/Gabriel Aubry.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@gabrielaubry'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Halle Berry',
          relationship: 'Long-term relationship',
          duration: '2005-2010',
          notes: 'Father of daughter Nahla. Lengthy custody battle after breakup.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored link',
          timeframe: '2010',
          notes: 'Rumored connection during his custody battle with Halle Berry.'
        },
        {
          name: 'Charlize Theron',
          relationship: 'Rumored dating',
          timeframe: '2014',
          notes: 'Brief rumored connection with actress.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const michaelCoponProfile: SystemProfile = {
    name: 'Michael Copon',
    age: 42,
    bio: 'Actor and model. Known for roles in "Power Rangers Time Force" and "One Tree Hill". Also worked as a fitness model.',
    images: ['/Michael Copon.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@michaelcopon'
    },
    bodycount: {
      confirmed: [],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored dating',
          timeframe: '2004',
          notes: 'Briefly linked to actor/model during early reality TV days.'
        }
      ],
      total: 1
    },
    isVerified: true,
    isActive: true
  };

  const cristianoRonaldoProfile: SystemProfile = {
    name: 'Cristiano Ronaldo',
    age: 40,
    bio: 'Portuguese footballer and global icon. Considered one of the greatest players of all time. Father of five children.',
    images: ['/Cristiano Ronaldo.png'],
    location: 'Riyadh, Saudi Arabia',
    socialHandles: {
      instagram: '@cristiano',
      twitter: '@Cristiano'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Georgina Rodriguez',
          relationship: 'Long-term partner',
          duration: '2016-present',
          notes: 'Current partner, mother of two children together.'
        },
        {
          name: 'Irina Shayk',
          relationship: 'Girlfriend',
          duration: '2010-2015',
          notes: 'High-profile relationship with supermodel.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored encounter',
          timeframe: '2010',
          notes: 'Alleged brief encounter during his Real Madrid days.'
        },
        {
          name: 'Paris Hilton',
          relationship: 'Rumored link',
          timeframe: '2009',
          notes: 'Brief rumored connection with socialite.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  const drakeProfile: SystemProfile = {
    name: 'Drake',
    age: 38,
    bio: 'Canadian rapper, singer, and entrepreneur. One of the best-selling music artists worldwide. Known for hits like "Hotline Bling" and "God\'s Plan".',
    images: ['/Drake.png'],
    location: 'Toronto, Canada / Los Angeles, CA',
    socialHandles: {
      instagram: '@champagnepapi',
      twitter: '@Drake'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Rihanna',
          relationship: 'On-and-off relationship',
          duration: '2009-2016',
          notes: 'Long-term on-and-off relationship spanning several years.'
        },
        {
          name: 'Sophie Brussaux',
          relationship: 'Brief relationship',
          duration: '2017',
          notes: 'Mother of his son Adonis. Brief relationship that resulted in pregnancy.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored connection',
          timeframe: '2018-2019',
          notes: 'Multiple rumors and social media interactions during post-Kanye period.'
        },
        {
          name: 'Jennifer Lopez',
          relationship: 'Rumored dating',
          timeframe: '2016-2017',
          notes: 'Brief rumored connection with singer/actress.'
        },
        {
          name: 'Serena Williams',
          relationship: 'Rumored dating',
          timeframe: '2011-2015',
          notes: 'Long-rumored connection with tennis champion.'
        }
      ],
      total: 5
    },
    isVerified: true,
    isActive: true
  };

  const meekMillProfile: SystemProfile = {
    name: 'Meek Mill',
    age: 37,
    bio: 'Rapper and criminal justice reform advocate. Known for albums like "Dreams and Nightmares" and high-profile legal battles.',
    images: ['/Meek Mill.png'],
    location: 'Philadelphia, PA',
    socialHandles: {
      instagram: '@meekmill',
      twitter: '@MeekMill'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Nicki Minaj',
          relationship: 'Girlfriend',
          duration: '2015-2017',
          notes: 'High-profile relationship that ended amid cheating allegations.'
        },
        {
          name: 'Milan Harris',
          relationship: 'Relationship',
          duration: '2019-2020',
          notes: 'Mother of his son Czar. Brief relationship during legal troubles.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored link',
          timeframe: '2018',
          notes: 'Rumored connection during prison reform advocacy work.'
        }
      ],
      total: 3
    },
    isVerified: true,
    isActive: true
  };

  const vanJonesProfile: SystemProfile = {
    name: 'Van Jones',
    age: 56,
    bio: 'Political commentator, author, and criminal justice reform advocate. CNN contributor and former Obama administration official.',
    images: ['/Van Jones.png'],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@vanjones68',
      twitter: '@VanJones68'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Jana Carter',
          relationship: 'Marriage',
          duration: '2005-2019',
          notes: 'Former wife, divorced in 2019. Mother of two children.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored relationship',
          timeframe: '2020-2021',
          notes: 'Persistent rumors during law school and prison reform work together.'
        }
      ],
      total: 2
    },
    isVerified: true,
    isActive: true
  };

  const tomBradyProfile: SystemProfile = {
    name: 'Tom Brady',
    age: 47,
    bio: 'Former NFL quarterback and seven-time Super Bowl champion. Considered the greatest quarterback of all time. Recently retired from football.',
    images: ['/Tom Brady.png'],
    location: 'Tampa, FL / Los Angeles, CA',
    socialHandles: {
      instagram: '@tombrady',
      twitter: '@TomBrady'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Gisele Bundchen',
          relationship: 'Marriage',
          duration: '2009-2022',
          notes: 'Long-term marriage with supermodel. Two children together. Divorced in 2022.'
        },
        {
          name: 'Bridget Moynahan',
          relationship: 'Relationship',
          duration: '2004-2006',
          notes: 'Actress, mother of his son Jack. Relationship ended before Gisele.'
        }
      ],
      rumored: [
        {
          name: 'Kim Kardashian',
          relationship: 'Rumored interest',
          timeframe: '2023',
          notes: 'Rumors emerged after his divorce from Gisele Bundchen.'
        },
        {
          name: 'Irina Shayk',
          relationship: 'Rumored dating',
          timeframe: '2023',
          notes: 'Brief rumored connection with supermodel post-divorce.'
        }
      ],
      total: 4
    },
    isVerified: true,
    isActive: true
  };

  // Kim Kardashian profile data
  const kimKardashianProfile: SystemProfile = {
    name: 'Kim Kardashian',
    age: 44,
    bio: 'Reality TV star, entrepreneur, and social media mogul. Built a billion-dollar empire through SKIMS, KKW Beauty, and various business ventures. Mother of four children.',
    images: [
      '/Kim Kardashian.png'
    ],
    location: 'Los Angeles, CA',
    socialHandles: {
      instagram: '@kimkardashian',
      twitter: '@KimKardashian'
    },
    bodycount: {
      confirmed: [
        {
          name: 'Damon Thomas',
          relationship: 'Marriage',
          duration: '2000-2004',
          notes: 'First marriage, music producer. Divorced due to alleged abuse and control issues.'
        },
        {
          name: 'Ray J',
          relationship: 'Boyfriend',
          duration: '2003-2006',
          notes: 'High-profile relationship that included infamous tape. On-and-off relationship.'
        },
        {
          name: 'Nick Cannon',
          relationship: 'Brief dating',
          duration: '2006',
          notes: 'Short-lived relationship before his marriage to Mariah Carey.'
        },
        {
          name: 'Reggie Bush',
          relationship: 'Boyfriend',
          duration: '2007-2010',
          notes: 'Serious relationship with NFL player. Ended due to career pressures and distance.'
        },
        {
          name: 'Miles Austin',
          relationship: 'Brief dating',
          duration: '2010',
          notes: 'Short relationship with Dallas Cowboys player.'
        },
        {
          name: 'Kris Humphries',
          relationship: 'Marriage',
          duration: '2011',
          notes: 'Highly publicized 72-day marriage to NBA player. Divorced citing irreconcilable differences.'
        },
        {
          name: 'Kanye West',
          relationship: 'Marriage',
          duration: '2012-2022',
          notes: 'Longest relationship, married with four children (North, Saint, Chicago, Psalm). Divorced due to his mental health issues and erratic behavior.'
        },
        {
          name: 'Pete Davidson',
          relationship: 'Boyfriend',
          duration: '2021-2022',
          notes: 'High-profile relationship post-Kanye divorce. Ended due to long distance and different life stages.'
        },
        {
          name: 'Odell Beckham Jr.',
          relationship: 'Dating',
          duration: '2023-2024',
          notes: 'Recent relationship with NFL player. Confirmed through multiple public appearances.'
        },
        {
          name: 'The Game',
          relationship: 'Brief relationship',
          duration: '2006',
          notes: 'Short-lived relationship with rapper during early career.'
        }
      ],
      rumored: [
        {
          name: 'Nick Lachey',
          relationship: 'Rumored dating',
          timeframe: '2006',
          notes: 'Briefly linked after his divorce from Jessica Simpson.'
        },
        {
          name: 'Gabriel Aubry',
          relationship: 'Rumored link',
          timeframe: '2010',
          notes: 'Rumored connection during his custody battle with Halle Berry.'
        },
        {
          name: 'Michael Copon',
          relationship: 'Rumored dating',
          timeframe: '2004',
          notes: 'Briefly linked to actor/model during early reality TV days.'
        },
        {
          name: 'Cristiano Ronaldo',
          relationship: 'Rumored encounter',
          timeframe: '2010',
          notes: 'Alleged brief encounter during his Real Madrid days.'
        },
        {
          name: 'Drake',
          relationship: 'Rumored connection',
          timeframe: '2018-2019',
          notes: 'Multiple rumors and social media interactions during post-Kanye period.'
        },
        {
          name: 'Meek Mill',
          relationship: 'Rumored link',
          timeframe: '2018',
          notes: 'Rumored connection during prison reform advocacy work.'
        },
        {
          name: 'Van Jones',
          relationship: 'Rumored relationship',
          timeframe: '2020-2021',
          notes: 'Persistent rumors during law school and prison reform work together.'
        },
        {
          name: 'Tom Brady',
          relationship: 'Rumored interest',
          timeframe: '2023',
          notes: 'Rumors emerged after his divorce from Gisele Bundchen.'
        }
      ],
      total: 18
    },
    isVerified: true,
    isActive: true
  };

  useEffect(() => {
    setProfiles([
      diddyProfile,
      kimPorterProfile,
      cassieVenturaProfile,
      jenniferLopezProfile,
      sarahChapmanProfile,
      misaHyltonProfile,
      yungMiamiProfile,
      cameronDiazProfile,
      siennaMillerProfile,
      emmaHemingProfile,
      ginaHuynhProfile,
      joieChavisProfile,
      miracleWattsProfile,
      loriHarveyProfile,
      aubreyODayProfile,
      // Elon Musk and his relationships
      elonMuskProfile,
      justineWilsonProfile,
      talulahRileyProfile,
      grimesProfile,
      shivonZilisProfile,
      ashleyStClairProfile,
      natashaBassettProfile,
      jenniferGwynneProfile,
      amberHeardProfile,
      caraDelevingneProfile,
      rihannaProfile,
      // Kim Kardashian and her relationships
      kimKardashianProfile,
      damonThomasProfile,
      rayJProfile,
      nickCannonProfile,
      reggieBushProfile,
      milesAustinProfile,
      krisHumphriesProfile,
      kanyeWestProfile,
      peteDavidsonProfile,
      odellBeckhamJrProfile,
      theGameProfile,
      nickLacheyProfile,
      gabrielAubryProfile,
      michaelCoponProfile,
      cristianoRonaldoProfile,
      drakeProfile,
      meekMillProfile,
      vanJonesProfile,
      tomBradyProfile
    ]);
  }, []);

  const createSystemProfile = async (profile: SystemProfile) => {
    if (!walletAddress) {
      setMessage('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setMessage('');

      // Create the profile using the API
      const profileData = {
        userId: `system-${profile.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: profile.name,
        age: profile.age,
        bio: profile.bio,
        images: profile.images,
        location: profile.location,
        socialHandles: profile.socialHandles,
        isVerified: profile.isVerified,
        isActive: profile.isActive
      };

      const response = await apiClient.createProfile(profileData);
      
      console.log('Profile creation response:', response);
      
      if (response.success && (response as any).profile && (response as any).profile.id) {
        setMessage(`✅ Successfully created profile for ${profile.name}`);
        
        // Create ratings for each confirmed relationship
        for (const relationship of profile.bodycount.confirmed) {
          const ratingData = {
            raterId: userId || 'system',
            profileId: (response as any).profile.id,
            ratingType: 'dated' as const,
            isAnonymous: false,
            evidence: []
          };
          
          await apiClient.submitRating(ratingData);
        }
        
        // Create ratings for rumored relationships (marked as anonymous)
        for (const rumor of profile.bodycount.rumored) {
          const ratingData = {
            raterId: userId || 'system',
            profileId: (response as any).profile.id,
            ratingType: 'hookup' as const,
            isAnonymous: true,
            evidence: []
          };
          
          await apiClient.submitRating(ratingData);
        }
        
        setMessage(`✅ Created profile and ${profile.bodycount.total} relationship records for ${profile.name}`);
      } else {
        console.error('Profile creation failed:', response);
        setMessage(`❌ Failed to create profile for ${profile.name}: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating system profile:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">System Profiles</h1>
          <p className="text-gray-300 mb-6">
            Create celebrity and public figure profiles with documented relationship histories
          </p>
          
          {/* Wallet Connection */}
          <div className="glass-morphism p-6 rounded-xl mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">Wallet Connection</h2>
            <div className="flex items-center justify-center space-x-4">
              <WalletButton />
              {isConnected && <div className="text-green-400">✅ Connected</div>}
            </div>
          </div>
        </div>

        {/* Profile Cards */}
        <div className="grid gap-6">
          {profiles.map((profile, index) => (
            <div key={index} className="glass-morphism p-6 rounded-xl">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Profile Image */}
                <div className="flex-shrink-0">
                  <img
                    src={profile.images[0]}
                    alt={profile.name}
                    className="w-32 h-32 rounded-xl object-cover"
                  />
                </div>
                
                {/* Profile Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-white">{profile.name}</h3>
                    {profile.isVerified && <span className="text-blue-400">✓</span>}
                  </div>
                  <p className="text-gray-300 mb-2">Age: {profile.age} • {profile.location}</p>
                  <p className="text-gray-400 mb-4">{profile.bio}</p>
                  
                  {/* Social Handles */}
                  <div className="flex gap-4 mb-4">
                    {profile.socialHandles?.instagram && (
                  <span className="text-pink-400">{profile.socialHandles?.instagram}</span>
                )}
                {profile.socialHandles?.twitter && (
                  <span className="text-blue-400">{profile.socialHandles?.twitter}</span>
                )}
                  </div>
                  
                  {/* Simple Bodycount Score */}
                  <div className="mb-4">
                    <SimpleBodycountScore 
                      confirmedCount={profile.bodycount.confirmed.length}
                      rumoredCount={profile.bodycount.rumored.length}
                      profileName={profile.name}
                      className="w-full max-w-sm"
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSelectedProfile(selectedProfile === profile ? null : profile)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      {selectedProfile === profile ? 'Hide Details' : 'View Details'}
                    </button>
                    <button
                      onClick={() => createSystemProfile(profile)}
                      disabled={isLoading || !isConnected}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      {isLoading ? 'Creating...' : 'Create Profile'}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Detailed Relationship History */}
              {selectedProfile === profile && (
                <div className="mt-6 pt-6 border-t border-gray-600">
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Confirmed Relationships */}
                    <div>
                      <h5 className="text-lg font-semibold text-green-400 mb-3">Confirmed Relationships</h5>
                      <div className="space-y-3">
                        {profile.bodycount.confirmed.map((rel, idx) => (
                          <div key={idx} className="bg-green-900/20 rounded-lg p-3">
                            <div className="font-semibold text-white">{rel.name}</div>
                            <div className="text-sm text-gray-300">{rel.relationship} • {rel.duration}</div>
                            {rel.notes && <div className="text-xs text-gray-400 mt-1">{rel.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Rumored Relationships */}
                    <div>
                      <h5 className="text-lg font-semibold text-yellow-400 mb-3">Rumored Connections</h5>
                      <div className="space-y-3">
                        {profile.bodycount.rumored.map((rumor, idx) => (
                          <div key={idx} className="bg-yellow-900/20 rounded-lg p-3">
                            <div className="font-semibold text-white">{rumor.name}</div>
                            <div className="text-sm text-gray-300">{rumor.relationship} • {rumor.timeframe}</div>
                            {rumor.notes && <div className="text-xs text-gray-400 mt-1">{rumor.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Status Message */}
        {message && (
          <div className={`mt-6 p-4 rounded-lg text-center ${
            message.includes('✅') ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}