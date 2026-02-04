import React, { useEffect, useRef, useState } from 'react';

export default function PoseVisualizer({ onPoseResults, currentExercise }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);

    const onPoseResultsRef = useRef(onPoseResults);
    useEffect(() => {
        onPoseResultsRef.current = onPoseResults;
    }, [onPoseResults]);

    const calculateAngle = (a, b, c) => {
        if (!a || !b || !c) return -1;
        const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
        let angle = Math.abs(radians * 180.0 / Math.PI);
        if (angle > 180.0) angle = 360 - angle;
        return angle;
    };

    const [referencePose, setReferencePose] = useState(null);
    const [exerciseData, setExerciseData] = useState(null);

    useEffect(() => {
        if (currentExercise) {
            const loadExerciseData = async () => {
                try {
                    // Normalize filename to match the pattern in attached_assets
                    const filename = currentExercise.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                    const response = await fetch(`/attached_assets/${filename}_1770088861789.json`);
                    if (!response.ok) {
                        const altResponse = await fetch(`/attached_assets/${filename}_1770088861786.json`);
                        if (altResponse.ok) {
                            const data = await altResponse.json();
                            setExerciseData(data);
                            return;
                        }
                        const rawResponse = await fetch(`/attached_assets/${filename}.json`);
                        if (rawResponse.ok) {
                            const data = await rawResponse.json();
                            setExerciseData(data);
                            return;
                        }
                    }
                    const data = await response.json();
                    setExerciseData(data);
                } catch (err) {
                    console.error("Failed to load exercise data:", err);
                }
            };
            loadExerciseData();
        }
    }, [currentExercise]);

    useEffect(() => {
        let pose;
        let camera;
        let isMounted = true;
        let lastFrameTime = 0;
        let startTime = Date.now();
        const targetFPS = 20;
        const frameInterval = 1000 / targetFPS;

        const initMediaPipe = async () => {
            try {
                // MediaPipe CDNs
                const scripts = [
                    'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js',
                    'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
                    'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js'
                ];

                for (const src of scripts) {
                    if (!document.querySelector(`script[src="${src}"]`)) {
                        const script = document.createElement('script');
                        script.src = src;
                        script.async = false;
                        document.head.appendChild(script);
                        await new Promise((resolve, reject) => {
                            script.onload = resolve;
                            script.onerror = reject;
                        });
                    }
                }

                if (!isMounted) return;
                setLoading(false);

                if (window.Pose) {
                    pose = new window.Pose({
                        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
                    });

                    pose.setOptions({
                        modelComplexity: 1,
                        smoothLandmarks: true,
                        minDetectionConfidence: 0.5,
                        minTrackingConfidence: 0.5
                    });

                    pose.onResults((results) => {
                        if (!isMounted || !results.image || !canvasRef.current) return;
                        
                        const canvas = canvasRef.current;
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = videoRef.current.videoWidth || 640;
                        canvas.height = videoRef.current.videoHeight || 480;

                        ctx.save();
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                            // Draw Reference Skeleton (Overlay)
                            if (exerciseData) {
                                const elapsed = (Date.now() - startTime) / 1000;
                                const frameIndex = Math.floor((elapsed * exerciseData.fps) % exerciseData.frames.length);
                                const refFrame = exerciseData.frames[frameIndex];
                                
                                if (refFrame && refFrame.aQ) {
                                    ctx.save();
                                    ctx.globalAlpha = 0.4;
                                    ctx.strokeStyle = '#ffffff';
                                    ctx.lineWidth = 4;
                                    ctx.setLineDash([5, 5]); // Dashed line for ghost
                                    
                                    const connections = [
                                        [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], 
                                        [11, 23], [12, 24], [23, 24], 
                                        [23, 25], [25, 27], [24, 26], [26, 28]
                                    ];

                                    // Since we don't have full landmark positions in the JSON (only angles/dists),
                                    // we can't draw a full ghost without a forward kinematics model.
                                    // For now, we provide visual feedback via the skeleton color.
                                    ctx.restore();
                                }
                            }

                        if (results.poseLandmarks) {
                            const connections = [
                                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], 
                                [11, 23], [12, 24], [23, 24], 
                                [23, 25], [25, 27], [24, 26], [26, 28]
                            ];

                            // Check accuracy against reference
                            let isAccurate = true;
                            if (exerciseData) {
                                const elapsed = (Date.now() - startTime) / 1000;
                                const frameIndex = Math.floor((elapsed * exerciseData.fps) % exerciseData.frames.length);
                                const refFrame = exerciseData.frames[frameIndex];
                                
                                if (refFrame && refFrame.aQ) {
                                    // Calculate current angles
                                    const joints = [
                                        [11, 13, 15], // Left Elbow
                                        [12, 14, 16], // Right Elbow
                                        [23, 25, 27], // Left Knee
                                        [24, 26, 28], // Right Knee
                                    ];

                                    const threshold = 20; // Degrees threshold for master JSON
                                    joints.forEach((joint, idx) => {
                                        const angle = calculateAngle(
                                            results.poseLandmarks[joint[0]],
                                            results.poseLandmarks[joint[1]],
                                            results.poseLandmarks[joint[2]]
                                        );
                                        const refAngle = refFrame.aQ[idx];
                                        if (refAngle !== null && Math.abs(angle - refAngle) > threshold) {
                                            isAccurate = false;
                                        }
                                    });
                                }
                            }
                            
                            const skeletonColor = isAccurate ? '#00ff88' : '#ff4444';
                            ctx.strokeStyle = skeletonColor;
                            ctx.lineWidth = 3;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            
                            ctx.beginPath();
                            connections.forEach(([i, j]) => {
                                const p1 = results.poseLandmarks[i];
                                const p2 = results.poseLandmarks[j];
                                if (p1 && p2 && p1.visibility > 0.1 && p2.visibility > 0.1) {
                                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                                }
                            });
                            ctx.stroke();

                            if (window.drawLandmarks) {
                                window.drawLandmarks(ctx, results.poseLandmarks, {
                                    color: '#ffffff',
                                    fillColor: skeletonColor,
                                    lineWidth: 1,
                                    radius: 2
                                });
                            }

                            if (onPoseResultsRef.current) {
                                onPoseResultsRef.current(results.poseLandmarks);
                            }
                        }
                        ctx.restore();
                    });

                if (window.Camera && videoRef.current) {
                    camera = new window.Camera(videoRef.current, {
                        onFrame: async () => {
                            if (!isMounted) return;
                            const now = Date.now();
                            if (now - lastFrameTime < frameInterval) return;
                            lastFrameTime = now;
                            
                            if (pose) await pose.send({ image: videoRef.current });
                        },
                        width: 640,
                        height: 480
                    });
                    await camera.start();
                }
                }
            } catch (error) {
                console.error("Pose tracker initialization failed:", error);
            }
        };

        initMediaPipe();

        return () => {
            isMounted = false;
            if (camera) camera.stop();
            if (pose) pose.close();
        };
    }, []); // Only run on mount and unmount

    return (
        <div className="pose-visualizer-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            {loading && (
                <div className="pose-loading" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: '#ff4444',
                    zIndex: 10,
                    fontWeight: '900',
                    letterSpacing: '2px'
                }}>
                    INITIALIZING AI TRACKER...
                </div>
            )}
            <video ref={videoRef} className="input-video" playsInline style={{ display: 'none' }} />
            <canvas ref={canvasRef} className="output-canvas" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
    );
}
