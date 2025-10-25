# Burnouts - Rivalis Fitness App

## Overview
Burnouts is a gamified fitness application that uses a card deck system to create workout sessions. Users select muscle groups and complete exercises based on randomly shuffled cards, earning dice rewards as they progress. Features real-time pose tracking with MediaPipe for workout monitoring.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Backend/Database**: Firebase (Firestore, Auth, Analytics)
- **Pose Detection**: MediaPipe Tasks Vision (@mediapipe/tasks-vision)

### Project Structure
```
src/
├── App.jsx                         # Main app with routing
├── main.jsx                        # React entry point
├── firebase.js                     # Firebase configuration
├── BurnoutsSelection.jsx           # Muscle group selection screen
├── BurnoutsApp.jsx                 # Main workout session component
├── index.css                       # Global styles
├── components/
│   └── PoseVisualizer.jsx          # Live skeleton overlay component
├── styles/
│   └── PoseVisualizer.css          # Pose visualizer styles
└── logic/
    ├── burnoutsHelpers.js          # Deck shuffling and stats helpers
    ├── MediaPose.js                # MediaPipe pose detection with 33 landmarks
    └── PlayerMediaHandler.jsx      # React component for media handling
```

### Key Features
1. **Authentication**: URL token-based authentication from Rivalis Hub
2. **Muscle Groups**: Arms, Legs, Core, Cardio (each with unique exercises)
3. **Card-Based Workouts**: 52-card deck with exercise variations
4. **Reward System**: Earn 1 dice per 30 reps
5. **Replay Mode**: Complete deck again with 2x rewards multiplier
6. **User Avatars**: Fetched from Firestore
7. **Real Pose Tracking**: MediaPipe tracks 33 body landmarks in real-time
8. **Live Skeleton Overlay**: Visual feedback showing body pose with skeleton overlay
9. **Dark Red Neon Theme**: Workout-themed circuitry icons matching app aesthetic

## Setup & Configuration

### Firebase Configuration
Firebase credentials are stored in `src/firebase.js`. These are public web app configuration values (not secret keys).

### Development
- **Server**: Runs on port 5000 (Vite dev server)
- **Host**: Configured to accept all hosts for Replit proxy compatibility
- Start with: `npm run dev`

### Deployment
- **Type**: Autoscale (stateless web app)
- **Build**: `npm run build`
- **Run**: Vite preview server on port 5000

## MediaPipe Pose Detection

### Implementation
- Uses `@mediapipe/tasks-vision` with PoseLandmarker API
- Tracks 33 body landmarks (shoulders, elbows, wrists, hips, knees, ankles, etc.)
- Real-time skeleton overlay on webcam feed
- GPU-accelerated pose detection
- Saves complete landmark data to Firestore

### Pose Data Structure
```javascript
{
  landmarks: [33 points with x, y, z, visibility],
  rotationY: number,      // Body rotation
  positionY: number,      // Vertical position
  activity: number,       // Movement intensity
  bodyPoints: {           // Key points for quick access
    nose, leftShoulder, rightShoulder, leftHip, rightHip
  },
  isDetected: boolean,
  updatedAt: timestamp
}
```

### Visualization
- Live webcam feed with mirrored view
- Green skeleton connectors
- Red/white landmark points
- Fixed position in bottom-right corner
- Active status indicator

## Cross-Domain Authentication

### Integration with Rivalis Hub
The app uses Firebase custom tokens passed via URL parameters for seamless authentication across domains.

**URL Format:**
```
https://burnouts-app.repl.co/burnouts/{MuscleGroup}?token={CUSTOM_TOKEN}
```

**See INTEGRATION_GUIDE.md for complete integration instructions.**

## Recent Changes

### October 25, 2025
- **Upgraded to MediaPipe Pose Detection**
  - Replaced basic motion detection with real pose tracking
  - Implemented 33-body landmark tracking system
  - Added live skeleton visualization overlay
  - Saves all landmarks to Firestore for downstream analysis
  
- **URL Token Authentication**
  - Implemented cross-domain authentication via URL tokens
  - Created integration guide for Rivalis Hub
  - Fixed redirect loop issues between domains
  
- **UI/UX Improvements**
  - Created dark red neon circuitry workout-themed tile images
  - Icons now fill entire button with overlay text
  - Professional cyberpunk fitness aesthetic

### October 24, 2025
- Initial project setup from GitHub import
- Configured for Replit environment (port 5000, allow all hosts)
- Basic pose tracking foundation

## Dependencies
- **react & react-dom**: UI framework
- **react-router-dom**: Client-side routing
- **firebase**: Backend services (auth, database, analytics)
- **@mediapipe/tasks-vision**: Real-time pose detection
- **vite**: Build tool and dev server
- **@vitejs/plugin-react**: React support for Vite

## User Preferences
- Prefers dark red neon circuitry aesthetic for all visual elements
- Workout-themed imagery that clearly represents exercises

## Data Tracking

### Firestore Collections

**users/{userId}**
- totalReps: Total reps in current session
- diceBalance: Total dice earned
- leaderboard: Object with arrays of session totals per muscle group
- avatarUrl: User avatar image URL

**poseData/{userId}**
- landmarks: Array of 33 body landmarks (x, y, z, visibility)
- rotationY, positionY, activity: Pose metrics
- bodyPoints: Key body positions
- isDetected: Pose detection status
- updatedAt: Last update timestamp

## Notes
- App requires authentication from Rivalis Hub via URL token
- MediaPipe provides real-time pose detection with 33 body landmarks
- Pose data throttled to 1 update per 2 seconds in Firestore
- GPU acceleration enabled for pose detection
- Webcam feed is mirrored for natural user experience
- Icon assets located in `public/assets/icons/`
- All tile images custom-generated with dark red neon circuitry theme
