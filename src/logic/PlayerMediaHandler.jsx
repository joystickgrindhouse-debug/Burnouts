import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { MediaPose } from "./MediaPose";
import PoseVisualizer from "../components/PoseVisualizer";

export default function PlayerMediaHandler({ userId, onPoseUpdate }) {
  const [mediaPose, setMediaPose] = useState(null);
  const [poseReady, setPoseReady] = useState(false);

  useEffect(() => {
    const pose = new MediaPose();
    
    const init = async () => {
      console.log("Initializing MediaPipe Pose...");
      const success = await pose.init();
      if (success) {
        console.log("MediaPipe Pose ready!");
        setMediaPose(pose);
        setPoseReady(true);
      } else {
        console.error("Failed to initialize MediaPipe Pose");
      }
    };
    
    init();

    return () => {
      if (pose) {
        pose.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!mediaPose || !poseReady) return;

    let lastFirestoreUpdate = 0;
    const FIRESTORE_THROTTLE_MS = 2000;
    let animationFrameId;

    const updatePose = async () => {
      const poseData = mediaPose.getPoseData();
      
      if (poseData && poseData.isDetected) {
        // Update parent component with pose data
        onPoseUpdate?.(poseData);
        
        // Save to Firestore (throttled)
        const now = Date.now();
        if (userId && (now - lastFirestoreUpdate) >= FIRESTORE_THROTTLE_MS) {
          lastFirestoreUpdate = now;
          try {
            // Save essential pose metrics to Firestore
            const firestoreData = {
              rotationY: poseData.rotationY,
              positionY: poseData.positionY,
              activity: poseData.activity,
              bodyPoints: poseData.bodyPoints,
              isDetected: true,
              updatedAt: poseData.updatedAt
            };
            
            await setDoc(doc(db, "poseData", userId), firestoreData, { merge: true });
          } catch (error) {
            console.error("Error updating pose data in Firestore:", error);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(updatePose);
    };
    
    updatePose();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [mediaPose, poseReady, userId, onPoseUpdate]);

  // Show visualizer when pose is ready
  return poseReady && mediaPose ? <PoseVisualizer mediaPose={mediaPose} /> : null;
}
