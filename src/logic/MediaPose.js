export class MediaPose {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isActive = false;
  }

  async init() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480 
        } 
      });
      
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.srcObject = this.stream;
      this.isActive = true;
      
      return true;
    } catch (error) {
      console.error("MediaPose initialization error:", error);
      return false;
    }
  }

  getPoseData() {
    if (!this.isActive || !this.videoElement) {
      return null;
    }

    return {
      rotationY: Math.random() * 2 - 1,
      positionY: Math.random() * 2 - 1,
      updatedAt: Date.now(),
    };
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
    this.isActive = false;
  }
}
