import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { MediaPose } from "./MediaPose";

export default function PlayerMediaHandler({ userId, onPoseUpdate }) {
  const [mediaPose, setMediaPose] = useState(null);

  useEffect(() => {
    const pose = new MediaPose();
    
    const init = async () => {
      const success = await pose.init();
      if (success) {
        setMediaPose(pose);
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
    if (!mediaPose) return;

    let lastFirestoreUpdate = 0;
    const FIRESTORE_THROTTLE_MS = 2000;

    const updatePose = async () => {
      const poseData = mediaPose.getPoseData();
      
      if (poseData) {
        onPoseUpdate?.(poseData);
        
        const now = Date.now();
        if (userId && (now - lastFirestoreUpdate) >= FIRESTORE_THROTTLE_MS) {
          lastFirestoreUpdate = now;
          try {
            await setDoc(doc(db, "poseData", userId), poseData, { merge: true });
          } catch (error) {
            console.error("Error updating pose data:", error);
          }
        }
      }
      
      requestAnimationFrame(updatePose);
    };
    
    updatePose();
  }, [mediaPose, userId, onPoseUpdate]);

  return null;
}
