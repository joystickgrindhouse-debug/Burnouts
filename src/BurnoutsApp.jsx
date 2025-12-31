import { useState, useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signInWithCustomToken } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { shuffleDeck, updateUserStats, finalizeSession } from "./logic/burnoutsHelpers";
import PoseVisualizer from "./components/PoseVisualizer";

// Angle calculation utility from uploaded app.js
function calculateAngle(a, b, c) {
    if (!a || !b || !c) return -1;
    const threshold = 0.2;
    if (a.visibility < threshold || b.visibility < threshold || c.visibility < threshold) {
        return -1; 
    }
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

function calculateDistance(a, b) {
    if (!a || !b) return 0;
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export default function BurnoutsApp() {
    const { muscleGroup } = useParams();
    const [searchParams] = useSearchParams();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            signInWithCustomToken(auth, token).catch((error) => {
                console.error('Error signing in with token:', error);
                setAuthError(error.message);
            });
        }
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [searchParams]);

    if (loading) return <div className="loading">LOADING...</div>;
    if (!user) return <div className="loading">AUTHENTICATING...</div>;

    return <BurnoutsSession userId={user.uid} muscleGroup={muscleGroup} />;
}

function BurnoutsSession({ userId, muscleGroup }) {
    const [deck, setDeck] = useState(shuffleDeck(muscleGroup));
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [totalReps, setTotalReps] = useState(0);
    const [currentReps, setCurrentReps] = useState(0);
    const [diceEarned, setDiceEarned] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [sessionActive, setSessionActive] = useState(true);
    const [feedback, setFeedback] = useState("Get Ready");
    const [avatarUrl, setAvatarUrl] = useState(null);
    
    const exerciseState = useRef('UP');
    const lastHighKneeLeg = useRef(null);
    const burpeeStep = useRef(0);
    const baseY = useRef(null);
    const plankStartTime = useRef(null);

    const currentCard = deck[currentCardIndex];

    useEffect(() => {
        const fetchAvatar = async () => {
            const docSnap = await getDoc(doc(db, "users", userId));
            if (docSnap.exists()) setAvatarUrl(docSnap.data().avatarUrl);
        };
        fetchAvatar();
    }, [userId]);

    const processPose = (landmarks) => {
        if (!currentCard || !sessionActive) return;

        const exerciseId = currentCard.exercise.toLowerCase().replace(/[\s-]/g, '');
        let repIncrement = 0;
        let newFeedback = feedback;

        switch (exerciseId) {
            case 'pushup':
            case 'plankupdown':
            case 'pikepushup': {
                const leftAngle = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
                const rightAngle = calculateAngle(landmarks[12], landmarks[14], landmarks[16]);
                const angle = leftAngle !== -1 && rightAngle !== -1 ? Math.max(leftAngle, rightAngle) : (leftAngle !== -1 ? leftAngle : rightAngle);

                if (angle === -1) {
                    newFeedback = 'Align side to camera';
                } else if (angle > 140) {
                    if (exerciseState.current === 'DOWN') {
                        exerciseState.current = 'UP';
                        repIncrement = 1;
                        newFeedback = 'Good rep!';
                    } else {
                        newFeedback = 'Go down';
                    }
                } else if (angle < 110) {
                    exerciseState.current = 'DOWN';
                    newFeedback = 'Push up!';
                }
                break;
            }
            case 'squats':
            case 'glutebridges': {
                const leftAngle = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
                const rightAngle = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
                const angle = leftAngle !== -1 && rightAngle !== -1 ? Math.min(leftAngle, rightAngle) : (leftAngle !== -1 ? leftAngle : rightAngle);

                if (angle === -1) {
                    newFeedback = 'Legs out of view';
                } else if (angle > 145) {
                    if (exerciseState.current === 'DOWN') {
                        exerciseState.current = 'UP';
                        repIncrement = 1;
                        newFeedback = 'Good!';
                    } else {
                        newFeedback = 'Squat down';
                    }
                } else if (angle < 110) {
                    exerciseState.current = 'DOWN';
                    newFeedback = 'Drive up!';
                }
                break;
            }
            case 'plank': {
                const hipAngle = calculateAngle(landmarks[11], landmarks[23], landmarks[27]);
                if (hipAngle === -1) {
                    newFeedback = 'Body out of view';
                } else if (hipAngle > 165) {
                    if (!plankStartTime.current) plankStartTime.current = Date.now();
                    const seconds = Math.floor((Date.now() - plankStartTime.current) / 1000);
                    if (seconds > currentReps) repIncrement = seconds - currentReps;
                    newFeedback = 'Hold it!';
                } else {
                    plankStartTime.current = null;
                    newFeedback = 'Lower hips';
                }
                break;
            }
            case 'jumpingjacks': {
                const nose = landmarks[0];
                const handsUp = landmarks[15].y < nose.y && landmarks[16].y < nose.y;
                const feetWide = calculateDistance(landmarks[27], landmarks[28]) > 0.4;
                if (handsUp && feetWide) {
                    exerciseState.current = 'UP';
                    newFeedback = 'Back in';
                } else if (!handsUp && !feetWide) {
                    if (exerciseState.current === 'UP') {
                        exerciseState.current = 'DOWN';
                        repIncrement = 1;
                        newFeedback = 'Nice!';
                    } else {
                        newFeedback = 'Jump!';
                    }
                }
                break;
            }
            case 'lunges': {
                const lKnee = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
                const rKnee = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
                if (lKnee === -1 || rKnee === -1) {
                    newFeedback = 'Show legs';
                } else if (lKnee < 115 || rKnee < 115) {
                    exerciseState.current = 'DOWN';
                    newFeedback = 'Up';
                } else if (lKnee > 145 && rKnee > 145) {
                    if (exerciseState.current === 'DOWN') {
                        exerciseState.current = 'UP';
                        repIncrement = 1;
                        newFeedback = 'Good!';
                    }
                }
                break;
            }
            case 'crunches':
            case 'legraises': {
                const shoulder = landmarks[11];
                const knee = landmarks[25];
                const hip = landmarks[23];
                const dist = calculateDistance(shoulder, knee);
                const ref = calculateDistance(hip, knee);
                if (dist < ref * 1.3) {
                    exerciseState.current = 'IN';
                    newFeedback = 'Down';
                } else if (dist > ref * 1.5 && exerciseState.current === 'IN') {
                    exerciseState.current = 'OUT';
                    repIncrement = 1;
                    newFeedback = 'Crunch!';
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
                    newFeedback = 'Next!';
                } else if (rUp && lastHighKneeLeg.current !== 'right') {
                    lastHighKneeLeg.current = 'right';
                    repIncrement = 0.5;
                    newFeedback = 'Next!';
                } else {
                    newFeedback = 'Knees high';
                }
                break;
            }
            case 'burpees': {
                const shoulder = landmarks[11];
                const ankle = landmarks[27];
                const isHorizontal = Math.abs(shoulder.y - ankle.y) < 0.25;
                const isVertical = shoulder.y < landmarks[23].y && Math.abs(shoulder.x - ankle.x) < 0.25;
                if (isHorizontal && burpeeStep.current === 0) {
                    burpeeStep.current = 1;
                    newFeedback = 'Up!';
                } else if (isVertical && burpeeStep.current === 1) {
                    burpeeStep.current = 0;
                    repIncrement = 1;
                    newFeedback = 'Down!';
                }
                break;
            }
            case 'shouldertaps': {
                const lTap = calculateDistance(landmarks[15], landmarks[12]) < 0.25;
                const rTap = calculateDistance(landmarks[16], landmarks[11]) < 0.25;
                if ((lTap || rTap) && exerciseState.current !== 'TAP') {
                    exerciseState.current = 'TAP';
                    repIncrement = 0.5;
                    newFeedback = 'Tap!';
                } else if (!lTap && !rTap) {
                    exerciseState.current = 'IDLE';
                    newFeedback = 'Tap shoulders';
                }
                break;
            }
            case 'calfraises': {
                const ankle = landmarks[27];
                if (!baseY.current) baseY.current = ankle.y;
                if (ankle.y < baseY.current - 0.03) {
                    exerciseState.current = 'UP';
                    newFeedback = 'Down';
                } else if (exerciseState.current === 'UP' && ankle.y > baseY.current - 0.01) {
                    exerciseState.current = 'DOWN';
                    repIncrement = 1;
                    newFeedback = 'Up';
                } else {
                    newFeedback = 'Rise';
                }
                break;
            }
            case 'russiantwists': {
                const lShoulder = landmarks[11];
                const rShoulder = landmarks[12];
                if (lShoulder.x > rShoulder.x + 0.05 && exerciseState.current !== 'LEFT') {
                    exerciseState.current = 'LEFT';
                    repIncrement = 0.5;
                    newFeedback = 'Right';
                } else if (rShoulder.x > lShoulder.x + 0.05 && exerciseState.current !== 'RIGHT') {
                    exerciseState.current = 'RIGHT';
                    repIncrement = 0.5;
                    newFeedback = 'Left';
                } else {
                    newFeedback = 'Twist';
                }
                break;
            }
            default:
                break;
        }

        if (repIncrement > 0) handleRep(repIncrement);
        setFeedback(newFeedback);
    };

    const handleRep = (inc) => {
        const next = currentReps + inc;
        const target = currentCard.reps * multiplier;
        if (next >= target) {
            completeCard();
            setCurrentReps(target);
        } else {
            setCurrentReps(next);
        }
        const newTotalReps = totalReps + inc;
        setTotalReps(newTotalReps);
        
        // Reward logic: 1 dice per 30 reps based on total session reps
        const newDice = Math.floor(newTotalReps / 30);
        if (newDice > diceEarned) {
            setDiceEarned(newDice);
            // Sync immediately with Firebase
            updateUserStats(userId, newTotalReps, newDice, muscleGroup);
        }
    };

    const completeCard = () => {
        setFeedback("TARGET REACHED! 💪");
        setTimeout(() => {
            if (currentCardIndex + 1 < deck.length) {
                setCurrentCardIndex(prev => prev + 1);
                setCurrentReps(0);
                exerciseState.current = 'UP';
                lastHighKneeLeg.current = null;
                burpeeStep.current = 0;
                baseY.current = null;
                plankStartTime.current = null;
                setFeedback("Get Ready");
            } else {
                setSessionActive(false);
                finalizeSession(userId, totalReps, diceEarned, muscleGroup);
            }
        }, 1500);
    };

    const endSession = () => {
        finalizeSession(userId, totalReps, diceEarned, muscleGroup);
        alert(`Session Complete!\nTotal Reps: ${Math.floor(totalReps)}\nDice Earned: ${diceEarned}`);
        window.location.href = "https://rivalishub1.netlify.app/";
    };

    return (
        <div className="burnouts-container">
            <button className="home-button" onClick={() => window.location.href = 'https://rivalishub1.netlify.app/'}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </button>
            <div className="header-stats">
                {avatarUrl && (
                  <div className="stat-item avatar-item">
                    <img src={avatarUrl} alt="Avatar" className="user-avatar-small" />
                  </div>
                )}
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
                            <button className="finish-session-btn" onClick={endSession}>FINISH SESSION</button>
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
