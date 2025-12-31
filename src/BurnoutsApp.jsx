import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { shuffleDeck } from "./logic/burnoutsHelpers";
import PoseVisualizer from "./components/PoseVisualizer";

// Angle calculation utility from uploaded app.js
function calculateAngle(a, b, c) {
    if (!a || !b || !c) return -1;
    // Using visibility threshold from uploaded CONFIG
    const threshold = 0.2;
    if (a.visibility < threshold || b.visibility < threshold || c.visibility < threshold) {
        return -1; 
    }
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

// Distance utility from uploaded app.js
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
    
    // Exercise State Machine Refs (Matching logic from uploaded app.js classes)
    const exerciseState = useRef('UP');
    const lastHighKneeLeg = useRef(null);
    const burpeeStep = useRef(0);
    const baseY = useRef(null);
    const plankStartTime = useRef(null);

    const currentCard = deck[currentCardIndex];

    const processPose = (landmarks) => {
        if (!currentCard || !sessionActive) return;

        // Normalize exercise name for matching
        const exerciseId = currentCard.exercise.toLowerCase().replace(/[\s-]/g, '');
        let repIncrement = 0;
        let newFeedback = feedback;

        // IMPLEMENTING FULL LOGIC FROM UPLOADED app.js
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
                    // Special case for static hold
                    if (seconds > currentReps) {
                        repIncrement = seconds - currentReps;
                    }
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
                return target;
            }
            return next;
        });
        setTotalReps(prev => prev + inc);
        
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
                // Reset exercise specific states
                exerciseState.current = 'UP';
                lastHighKneeLeg.current = null;
                burpeeStep.current = 0;
                baseY.current = null;
                plankStartTime.current = null;
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
