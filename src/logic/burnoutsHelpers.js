export function shuffleDeck(muscleGroup) {
  const exercisesMap = {
    Arms: ["Push-ups", "Plank Up-Downs", "Pike Push ups", "Shoulder Taps"],
    Legs: ["Squats", "Lunges", "Glute Bridges", "Calf Raises"],
    Core: ["Crunches", "Plank", "Russian Twists", "Leg Raises"],
    Cardio: ["Jumping Jacks", "High Knees", "Burpees", "Mountain Climbers"],
  };

  const suits = ["Spades", "Hearts", "Diamonds", "Clubs"];
  const faceValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, "J", "Q", "K", "A"];
  let deck = [];

  // Determine the list of exercises for the current muscle group
  const exerciseList = exercisesMap[muscleGroup] || exercisesMap["Arms"];

  suits.forEach((suit, suitIndex) => {
    // Each suit represents one specific exercise from the muscle group's list
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

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function updateUserStats(userId, totalReps, diceEarned, muscleGroup) {
  console.log("Stats updated (local only for now):", { userId, totalReps, diceEarned, muscleGroup });
}

export function finalizeSession(userId, totalReps, diceEarned, muscleGroup) {
  console.log("Session finalized (local only for now):", { userId, totalReps, diceEarned, muscleGroup });
}
