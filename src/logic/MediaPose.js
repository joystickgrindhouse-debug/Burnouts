import { PoseLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";

export class MediaPose {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isActive = false;
    this.poseLandmarker = null;
    this.lastVideoTime = -1;
    this.landmarks = null;
    this.worldLandmarks = null;
    this.canvasElement = null;
    this.canvasCtx = null;
  }

  async init() {
    try {
      // Initialize MediaPipe Vision
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // Create PoseLandmarker
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
        minPosePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      // Set up webcam
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user"
        }
      });

      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      this.isActive = true;
      console.log("MediaPipe Pose initialized successfully");
      return true;
    } catch (error) {
      console.error("MediaPose initialization error:", error);
      return false;
    }
  }

  getPoseData() {
    if (!this.isActive || !this.videoElement || !this.poseLandmarker) {
      return null;
    }

    try {
      const currentTime = performance.now();
      
      // Only process new frames
      if (this.videoElement.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = this.videoElement.currentTime;
        
        const results = this.poseLandmarker.detectForVideo(
          this.videoElement,
          currentTime
        );

        if (results.landmarks && results.landmarks.length > 0) {
          this.landmarks = results.landmarks[0];
          this.worldLandmarks = results.worldLandmarks?.[0] || null;

          // Calculate pose-based metrics
          const poseMetrics = this.calculatePoseMetrics(this.landmarks);

          return {
            landmarks: this.landmarks,
            worldLandmarks: this.worldLandmarks,
            ...poseMetrics,
            updatedAt: Date.now(),
            isDetected: true
          };
        }
      }

      return {
        landmarks: null,
        worldLandmarks: null,
        isDetected: false,
        updatedAt: Date.now()
      };
    } catch (error) {
      console.error("Error getting pose data:", error);
      return null;
    }
  }

  calculatePoseMetrics(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return {
        rotationY: 0,
        positionY: 0,
        activity: 0
      };
    }

    // Get key body points
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];

    // Calculate body rotation (based on shoulder alignment)
    const shoulderDiff = leftShoulder.x - rightShoulder.x;
    const rotationY = Math.max(-1, Math.min(1, shoulderDiff * 2));

    // Calculate vertical position (based on hip height)
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    const positionY = Math.max(-1, Math.min(1, (0.6 - avgHipY) * 2));

    // Calculate activity level (movement intensity)
    const shoulderMidpoint = {
      x: (leftShoulder.x + rightShoulder.x) / 2,
      y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipMidpoint = {
      x: (leftHip.x + rightHip.x) / 2,
      y: (leftHip.y + rightHip.y) / 2
    };
    
    const torsoLength = Math.sqrt(
      Math.pow(shoulderMidpoint.x - hipMidpoint.x, 2) +
      Math.pow(shoulderMidpoint.y - hipMidpoint.y, 2)
    );
    
    const activity = Math.max(0, Math.min(1, torsoLength * 3));

    return {
      rotationY,
      positionY,
      activity,
      bodyPoints: {
        nose: { x: nose.x, y: nose.y, z: nose.z },
        leftShoulder: { x: leftShoulder.x, y: leftShoulder.y, z: leftShoulder.z },
        rightShoulder: { x: rightShoulder.x, y: rightShoulder.y, z: rightShoulder.z },
        leftHip: { x: leftHip.x, y: leftHip.y, z: leftHip.z },
        rightHip: { x: rightHip.x, y: rightHip.y, z: rightHip.z }
      }
    };
  }

  // Setup canvas for visualization
  setupCanvas(canvasElement) {
    this.canvasElement = canvasElement;
    this.canvasCtx = canvasElement.getContext("2d");
  }

  // Get video element for rendering
  getVideoElement() {
    return this.videoElement;
  }

  drawPose() {
    if (!this.canvasElement || !this.canvasCtx || !this.videoElement) {
      return;
    }

    const ctx = this.canvasCtx;
    const canvas = this.canvasElement;

    // Draw video frame first (mirrored for natural view)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(this.videoElement, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    // Draw skeleton overlay if landmarks detected
    if (this.landmarks && this.landmarks.length > 0) {
      const drawingUtils = new DrawingUtils(ctx);

      // Draw connectors (skeleton lines)
      drawingUtils.drawConnectors(
        this.landmarks,
        PoseLandmarker.POSE_CONNECTIONS,
        { color: "#00FF00", lineWidth: 3 }
      );

      // Draw landmarks (joint points)
      drawingUtils.drawLandmarks(this.landmarks, {
        radius: 6,
        fillColor: "#FF4444",
        color: "#FFFFFF",
        lineWidth: 2
      });
    }
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    if (this.poseLandmarker) {
      this.poseLandmarker.close();
      this.poseLandmarker = null;
    }
    this.isActive = false;
    console.log("MediaPipe Pose stopped");
  }
}
