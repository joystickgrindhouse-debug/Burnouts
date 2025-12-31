import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { shuffleDeck } from "./logic/burnoutsHelpers";

export default function BurnoutsApp() {
  const { muscleGroup } = useParams();
  const [loading, setLoading] = useState(false);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <BurnoutsSession 
      muscleGroup={muscleGroup} 
    />
  );
}

function BurnoutsSession({ muscleGroup }) {
  const [deck, setDeck] = useState(shuffleDeck(muscleGroup));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [diceEarned, setDiceEarned] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [sessionActive, setSessionActive] = useState(true);

  const completeCard = (reps) => {
    const adjustedReps = reps * multiplier;
    setTotalReps(prev => prev + adjustedReps);

    if ((totalReps + adjustedReps) % (30 * multiplier) === 0) {
      setDiceEarned(prev => prev + 1 * multiplier);
    }

    setTimeout(() => setCurrentCardIndex(prev => prev + 1), 500);
  };

  const endSession = () => {
    setSessionActive(false);
    alert(`Session Complete!\nReps: ${totalReps}\nCards: ${currentCardIndex + 1}\nDice: ${diceEarned}`);
    setTimeout(() => window.location.href = "/", 3000);
  };

  const replayDeck = () => {
    setMultiplier(2);
    setCurrentCardIndex(0);
    setDeck(shuffleDeck(muscleGroup));
    setSessionActive(true);
  };

  const currentCard = deck[currentCardIndex];

  return (
    <div className="burnouts-container">
      <div className="deck-view">
        {currentCardIndex < deck.length && currentCard ? (
          <div className="card">
            <h2>{currentCard.exercise}</h2>
            <p>Reps: {currentCard.reps * multiplier}</p>
            <button onClick={() => completeCard(currentCard.reps)}>Complete Card</button>
          </div>
        ) : (
          <div className="session-end">
            <h2>Deck Complete!</h2>
            <button onClick={replayDeck}>Replay x2 Rewards</button>
            <button onClick={endSession}>End Session</button>
          </div>
        )}
      </div>

      <div className="stats-panel">
        <p>Cards Completed: {currentCardIndex}</p>
        <p>Total Reps: {totalReps}</p>
        <p>Dice Earned: {diceEarned}</p>
      </div>
    </div>
  );
}
