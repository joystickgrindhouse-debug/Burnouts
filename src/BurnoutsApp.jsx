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

  // Initialize first card
  useEffect(() => {
    if (deck.length === 0) {
       setDeck(shuffleDeck(muscleGroup));
    }
  }, [muscleGroup, deck.length]);

  const completeCard = (reps) => {
    const adjustedReps = reps * multiplier;
    const newTotalReps = totalReps + adjustedReps;
    setTotalReps(newTotalReps);

    // Reward logic: 1 dice per 30 reps (scaled by multiplier if applicable, 
    // but the prompt says 1 dice per 30 reps)
    const newDiceEarned = Math.floor(newTotalReps / 30);
    setDiceEarned(newDiceEarned);

    // Visual feedback delay before next card
    setTimeout(() => {
      if (currentCardIndex + 1 < deck.length) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        // Deck complete handled in render
      }
    }, 1500);
  };

  const endSession = () => {
    setSessionActive(false);
    alert(`Session Complete!\nTotal Reps: ${totalReps}\nDice Earned: ${diceEarned}`);
    window.location.href = "/burnouts";
  };

  const replayDeck = () => {
    setMultiplier(prev => prev * 2);
    setCurrentCardIndex(0);
    setDeck(shuffleDeck(muscleGroup));
    setSessionActive(true);
  };

  const currentCard = deck[currentCardIndex];

  return (
    <div className="burnouts-container">
      <div className="header-stats">
        <div className="stat-item">
          <span className="label">REPS:</span>
          <span className="value">{totalReps}</span>
        </div>
        <div className="stat-item">
          <span className="label">DICE:</span>
          <span className="value">{diceEarned}</span>
        </div>
      </div>

      <div className="deck-view">
        {sessionActive && currentCardIndex < deck.length && currentCard ? (
          <div className="card-container">
            <div className={`card-face ${currentCard.category.toLowerCase()}`}>
              <div className="card-header">
                 <span className="suit">{getSuitSymbol(currentCard.suit)}</span>
                 <span className="face-value">{currentCard.face}</span>
              </div>
              <div className="card-body">
                <h2 className="exercise-name">{currentCard.exercise}</h2>
                <div className="rep-target">
                  <span className="target-label">GOAL</span>
                  <span className="target-value">{currentCard.reps * multiplier}</span>
                </div>
              </div>
              <button className="complete-btn" onClick={() => completeCard(currentCard.reps)}>
                COMPLETE CARD
              </button>
            </div>
          </div>
        ) : (
          <div className="session-end">
            <h2 className="glow-text">DECK COMPLETE! 💪</h2>
            <div className="action-buttons">
              <button className="replay-btn" onClick={replayDeck}>REPLAY (x{multiplier * 2} REWARDS)</button>
              <button className="end-btn" onClick={endSession}>END SESSION</button>
            </div>
          </div>
        )}
      </div>

      <div className="footer-info">
         <p>Exercise {currentCardIndex + 1} of {deck.length}</p>
         <p>Muscle Group: {muscleGroup}</p>
      </div>
    </div>
  );
}

function getSuitSymbol(suit) {
  switch(suit) {
    case 'Spades': return '♠';
    case 'Hearts': return '♥';
    case 'Clubs': return '♣';
    case 'Diamonds': return '♦';
    default: return '';
  }
}
