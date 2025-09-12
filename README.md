# Bodies - Gen Z Relationship Tracker 💕

A modern, blockchain-integrated relationship tracking app built with Next.js, featuring swipe-based rating, evidence upload, and privacy controls.

## 🚀 Features

- **Swipe Interface**: Tinder-style card swiping for profile navigation
- **Emoji Rating System**: Rate relationships as ❤️ Dated, 🔥 Hookup, or 💵 Transactional
- **Evidence Upload**: Attach images, videos, and links to ratings
- **Bodycount Tracking**: Dynamic scoring system with leaderboards
- **Privacy Controls**: Anonymous ratings and comprehensive privacy settings
- **Wallet Integration**: WorldCoin MiniKit wallet connectivity
- **Base Account Support**: Seamless blockchain integration
- **Data Persistence**: Hybrid local/cloud storage with automatic migration
- **Gen Z Aesthetic**: Modern gradients, animations, and mobile-first design

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB
- **Blockchain**: WorldCoin MiniKit, Base network integration
- **Database**: MongoDB Atlas
- **Deployment**: Vercel
- **Authentication**: Wallet-based authentication

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bodies
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Update `.env.local` with your configuration:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   MONGODB_DB_NAME=bodies_development
   NEXTAUTH_SECRET=your-secret-key
   NEXT_PUBLIC_API_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Production Deployment to Vercel

### Quick Deploy

1. **Connect to Vercel**
   - Fork this repository
   - Connect your GitHub account to Vercel
   - Import the project with name `phila-blockchain`

2. **Configure Environment Variables**
   In your Vercel dashboard, add these environment variables:
   ```
   MONGODB_URI=mongodb+srv://***REDACTED***@cluster0.qvunkxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   MONGODB_DB_NAME=bodies_production
   NEXTAUTH_SECRET=your-production-secret-key
   NEXTAUTH_URL=https://phila-blockchain.vercel.app
   NEXT_PUBLIC_API_URL=https://phila-blockchain.vercel.app
   ```

3. **Deploy**
   ```bash
   npm run build
   vercel --prod
   ```

## 🗄 Database Setup

The app uses MongoDB Atlas with the provided connection string. Collections are automatically created:
- `users` - User accounts and wallet addresses
- `profiles` - User profiles with personal information
- `ratings` - Rating submissions with evidence
- `bodycount_stats` - Aggregated statistics and leaderboards

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/connect` - Connect wallet and create/retrieve user

### Profiles
- `GET /api/profiles` - Get swipeable profiles
- `POST /api/profiles` - Create new profile

### Ratings
- `GET /api/ratings` - Get ratings by profile/user
- `POST /api/ratings` - Submit new rating with evidence

### Statistics
- `GET /api/stats?type=leaderboard` - Get leaderboard
- `GET /api/stats?type=profile&profileId=<id>` - Get profile stats
- `GET /api/stats?type=overview` - Get platform overview

## 🔒 Security Features

- **Wallet Authentication**: Secure wallet-based user authentication
- **Data Validation**: Input validation and sanitization
- **Privacy Controls**: Comprehensive privacy settings
- **Anonymous Ratings**: Optional anonymous rating submissions
- **CORS Protection**: Configured CORS policies

## 📱 Mobile Optimization

- **Responsive Design**: Mobile-first approach
- **Touch Gestures**: Swipe gestures for mobile devices
- **Performance Optimized**: Lazy loading and code splitting

## 🔄 Data Migration

The app automatically handles migration from local storage to cloud database when users connect their wallet for the first time:

1. **Automatic Detection**: App detects existing local data
2. **Wallet Connection**: User connects wallet
3. **Data Migration**: Local profiles and ratings are uploaded to database
4. **Verification**: Migration success is confirmed
5. **Sync Status**: Cloud sync indicator shows connection status

## Getting Started

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Verify environment variables, these will be set up by the `npx create-onchain --mini` command:

You can regenerate the FARCASTER Account Association environment variables by running `npx create-onchain --manifest` in your project directory.

The environment variables enable the following features:

- Frame metadata - Sets up the Frame Embed that will be shown when you cast your frame
- Account association - Allows users to add your frame to their account, enables notifications
- Redis API keys - Enable Webhooks and background notifications for your application by storing users notification details

```bash
# Shared/OnchainKit variables
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=
NEXT_PUBLIC_URL=
NEXT_PUBLIC_ICON_URL=
NEXT_PUBLIC_ONCHAINKIT_API_KEY=

# Frame metadata
FARCASTER_HEADER=
FARCASTER_PAYLOAD=
FARCASTER_SIGNATURE=
NEXT_PUBLIC_APP_ICON=
NEXT_PUBLIC_APP_SUBTITLE=
NEXT_PUBLIC_APP_DESCRIPTION=
NEXT_PUBLIC_APP_SPLASH_IMAGE=
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=
NEXT_PUBLIC_APP_PRIMARY_CATEGORY=
NEXT_PUBLIC_APP_HERO_IMAGE=
NEXT_PUBLIC_APP_TAGLINE=
NEXT_PUBLIC_APP_OG_TITLE=
NEXT_PUBLIC_APP_OG_DESCRIPTION=
NEXT_PUBLIC_APP_OG_IMAGE=

# Redis config
REDIS_URL=
REDIS_TOKEN=
```

3. Start the development server:
```bash
npm run dev
```

## Template Features

### Frame Configuration
- `.well-known/farcaster.json` endpoint configured for Frame metadata and account association
- Frame metadata automatically added to page headers in `layout.tsx`

### Background Notifications
- Redis-backed notification system using Upstash
- Ready-to-use notification endpoints in `api/notify` and `api/webhook`
- Notification client utilities in `lib/notification-client.ts`

### Theming
- Custom theme defined in `theme.css` with OnchainKit variables
- Pixel font integration with Pixelify Sans
- Dark/light mode support through OnchainKit

### MiniKit Provider
The app is wrapped with `MiniKitProvider` in `providers.tsx`, configured with:
- OnchainKit integration
- Access to Frames context
- Sets up Wagmi Connectors
- Sets up Frame SDK listeners
- Applies Safe Area Insets

## Customization

To get started building your own frame, follow these steps:

1. Remove the DemoComponents:
   - Delete `components/DemoComponents.tsx`
   - Remove demo-related imports from `page.tsx`

2. Start building your Frame:
   - Modify `page.tsx` to create your Frame UI
   - Update theme variables in `theme.css`
   - Adjust MiniKit configuration in `providers.tsx`

3. Add your frame to your account:
   - Cast your frame to see it in action
   - Share your frame with others to start building your community

## Learn More

- [MiniKit Documentation](https://docs.base.org/builderkits/minikit/overview)
- [OnchainKit Documentation](https://docs.base.org/builderkits/onchainkit/getting-started)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
