declare module '@capacitor/camera' {
  export interface AtlasCameraPhotoV1 {
    uri?: string;
    webPath?: string;
  }

  export const Camera: {
    takePhoto(options: {
      quality?: number;
      correctOrientation?: boolean;
      cameraDirection?: 'REAR' | 'FRONT';
    }): Promise<AtlasCameraPhotoV1>;
  };
}
