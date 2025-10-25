import { useEffect, useRef } from "react";
import "../styles/PoseVisualizer.css";

export default function PoseVisualizer({ mediaPose }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!mediaPose || !canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 640;
    canvas.height = 480;
    
    // Setup canvas for MediaPose to draw on
    mediaPose.setupCanvas(canvas);

    const animate = () => {
      mediaPose.drawPose();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mediaPose]);

  return (
    <div className="pose-visualizer">
      <canvas ref={canvasRef} className="pose-canvas" />
      <div className="pose-status">
        <span className="status-indicator"></span>
        Pose Tracking Active
      </div>
    </div>
  );
}
