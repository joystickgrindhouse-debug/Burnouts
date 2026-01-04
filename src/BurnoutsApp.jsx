import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { shuffleDeck, updateUserStats, finalizeSession } from "./logic/burnoutsHelpers";
import PoseVisualizer from "./components/PoseVisualizer";

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

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
}

export default function BurnoutsApp() {
    const { muscleGroup } = useParams();
    const userId = "hub_user";
    return <BurnoutsSession userId={userId} muscleGroup={muscleGroup} />;
}

function BurnoutsSession({ userId, muscleGroup }) {
    const [deck, setDeck] = useState(shuffleDeck(muscleGroup));
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [totalReps, setTotalReps] = useState(0);
    const [currentReps, setCurrentReps] = useState(0);
    const [ticketsEarned, setTicketsEarned] = useState(0);
    const [sessionActive, setSessionActive] = useState(true);
    const [feedback, setFeedback] = useState("Get Ready");
    const [movementState, setMovementState] = useState('IDLE');
    const [avatarUrl, setAvatarUrl] = useState(null);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [cooldown, setCooldown] = useState(0);

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

    useEffect(() => {
        let interval;
        if (sessionActive) {
            interval = setInterval(() => {
                setTimeElapsed(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [sessionActive]);

    const lastAnnouncedCardIndex = useRef(-1);

    useEffect(() => {
        if (deck.length > 0 && sessionActive && cooldown === 0) {
            if (lastAnnouncedCardIndex.current !== currentCardIndex) {
                speak(`Start with ${deck[currentCardIndex].exercise}, ${deck[currentCardIndex].reps} reps.`);
                lastAnnouncedCardIndex.current = currentCardIndex;
            }
        }
    }, [currentCardIndex, cooldown, sessionActive, deck]);

    useEffect(() => {
        let timer;
        if (cooldown > 0) {
            timer = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    const next = prev - 1;
                    if (next <= 5 && !isMuted) {
                        speak(next.toString());
                    }
                    return next;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [cooldown]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const getSuitSymbol = (suit) => {
        const symbols = { 'Spades': '♠', 'Hearts': '♥', 'Clubs': '♣', 'Diamonds': '♦' };
        return symbols[suit] || '';
    };

    const completeCard = useCallback(() => {
        setFeedback("TARGET REACHED! 💪");
        if (!isMuted) speak("Target reached. 15 second cooldown starting.");
        setTimeout(() => {
            setCurrentCardIndex(prevIndex => {
                const nextIndex = prevIndex + 1;
                if (nextIndex < deck.length) {
                    setCooldown(15);
                    setCurrentReps(0);
                    exerciseState.current = 'UP';
                    lastHighKneeLeg.current = null;
                    burpeeStep.current = 0;
                    baseY.current = null;
                    plankStartTime.current = null;
                    setFeedback(`Get Ready: 15s`);
                    setMovementState('IDLE');
                    return nextIndex;
                } else {
                    setSessionActive(false);
                    finalizeSession(userId, totalReps, ticketsEarned, muscleGroup);
                    return prevIndex;
                }
            });
        }, 1500);
    }, [deck, isMuted, userId, totalReps, ticketsEarned, muscleGroup]);

    const handleRep = useCallback((inc) => {
        const next = currentReps + inc;
        const target = currentCard.reps;
        if (next >= target) {
            setCurrentReps(target);
            completeCard();
        } else {
            setCurrentReps(next);
        }
        const newTotalReps = totalReps + inc;
        setTotalReps(newTotalReps);
        
        const newTickets = Math.floor(newTotalReps / 30);
        if (newTickets > ticketsEarned) {
            setTicketsEarned(newTickets);
            updateUserStats(userId, newTotalReps, newTickets, muscleGroup);
        }

        if (Math.floor(next) > Math.floor(currentReps) && !isMuted) {
            speak(Math.floor(next).toString());
        }
    }, [currentReps, currentCard, totalReps, ticketsEarned, isMuted, userId, muscleGroup, completeCard]);

    const processPose = useCallback((landmarks) => {
        if (!currentCard || !sessionActive || cooldown > 0) return;

        const exerciseId = currentCard.exercise.toLowerCase().replace(/[\s-]/g, '');
        let repIncrement = 0;
        let newFeedback = feedback;
        let newState = movementState;

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
                        newState = 'UP';
                        repIncrement = 1;
                        newFeedback = 'Good rep!';
                    } else {
                        newState = 'UP';
                        newFeedback = 'Go down';
                    }
                } else if (angle < 110) {
                    exerciseState.current = 'DOWN';
                    newState = 'DOWN';
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
                        newState = 'UP';
                        repIncrement = 1;
                        newFeedback = 'Good!';
                    } else {
                        newState = 'UP';
                        newFeedback = 'Squat down';
                    }
                } else if (angle < 110) {
                    exerciseState.current = 'DOWN';
                    newState = 'DOWN';
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
                    if (seconds > currentReps) {
                        repIncrement = seconds - currentReps;
                    }
                    newState = 'HOLD';
                    newFeedback = 'Hold it!';
                } else {
                    plankStartTime.current = null;
                    newState = 'FORM';
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
                    newState = 'OPEN';
                    newFeedback = 'Back in';
                } else if (!handsUp && !feetWide) {
                    if (exerciseState.current === 'UP') {
                        exerciseState.current = 'DOWN';
                        newState = 'CLOSED';
                        repIncrement = 1;
                        newFeedback = 'Nice!';
                    } else {
                        newState = 'CLOSED';
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
                    newState = 'DOWN';
                    newFeedback = 'Up';
                } else if (lKnee > 145 && rKnee > 145) {
                    if (exerciseState.current === 'DOWN') {
                        exerciseState.current = 'UP';
                        newState = 'UP';
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
                    newState = 'CRUNCH';
                    newFeedback = 'Down';
                } else if (dist > ref * 1.5 && exerciseState.current === 'IN') {
                    exerciseState.current = 'OUT';
                    newState = 'OUT';
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
                    newState = 'LEFT';
                    repIncrement = 0.5;
                    newFeedback = 'Next!';
                } else if (rUp && lastHighKneeLeg.current !== 'right') {
                    lastHighKneeLeg.current = 'right';
                    newState = 'RIGHT';
                    repIncrement = 0.5;
                    newFeedback = 'Next!';
                } else {
                    newState = 'RUN';
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
                    newState = 'PLANK';
                    newFeedback = 'Up!';
                } else if (isVertical && burpeeStep.current === 1) {
                    burpeeStep.current = 0;
                    newState = 'STAND';
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
                    newState = 'TAP';
                    repIncrement = 0.5;
                    newFeedback = 'Tap!';
                } else if (!lTap && !rTap) {
                    exerciseState.current = 'IDLE';
                    newState = 'IDLE';
                    newFeedback = 'Tap shoulders';
                }
                break;
            }
            case 'calfraises': {
                const ankle = landmarks[27];
                if (!baseY.current) baseY.current = ankle.y;
                if (ankle.y < baseY.current - 0.03) {
                    exerciseState.current = 'UP';
                    newState = 'UP';
                    newFeedback = 'Down';
                } else if (exerciseState.current === 'UP' && ankle.y > baseY.current - 0.01) {
                    exerciseState.current = 'DOWN';
                    newState = 'DOWN';
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
                    newState = 'LEFT';
                    repIncrement = 0.5;
                    newFeedback = 'Right';
                } else if (rShoulder.x > lShoulder.x + 0.05 && exerciseState.current !== 'RIGHT') {
                    exerciseState.current = 'RIGHT';
                    newState = 'RIGHT';
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
        if (newFeedback !== feedback) setFeedback(newFeedback);
        if (newState !== movementState) setMovementState(newState);
    }, [currentCard, sessionActive, feedback, movementState, currentReps, handleRep]);

    return (
        <div className="burnouts-container">
            <div className="ui-layer">
                <div className="top-bar">
                    <div className="session-stats">
                        <button 
                            className="mute-toggle" 
                            onClick={() => setIsMuted(!isMuted)}
                            style={ { background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0 10px' } }
                        >
                            {isMuted ? (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                                    <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                </svg>
                            )}
                        </button>
                        <div className="stat-item">
                            <span className="stat-label">TOTAL REPS</span>
                            <span className="stat-value">{Math.floor(totalReps)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">TICKETS</span>
                            <span className="stat-value">{ticketsEarned}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">TIME</span>
                            <span className="stat-value">{formatTime(timeElapsed)}</span>
                        </div>
                    </div>
                    <div className="status-badge active">📷 LIVE</div>
                </div>

                <div className="stats-container">
                    <div className="counter-box">
                        <span className="big-number">{Math.floor(currentReps)}</span>
                        <span className="label">REPS</span>
                    </div>
                    <div className="feedback-box">
                        <div className="state-indicator">{cooldown > 0 ? 'COOLDOWN' : movementState}</div>
                        <div className="sub-text">{cooldown > 0 ? `Get Ready: ${cooldown}s` : feedback}</div>
                    </div>
                </div>

                <div className="controls">
                    <button className="primary-btn" onClick={() => navigate('/burnouts')}>STOP SESSION</button>
                </div>

                {sessionActive && currentCard && (
                    <div className="card-display">
                        <div className="card-header">
                            <span>{getSuitSymbol(currentCard.suit)}</span>
                            <span>{currentCard.face}</span>
                        </div>
                        <div className="card-body">
                            <h2 id="card-exercise-name">{currentCard.exercise.toUpperCase()}</h2>
                            <div className="progress-container">
                                <div 
                                    className="progress-bar" 
                                    style={ { width: `${(currentReps / currentCard.reps) * 100}%` } }
                                ></div>
                            </div>
                            <span className="target-text">TARGET: {currentCard.reps}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="camera-panel">
                <PoseVisualizer onPoseResults={processPose} />
            </div>
        </div>
    );
}
