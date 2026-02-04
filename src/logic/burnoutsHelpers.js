import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";

export function shuffleDeck(muscleGroup) {
  const exercisesMap = {
    Arms: ["Pushups", "PlankUpDowns", "PikePushups", "ShoulderTaps"],
    Legs: ["Squats", "Lunges", "GluteBridges", "CalfRaises"],
    Core: ["Crunches", "Plank", "RussianTwists", "LegRaises"],
    "Full Body": ["JumpingJacks", "HighKnees", "Burpees", "MountainClimbers"],
  };

  const suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
  const faceValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
  let deck = [];

  const exerciseList = exercisesMap[muscleGroup] || exercisesMap["Arms"];

  suits.forEach((suit, suitIndex) => {
    // Each suit is assigned one of the 4 exercises for the muscle group
    const exercise = exerciseList[suitIndex % exerciseList.length];
    
    faceValues.forEach((face) => {
      const reps = typeof face === "number" ? face : 
                   face === "J" ? 11 : 
                   face === "Q" ? 12 : 
                   face === "K" ? 13 : 14;
      
      deck.push({ 
        suit, 
        face, 
        reps, 
        exercise, 
        category: muscleGroup 
      });
    });
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export async function updateUserStats(userId, totalReps, ticketsEarned, muscleGroup) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      totalReps,
      ticketBalance: ticketsEarned,
      [`leaderboard.${muscleGroup}`]: arrayUnion(totalReps),
    });
  } else {
    await setDoc(userRef, {
      totalReps,
      ticketBalance: ticketsEarned,
      leaderboard: { [muscleGroup]: [totalReps] },
    });
  }
}

export async function finalizeSession(userId, totalReps, ticketsEarned, muscleGroup) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      [`leaderboard.${muscleGroup}`]: arrayUnion(totalReps),
    });
  }
}
