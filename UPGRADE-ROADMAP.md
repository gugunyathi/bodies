# Bodies App — Comprehensive Audit & Upgrade Roadmap

## Current State Assessment

**What's working well:**
- Strong core loop (swipe → rate → evidence → leaderboard)
- Solid tech stack (Next.js 15, Base L2, Farcaster integration)
- Privacy controls lower the barrier to participate
- Betting adds a recurring daily hook

**Critical gaps killing virality:**

---

## Priority 1 — Shareability (Highest Viral Impact)

### 1.1 Dynamic OG Images Per Profile
Right now sharing a link just shows the app. Every celebrity profile URL needs to generate a custom OG image showing their bodycount score, ranking, and top rating. Next.js has `ImageResponse` built-in via `next/og`.

```
/profile/[id] → og:image shows "Kim K · #1 · 47 Connections · 🔥 23 Hookups"
```
This alone drives massive organic sharing when someone rates someone controversial.

### 1.2 "Receipt" Share Cards
After rating someone, generate a downloadable/shareable image card:
- "I rated [celebrity] 🔥 Hookup · See if you agree → [link]"
- Instagram Stories format (9:16)
- Farcaster Frame compatible (SDK already installed)

### 1.3 Farcaster Frame Integration
`@farcaster/frame-sdk` is installed but not fully leveraged. Build a Frame that:
- Shows the current #1 ranked celebrity
- Lets users vote directly in-feed on Warpcast without opening the app
- Cast-to-earn: rating via Frame gives points

---

## Priority 2 — Retention Loops

### 2.1 Streak System
Daily login + rating streak with visual fire counter. Even 3-day streaks create habit formation. Miss a day → streak breaks → "Your 7-day streak is at risk" push notification (or Farcaster notification).

### 2.2 "New Evidence Added" Notifications
When someone adds evidence to a celebrity you've rated, notify you. Creates re-engagement without any new content needed — leverages the existing evidence system.

### 2.3 Controversy Score & Hot Feed
Surface profiles that are *recently getting lots of conflicting ratings* in a "🔥 Trending Today" section above the swipe stack. Algorithmic freshness > chronological ordering.

### 2.4 Weekly Digest
Email/notification: "This week's biggest mover: [Celebrity] went from #12 → #3. 847 new ratings."

---

## Priority 3 — Social Proof & FOMO

### 3.1 Live Activity Feed
Small toast/ticker at the bottom: "Anonymous rated Kim K 🔥 · 2 seconds ago" — real-time activity makes the platform feel alive and busy even with moderate users. Can be seeded initially with cached recent ratings.

### 3.2 "X people agree with you"
After rating, show: "✓ You and **2,341 others** rated this as 🔥 Hookup" — instant social validation.

### 3.3 Controversial Badges
When a profile's ratings are split ~50/50 between two categories, show a ⚡ "Controversial" badge. These drive the most shares and debates.

### 3.4 Public Rating Profiles
Right now everything can be anonymous. Add an opt-in public profile page: "See all of @username's ratings" — this creates parasocial entertainment value ("what does this person think about everyone?").

---

## Priority 4 — UX Friction Reduction

### 4.1 Onboarding Flow
There is no guided onboarding. First-time users see a swipe stack with no context. Need:
1. 3-screen intro (what it is, how to rate, what the scores mean)
2. First-time "tutorial" card with a fake celebrity to practice swiping
3. Prompt to rate 5 celebrities before showing leaderboard

### 4.2 Skip Wallet Requirement for Core Features
Wallet connect as a *hard gate* is a massive drop-off point. Let users swipe and rate anonymously (localStorage), then prompt wallet only for:
- Submitting evidence
- Betting
- Appearing on public leaderboards

### 4.3 Search & Discovery
Add a search bar to find specific celebrities. Currently users have to swipe through the stack to find who they want — fine for discovery but bad for intent-driven users.

### 4.4 Profile Pages Are the Product
The `/profile/[id]` pages should be the shareable unit. Make them beautiful:
- Hero image with gradient overlay
- Big bodycount number with animation
- Rating breakdown donut chart
- Timeline of notable connections
- Evidence gallery
- "Rate this person" CTA button

---

## Priority 5 — Viral Mechanics

### 5.1 "Fact Check" Mode
Users can *dispute* existing evidence with counter-evidence. Disputed evidence goes to community vote. Creates drama loops and repeat engagement.

### 5.2 Comparison Mode
"Who has the higher bodycount: Drake vs. Kanye?" — head-to-head comparison card. Extremely shareable, drives Twitter/Instagram debate.

### 5.3 Lists & Collections
"Top 10 Most Controversial Athletes" — curated lists that can be shared as a full page. Each list becomes its own shareable URL with a custom OG image.

### 5.4 Celeb-Category Leaderboards
Break the single leaderboard into categories: Athletes, Musicians, Reality TV, Actors, Tech Billionaires. Category-specific sharing ("Drake is #1 among Musicians 🎤") hits narrower but more engaged audiences.

### 5.5 Betting Social Graph
When the daily bet resolves, show who bet correctly vs incorrectly and allow them to flex it: "I called it — 83% accuracy this week 📊" as a shareable card.

---

## Priority 6 — Content & Data

### 6.1 AI-Generated "Relationship Timelines"
`@google/generative-ai` is already installed. Use it to auto-generate a narrative summary of a celebrity's known relationships based on aggregated community ratings + evidence. Shows as a "biography" on the profile page.

### 6.2 "This Day in History" Card
Inject a daily card into the swipe stack: "On this day in 2019, [Celebrity A] and [Celebrity B] were reported dating. How do you rate it?" Contextual content re-surfaces old profiles.

### 6.3 Trending Topics Integration
Auto-detect when a celebrity is in the news (via a simple RSS/news API check) and boost their card to the top of the swipe stack with a "🔴 In the news today" banner.

---

## Priority 7 — Monetization Upgrades

### 7.1 "Verified" Evidence Tier
Pay $X (USDC on Base) to have evidence marked as "Verified Submission" — gets more visibility and can't be auto-flagged. Low friction on Base L2 with the existing Paymaster.

### 7.2 Sponsored Celebrity Profiles
PR teams / fan pages pay to have a profile boosted in the swipe stack with a "Sponsored" label. Already plausible with the VIP profile system.

### 7.3 Premium Insights
Pay for access to: full rating breakdown by date range, who's rating them (anonymized demographics), evidence quality scores. B2B play for PR/media companies.

---

## Quick Wins (Ship This Week)

| Item | Impact | Effort |
|---|---|---|
| OG images per profile | Very High | Low (`next/og`) |
| "X others agree" after rating | High | Very Low |
| Live activity ticker | High | Low |
| Controversial badge on profiles | Medium | Very Low |
| Search bar for profiles | High | Low |
| Remove wallet gate from swiping | Very High | Medium |
| Farcaster Frame for daily bet | High | Medium |

---

## Longer Term (1–3 months)

| Feature | Notes |
|---|---|
| **Comparison Mode** | Most shareable feature possible |
| **Public user profiles** | Creates influencer dynamic within the app |
| **Category leaderboards** | Enables niche community growth |
| **AI timeline summaries** | Makes profile pages destinations not just data |
| **Streak system** | Core habit-formation mechanic |
| **Onboarding flow** | Required for conversion — do this ASAP |

---

## Key Insight

The single biggest unlock is making **profile pages beautiful, shareable, and SEO-indexed**. Right now the value is trapped inside the swipe interface. Every profile should be a standalone piece of content that spreads on its own.

`/profile/[kim-kardashian]` → shareable → goes viral → drives installs → users swipe → leaderboard grows → more sharing.

That flywheel doesn't work until profile pages are destinations.
