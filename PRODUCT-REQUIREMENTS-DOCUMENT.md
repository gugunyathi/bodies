# Bodies App - Product Requirements Document (PRD)

## Executive Summary

Bodies is a revolutionary social platform that gamifies celebrity relationship tracking through an engaging swipe-based interface. Users can explore celebrity connections, rate relationships, and compete on leaderboards while maintaining privacy controls. The app combines social discovery with data visualization to create an entertaining and interactive experience around celebrity culture.

## Product Overview

### Vision
To create the most comprehensive and engaging platform for exploring celebrity relationships and connections through crowd-sourced data and gamified interactions.

### Mission
Provide users with an entertaining, privacy-conscious way to discover, rate, and track celebrity relationships while building a community around shared interests in celebrity culture.

### Target Audience
- **Primary**: Celebrity culture enthusiasts aged 18-35
- **Secondary**: Social media users interested in entertainment news
- **Tertiary**: Data visualization and relationship mapping enthusiasts

## Core Features

### 1. Profile Management
- **Celebrity Profiles**: Comprehensive database of celebrity profiles with photos, basic information, and relationship history
- **User Profiles**: Personal accounts with privacy settings and activity tracking
- **Profile Creation**: Community-driven profile addition with moderation
- **Data Integrity**: Automated deduplication and data validation

### 2. Swipe Interface
- **Card-based Discovery**: Tinder-style swipe interface for exploring celebrity profiles
- **Multi-image Support**: Navigate through multiple photos per profile
- **Relationship Rating**: Rate celebrity relationships on multiple dimensions:
  - Dated relationships
  - Hookup connections
  - Transactional relationships
- **Evidence Upload**: Support for uploading evidence to back relationship claims
- **Drag Gestures**: Intuitive swipe left/right functionality

### 3. Leaderboard System
- **Bodycount Tracking**: Comprehensive scoring system based on relationship data
- **Fame Level Classification**: Automatic categorization of celebrities by popularity
- **Ranking System**: Real-time leaderboards with multiple sorting options
- **Statistics Dashboard**: Detailed analytics and insights
- **Score Breakdown**: Transparent scoring methodology

### 4. Privacy Controls
- **Anonymous Ratings**: Option to submit ratings without revealing identity
- **Profile Visibility**: Control over profile searchability and visibility
- **Private Mode**: Hide personal activity from other users
- **Data Control**: User control over personal data sharing

### 5. Search and Discovery
- **Fuzzy Search**: Intelligent name-based profile search
- **Filtering Options**: Advanced filters for profile discovery
- **Recommendation Engine**: Personalized profile suggestions
- **Category Browsing**: Browse profiles by industry, fame level, or other criteria

### 6. Social Features
- **Community Ratings**: Crowd-sourced relationship verification
- **Evidence System**: Photo and document upload for relationship proof
- **Activity Feed**: Track recent platform activity
- **User Contributions**: Recognition for active community members

## Technical Specifications

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Custom CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: WorldCoin MiniKit, Farcaster SDK
- **Deployment**: Vercel
- **File Storage**: Cloudinary (for images)
- **State Management**: React Hooks, Context API

### Database Schema

#### Profile Model
```typescript
interface Profile {
  _id: ObjectId;
  name: string;
  images: string[];
  bodycount: number;
  fameLevel: 'A-list' | 'B-list' | 'C-list' | 'Rising' | 'Influencer';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Rating Model
```typescript
interface Rating {
  _id: ObjectId;
  profileId: ObjectId;
  userId?: string;
  type: 'dated' | 'hookup' | 'transactional';
  evidence?: Evidence[];
  createdAt: Date;
}
```

#### Evidence Model
```typescript
interface Evidence {
  _id: ObjectId;
  type: 'image' | 'document' | 'link';
  url: string;
  description?: string;
  uploadedBy: string;
  createdAt: Date;
}
```

### API Architecture

#### Core Endpoints
- `GET /api/profiles` - Retrieve profiles with filtering and pagination
- `POST /api/profiles` - Create new celebrity profiles
- `GET /api/ratings` - Fetch ratings by profile or user
- `POST /api/ratings` - Submit new relationship ratings
- `GET /api/stats` - Retrieve platform statistics and leaderboards
- `GET /api/stats?type=leaderboard` - Get ranked celebrity list
- `GET /api/stats?type=overview` - Get platform overview statistics

## User Experience Design

### Navigation Structure
- **Main Tabs**: Swipe, Add Profile, Scores, Privacy
- **Swipe Interface**: Primary interaction method
- **Leaderboard View**: Comprehensive ranking display
- **Profile Management**: Easy profile creation and editing
- **Settings Panel**: Comprehensive privacy controls

### Key User Flows
1. **Onboarding**: Account creation → Privacy setup → Tutorial
2. **Discovery**: Browse profiles → Rate relationships → View evidence
3. **Contribution**: Add profiles → Upload evidence → Rate connections
4. **Competition**: View leaderboards → Track scores → Compare rankings

### Responsive Design
- Mobile-first approach
- Touch-optimized interactions
- Adaptive layouts for different screen sizes
- Progressive Web App (PWA) capabilities

## Performance Requirements

### Speed Metrics
- Page load time: < 2 seconds
- API response time: < 500ms
- Image loading: Progressive with lazy loading
- Swipe responsiveness: < 100ms

### Scalability
- Support for 10,000+ concurrent users
- Database optimization for large datasets
- CDN integration for global performance
- Efficient caching strategies

### Reliability
- 99.9% uptime target
- Automated error monitoring
- Graceful degradation for offline scenarios
- Comprehensive logging and analytics

## Security and Compliance

### Data Protection
- GDPR compliance for EU users
- CCPA compliance for California users
- Secure data encryption in transit and at rest
- Regular security audits and penetration testing

### Privacy Features
- Anonymous rating options
- User data deletion capabilities
- Transparent privacy policy
- Opt-out mechanisms for all data collection

### Content Moderation
- Automated content filtering
- Community reporting system
- Manual review process for sensitive content
- Clear community guidelines

## Future Enhancements

### Phase 2 Features
- Real-time notifications
- Advanced analytics dashboard
- Social sharing capabilities
- Mobile app development (iOS/Android)

### Phase 3 Features
- AI-powered relationship predictions
- Integration with social media platforms
- Premium subscription tiers
- Advanced data visualization tools

### Long-term Vision
- Expansion to other entertainment verticals
- API for third-party developers
- Machine learning for content recommendations
- Blockchain integration for data verification

## Success Metrics

### User Engagement
- Daily Active Users (DAU)
- Session duration
- Swipe completion rate
- Rating submission frequency

### Content Quality
- Profile accuracy rate
- Evidence verification rate
- Community contribution levels
- Data completeness metrics

### Business Metrics
- User acquisition cost
- User retention rate
- Platform growth rate
- Community health score

## Risk Assessment

### Technical Risks
- Database performance at scale
- Third-party service dependencies
- Security vulnerabilities
- Data consistency challenges

### Business Risks
- Content accuracy and liability
- Privacy regulation compliance
- Community management challenges
- Competitive market pressures

### Mitigation Strategies
- Comprehensive testing protocols
- Redundant system architecture
- Legal review processes
- Community guidelines enforcement

---

*This PRD serves as the foundational document for the Bodies app development and should be updated regularly as the product evolves.*