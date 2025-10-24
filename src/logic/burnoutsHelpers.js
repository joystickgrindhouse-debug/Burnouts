import { db } from "../firebase";
import { doc, updateDoc, arrayUnion, getDoc, setDoc } from "firebase/firestore";

export function shuffleDeck(muscleGroup) {
  const exercisesMap = {
    Arms: ["Push-Ups", "Plank Up-Downs", "Tricep Dips", "Shoulder Taps"],
    Legs: ["Squats", "Lunges", "Glute Bridges", "Calf Raises"],
    Core: ["Crunches", "Plank Hold", "Russian Twists", "Leg Raises"],
    Cardio: ["Jumping Jacks", "High Knees", "Burpees", "Mountain Climbers"],
  };

  const suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
  const faceValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
  let deck = [];

  suits.forEach((suit) => {
    faceValues.forEach((face) => {
      const reps = typeof face === "number" ? face : 
                   face === "J" ? 11 : 
                   face === "Q" ? 12 : 
                   face === "K" ? 13 : 14;
      const exerciseList = exercisesMap[muscleGroup] || exercisesMap["Arms"];
      const exercise = exerciseList[Math.floor(Math.random() * exerciseList.length)];
      deck.push({ suit, face, reps, exercise });
    });
  });

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export async function updateUserStats(userId, totalReps, diceEarned, muscleGroup) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      totalReps,
      diceBalance: diceEarned,
      [`leaderboard.${muscleGroup}`]: arrayUnion(totalReps),
    });
  } else {
    await setDoc(userRef, {
      totalReps,
      diceBalance: diceEarned,
      leaderboard: { [muscleGroup]: [totalReps] },
    });
  }
}

export async function finalizeSession(userId, totalReps, diceEarned, muscleGroup) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      [`leaderboard.${muscleGroup}`]: arrayUnion(totalReps),
    });
  }
}
