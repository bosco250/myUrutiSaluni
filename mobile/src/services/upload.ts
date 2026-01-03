import { api } from './api';
import { Platform } from 'react-native';

interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

export const uploadService = {
  /**
   * Upload an image file to the backend
   * @param uri Local file URI from image picker
   */
  async uploadAvatar(uri: string): Promise<UploadResponse> {
    // Create form data
    const formData = new FormData();
    
    // Get filename from URI
    const filename = uri.split('/').pop() || 'avatar.jpg';
    
    // Infer type from extension
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    // Append file to form data
    // React Native expects an object with uri, name, and type for file uploads
    const fileData = {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      name: filename,
      type,
    };
    
    formData.append('file', fileData as any);

    // Use fetch directly because our api wrapper handles JSON by default 
    // and we need to send multipart/form-data without setting Content-Type header manually
    // (browser/RN sets boundary automatically)
    try {
      // Get base URL from api service configuration (we need to access private method or config)
      // Since we can't easily access the config from here without circular deps if not careful,
      // let's use the API service but overload the content-type handling
      
      return await api.post<UploadResponse>('/uploads/avatar', formData, {
        headers: {
          // Explicitly undefined so browser/RN sets the boundary
          // This overrides the 'application/json' default in our api wrapper
          'Content-Type': undefined as any, 
        },
      });
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  },
  /**
   * Upload a service image to the backend
   * @param uri Local file URI from image picker
   */
  async uploadServiceImage(uri: string): Promise<UploadResponse> {
    return this.uploadAvatar(uri);
  },
};
