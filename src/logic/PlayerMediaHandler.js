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

    const updatePose = async () => {
      const poseData = mediaPose.getPoseData();
      
      if (poseData) {
        onPoseUpdate?.(poseData);
        
        if (userId) {
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
