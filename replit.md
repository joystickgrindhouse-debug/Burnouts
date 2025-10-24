# Burnouts - Rivalis Fitness App

## Overview
Burnouts is a gamified fitness application that uses a card deck system to create workout sessions. Users select muscle groups and complete exercises based on randomly shuffled cards, earning dice rewards as they progress.

## Project Architecture

### Tech Stack
- **Frontend**: React 18 + Vite
- **Routing**: React Router v6
- **Backend/Database**: Firebase (Firestore, Auth, Analytics)
- **Media Handling**: Custom MediaPose module (lightweight camera access)

### Project Structure
```
src/
├── App.jsx                         # Main app with routing
├── main.jsx                        # React entry point
├── firebase.js                     # Firebase configuration
├── BurnoutsSelection.jsx           # Muscle group selection screen
├── BurnoutsApp.jsx                 # Main workout session component
├── index.css                       # Global styles
└── logic/
    ├── burnoutsHelpers.js          # Deck shuffling and stats helpers
    ├── MediaPose.js                # Lightweight pose/camera handler
    └── PlayerMediaHandler.js       # React component for media handling
```

### Key Features
1. **Authentication**: Users must authenticate via Rivalis Hub (redirects to https://rivalishub.netlify.app)
2. **Muscle Groups**: Arms, Legs, Core, Cardio
3. **Card-Based Workouts**: 52-card deck with exercise variations
4. **Reward System**: Earn 1 dice per 30 reps
5. **Replay Mode**: Complete deck again with 2x rewards multiplier
6. **User Avatars**: Fetched from Firestore (Dicebear integration)
7. **Pose Data**: Camera access via MediaPose (no TensorFlow dependency)

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

## Recent Changes (October 24, 2025)
- Initial project setup from GitHub import
- Removed TensorFlow pose detection dependency
- Created lightweight MediaPose module for camera access
- Configured for Replit environment (port 5000, allow all hosts)
- Added stock images as placeholder icons for muscle groups

## Dependencies
- react & react-dom: UI framework
- react-router-dom: Client-side routing
- firebase: Backend services (auth, database, analytics)
- vite: Build tool and dev server
- @vitejs/plugin-react: React support for Vite

## User Preferences
None documented yet.

## Notes
- App requires authentication from Rivalis Hub
- MediaPose provides basic camera access without heavy ML dependencies
- Firestore stores user stats, avatars, and pose data
- Icon assets located in `public/assets/icons/`
