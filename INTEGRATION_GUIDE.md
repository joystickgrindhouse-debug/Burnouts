# Burnouts App - Integration Guide for Rivalis Hub

## Authentication Flow

The Burnouts app now supports URL token-based authentication to enable seamless integration with Rivalis Hub.

## How It Works

1. **User logs into Rivalis Hub** using Firebase Authentication
2. **Rivalis Hub generates a custom token** for the user using Firebase Admin SDK
3. **Rivalis Hub passes the token in the URL** when linking to Burnouts
4. **Burnouts app automatically signs in** the user with the provided token

## Integration Steps for Rivalis Hub

### Step 1: Generate Custom Token (Backend)

In your backend (Cloud Functions, Node.js server, etc.), use Firebase Admin SDK to create a custom token:

```javascript
const admin = require('firebase-admin');

// When user wants to access Burnouts app
async function createBurnoutsLink(userId) {
  try {
    // Generate custom token for the user
    const customToken = await admin.auth().createCustomToken(userId);
    
    // Create URL with token
    const burnoutsUrl = `https://your-burnouts-app.repl.co/burnouts?token=${customToken}`;
    
    return burnoutsUrl;
  } catch (error) {
    console.error('Error creating custom token:', error);
    throw error;
  }
}
```

### Step 2: Link to Burnouts App

When a user clicks on a muscle group tile in Rivalis Hub, redirect them with the token:

```javascript
// Example: User clicks "Arms" workout
const userId = currentUser.uid;
const customToken = await createCustomTokenForUser(userId);
const burnoutsUrl = `https://your-burnouts-app.repl.co/burnouts/Arms?token=${customToken}`;

// Redirect user
window.location.href = burnoutsUrl;
```

### URL Format

**Selection Page:**
```
https://your-burnouts-app.repl.co/burnouts?token={CUSTOM_TOKEN}
```

**Specific Muscle Group:**
```
https://your-burnouts-app.repl.co/burnouts/{MUSCLE_GROUP}?token={CUSTOM_TOKEN}
```

Where `{MUSCLE_GROUP}` can be: `Arms`, `Legs`, `Core`, or `Cardio`

### Step 3: Token Security

- **Custom tokens expire** after 1 hour by default
- **Generate a new token** each time the user navigates to Burnouts
- **Never expose tokens** in client-side code or logs
- **Always generate tokens server-side** using Firebase Admin SDK

## Example Implementation (Cloud Function)

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.createBurnoutsToken = functions.https.onCall(async (data, context) => {
  // Ensure user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in');
  }
  
  const userId = context.auth.uid;
  const muscleGroup = data.muscleGroup || ''; // Optional: Arms, Legs, Core, Cardio
  
  try {
    // Create custom token
    const customToken = await admin.auth().createCustomToken(userId);
    
    // Build URL
    const baseUrl = 'https://your-burnouts-app.repl.co/burnouts';
    const url = muscleGroup 
      ? `${baseUrl}/${muscleGroup}?token=${customToken}`
      : `${baseUrl}?token=${customToken}`;
    
    return { url };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Failed to create token');
  }
});
```

## Client-Side Usage (Rivalis Hub)

```javascript
// Import Firebase callable function
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createBurnoutsToken = httpsCallable(functions, 'createBurnoutsToken');

// When user clicks on a muscle group
async function openBurnouts(muscleGroup) {
  try {
    const result = await createBurnoutsToken({ muscleGroup });
    window.location.href = result.data.url;
  } catch (error) {
    console.error('Error opening Burnouts:', error);
    alert('Failed to open workout. Please try again.');
  }
}
```

## Testing

To test the integration, you can manually create a custom token using Firebase Admin SDK and append it to the URL:

```
https://your-burnouts-app.repl.co/burnouts?token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Troubleshooting

### User gets redirected back to login
- Verify the custom token is being generated correctly
- Check that the token is included in the URL
- Ensure both apps use the same Firebase project

### "Authentication Error" message
- Token may be expired (max 1 hour)
- Token format may be incorrect
- Firebase project configuration mismatch

### Console errors
- Check browser console for detailed error messages
- Verify Firebase configuration matches between apps

## Questions?

If you need help implementing this integration, please reach out!
