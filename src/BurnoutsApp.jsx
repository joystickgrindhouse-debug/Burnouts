import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { shuffleDeck } from "./logic/burnoutsHelpers";
import PoseVisualizer from "./components/PoseVisualizer";

// Angle calculation helper
function calculateAngle(a, b, c) {
  if (!a || !b || !c) return -1;
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360 - angle;
  return angle;
}

// Distance helper
function calculateDistance(a, b) {
  if (!a || !b) return 0;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export default function BurnoutsApp() {
  const { muscleGroup } = useParams();
  const [deck, setDeck] = useState(shuffleDeck(muscleGroup));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [currentReps, setCurrentReps] = useState(0);
  const [diceEarned, setDiceEarned] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [sessionActive, setSessionActive] = useState(true);
  const [feedback, setFeedback] = useState("Get Ready");
  
  // Exercise State Machine
  const exerciseState = useRef('UP');
  const lastHighKneeLeg = useRef(null);
  const burpeeStep = useRef(0);
  const baseY = useRef(null);

  const currentCard = deck[currentCardIndex];

  // Logic map for rep counting
  const processPose = (landmarks) => {
    if (!currentCard || !sessionActive) return;

    const exercise = currentCard.exercise.toLowerCase().replace(/[\s-]/g, '');
    let repIncrement = 0;
    let newFeedback = feedback;

    switch (exercise) {
      case 'pushups':
      case 'plankupdowns':
      case 'pikepushups': {
        const angle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
        if (angle > 140 && exerciseState.current === 'DOWN') {
          exerciseState.current = 'UP';
          repIncrement = 1;
          newFeedback = "Good rep!";
        } else if (angle < 110) {
          exerciseState.current = 'DOWN';
          newFeedback = "Push up!";
        }
        break;
      }
      case 'squats':
      case 'glutebridges': {
        const angle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
        if (angle > 145 && exerciseState.current === 'DOWN') {
          exerciseState.current = 'UP';
          repIncrement = 1;
          newFeedback = "Good!";
        } else if (angle < 110) {
          exerciseState.current = 'DOWN';
          newFeedback = "Drive up!";
        }
        break;
      }
      case 'lunges': {
        const lKnee = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
        const rKnee = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
        if (lKnee > 145 && rKnee > 145 && exerciseState.current === 'DOWN') {
          exerciseState.current = 'UP';
          repIncrement = 1;
        } else if (lKnee < 115 || rKnee < 115) {
          exerciseState.current = 'DOWN';
        }
        break;
      }
      case 'jumpingjacks': {
        const handsUp = landmarks[15].y < landmarks[0].y && landmarks[16].y < landmarks[0].y;
        const feetWide = calculateDistance(landmarks[27], landmarks[28]) > 0.4;
        if (handsUp && feetWide) exerciseState.current = 'OPEN';
        else if (!handsUp && !feetWide && exerciseState.current === 'OPEN') {
          exerciseState.current = 'CLOSED';
          repIncrement = 1;
        }
        break;
      }
      case 'highknees':
      case 'mountainclimbers': {
        const lUp = landmarks[25].y < landmarks[23].y - 0.08;
        const rUp = landmarks[26].y < landmarks[24].y - 0.08;
        if (lUp && lastHighKneeLeg.current !== 'left') {
          lastHighKneeLeg.current = 'left';
          repIncrement = 0.5;
        } else if (rUp && lastHighKneeLeg.current !== 'right') {
          lastHighKneeLeg.current = 'right';
          repIncrement = 0.5;
        }
        break;
      }
      // Add more cases as needed based on MediaPose.js logic
      default:
        // Fallback for exercises without specific logic yet
        break;
    }

    if (repIncrement > 0) {
      handleRep(repIncrement);
    }
    setFeedback(newFeedback);
  };

  const handleRep = (inc) => {
    setCurrentReps(prev => {
      const next = prev + inc;
      const target = currentCard.reps * multiplier;
      if (next >= target) {
        completeCard();
        return 0;
      }
      return next;
    });
    setTotalReps(prev => prev + inc);
    
    // Dice logic
    if (Math.floor((totalReps + inc) / 30) > Math.floor(totalReps / 30)) {
      setDiceEarned(prev => prev + 1);
    }
  };

  const completeCard = () => {
    setFeedback("TARGET REACHED! 💪");
    setTimeout(() => {
      if (currentCardIndex + 1 < deck.length) {
        setCurrentCardIndex(prev => prev + 1);
        setCurrentReps(0);
        exerciseState.current = 'UP';
        setFeedback("Get Ready");
      } else {
        setSessionActive(false);
      }
    }, 1500);
  };

  const endSession = () => {
    alert(`Session Complete!\nTotal Reps: ${Math.floor(totalReps)}\nDice Earned: ${diceEarned}`);
    window.location.href = "/burnouts";
  };

  return (
    <div className="burnouts-container">
      <div className="header-stats">
        <div className="stat-item">
          <span className="label">TOTAL REPS</span>
          <span className="value">{Math.floor(totalReps)}</span>
        </div>
        <div className="stat-item">
          <span className="label">DICE</span>
          <span className="value">{diceEarned}</span>
        </div>
      </div>

      <div className="workout-layout">
        <div className="camera-panel">
          <PoseVisualizer onPoseResults={processPose} />
          <div className="feedback-overlay">{feedback}</div>
        </div>

        <div className="card-panel">
          {sessionActive && currentCard ? (
            <div className={`active-card ${currentCard.category.toLowerCase()}`}>
              <div className="card-meta">
                <span>{getSuitSymbol(currentCard.suit)}</span>
                <span>{currentCard.face}</span>
              </div>
              <div className="card-main">
                <h2>{currentCard.exercise}</h2>
                <div className="progress-circle">
                  <span className="current">{Math.floor(currentReps)}</span>
                  <span className="separator">/</span>
                  <span className="target">{currentCard.reps * multiplier}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="session-complete-ui">
              <h2>DECK COMPLETE!</h2>
              <button className="primary-btn" onClick={() => window.location.reload()}>REPLAY</button>
              <button className="secondary-btn" onClick={endSession}>FINISH</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getSuitSymbol(suit) {
  const symbols = { 'Spades': '♠', 'Hearts': '♥', 'Clubs': '♣', 'Diamonds': '♦' };
  return symbols[suit] || '';
}
