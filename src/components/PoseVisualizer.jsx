import React, { useEffect, useRef, useState } from 'react';

export default function PoseVisualizer({ onPoseResults, currentExercise }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let pose;
        let camera;
        let isMounted = true;

        const initMediaPipe = async () => {
            try {
                // MediaPipe CDNs as used in the uploaded app.js
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

                    // Configuration from uploaded app.js
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
                        
                        // Mirroring as per uploaded code
                        ctx.translate(canvas.width, 0);
                        ctx.scale(-1, 1);
                        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

                        if (results.poseLandmarks) {
                            // Skeleton connectors from uploaded code
                            const connections = [
                                [11, 12], [11, 13], [13, 15], [12, 14], [14, 16], 
                                [11, 23], [12, 24], [23, 24], 
                                [23, 25], [25, 27], [24, 26], [26, 28], 
                                [27, 31], [28, 32], [27, 29], [28, 30] 
                            ];

                            ctx.strokeStyle = '#00FF88';
                            ctx.lineWidth = 4;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            
                            connections.forEach(([i, j]) => {
                                const p1 = results.poseLandmarks[i];
                                const p2 = results.poseLandmarks[j];
                                if (p1 && p2 && p1.visibility > 0.1 && p2.visibility > 0.1) {
                                    ctx.beginPath();
                                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                                    ctx.stroke();
                                }
                            });

                            if (window.drawLandmarks) {
                                window.drawLandmarks(ctx, results.poseLandmarks, {
                                    color: '#FF4444',
                                    lineWidth: 1,
                                    radius: 3
                                });
                            }

                            if (onPoseResults) {
                                onPoseResults(results.poseLandmarks);
                            }
                        }
                        ctx.restore();
                    });

                    if (window.Camera && videoRef.current) {
                        camera = new window.Camera(videoRef.current, {
                            onFrame: async () => {
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
    }, [onPoseResults]);

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
