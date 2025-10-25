import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import PlayerMediaHandler from "./logic/PlayerMediaHandler";
import { shuffleDeck, updateUserStats, finalizeSession } from "./logic/burnoutsHelpers";

export default function BurnoutsApp() {
  const { muscleGroup } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [poseData, setPoseData] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        window.location.href = "https://rivalishub.netlify.app";
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!user) {
    return (
      <div className="loading">
        <p>Not authenticated. Redirecting to login...</p>
      </div>
    );
  }

  return (
    <BurnoutsSession 
      userId={user.uid} 
      muscleGroup={muscleGroup} 
      poseData={poseData} 
      setPoseData={setPoseData} 
    />
  );
}

function BurnoutsSession({ userId, muscleGroup, poseData, setPoseData }) {
  const [deck, setDeck] = useState(shuffleDeck(muscleGroup));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [diceEarned, setDiceEarned] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [sessionActive, setSessionActive] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const fetchAvatar = async () => {
      const docSnap = await getDoc(doc(db, "users", userId));
      if (docSnap.exists()) setAvatarUrl(docSnap.data().avatarUrl);
    };
    fetchAvatar();
  }, [userId]);

  const completeCard = (reps) => {
    const adjustedReps = reps * multiplier;
    setTotalReps(prev => prev + adjustedReps);

    if ((totalReps + adjustedReps) % (30 * multiplier) === 0) {
      setDiceEarned(prev => prev + 1 * multiplier);
    }

    updateUserStats(userId, totalReps + adjustedReps, diceEarned, muscleGroup);

    setTimeout(() => setCurrentCardIndex(prev => prev + 1), 5000);
  };

  const endSession = () => {
    setSessionActive(false);
    finalizeSession(userId, totalReps, diceEarned, muscleGroup);

    alert(`Session Complete!\nReps: ${totalReps}\nCards: ${currentCardIndex + 1}\nDice: ${diceEarned}`);
    setTimeout(() => window.location.href = "https://rivalishub.netlify.app", 3000);
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
      <PlayerMediaHandler userId={userId} onPoseUpdate={setPoseData} />

      {avatarUrl && (
        <div className="avatar-container">
          <img src={avatarUrl} alt="User Avatar" className="burnouts-avatar" />
        </div>
      )}

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
