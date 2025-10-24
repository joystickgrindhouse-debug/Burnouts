export class MediaPose {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.isActive = false;
    this.canvas = null;
    this.context = null;
    this.previousImageData = null;
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
      
      this.canvas = document.createElement("canvas");
      this.canvas.width = 640;
      this.canvas.height = 480;
      this.context = this.canvas.getContext("2d");
      
      this.isActive = true;
      
      return true;
    } catch (error) {
      console.error("MediaPose initialization error:", error);
      return false;
    }
  }

  getPoseData() {
    if (!this.isActive || !this.videoElement || !this.context) {
      return null;
    }

    try {
      this.context.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
      const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
      
      let changedPixels = 0;
      let totalMotion = 0;
      const THRESHOLD = 30;
      
      if (this.previousImageData) {
        const numPixels = imageData.data.length / 4;
        
        for (let i = 0; i < imageData.data.length; i += 4) {
          const rDiff = Math.abs(imageData.data[i] - this.previousImageData.data[i]);
          const gDiff = Math.abs(imageData.data[i + 1] - this.previousImageData.data[i + 1]);
          const bDiff = Math.abs(imageData.data[i + 2] - this.previousImageData.data[i + 2]);
          const avgDiff = (rDiff + gDiff + bDiff) / 3;
          
          if (avgDiff > THRESHOLD) {
            changedPixels++;
            totalMotion += avgDiff;
          }
        }
        
        const motionPercentage = changedPixels / numPixels;
        const avgIntensity = changedPixels > 0 ? (totalMotion / changedPixels) / 255 : 0;
        
        this.previousImageData = imageData;

        const rotationY = Math.min(Math.max((motionPercentage * 50) - 1.5, -1), 1);
        const positionY = Math.min(Math.max(((avgIntensity - 0.1) / 0.2), -1), 1);

        return {
          rotationY,
          positionY,
          updatedAt: Date.now(),
        };
      }
      
      this.previousImageData = imageData;
      
      return {
        rotationY: 0,
        positionY: 0,
        updatedAt: Date.now(),
      };
    } catch (error) {
      console.error("Error getting pose data:", error);
      return null;
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
    this.isActive = false;
  }
}
