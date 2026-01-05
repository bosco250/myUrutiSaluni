import { api } from './api';
import * as ImageManipulator from 'expo-image-manipulator';

export interface FaceAnalysis {
  faceShape: 'Oval' | 'Round' | 'Square' | 'Heart' | 'Oblong' | 'Diamond';
  analysisDescription: string;
  recommendations: StyleRecommendation[];
  stylingTips: string[];
}

export interface StyleRecommendation {
  id: string;
  name: string;
  matchPercentage: number;
  description: string;
  imageSearchTerm?: string;
  imageUrl?: string | null;
}

class AIService {
  /**
   * Compress and resize image to reduce file size
   */
  private async compressImage(uri: string, maxWidth: number = 800): Promise<string> {
    try {
      // Use expo-image-manipulator to resize and convert to JPEG
      // Resize to max width - height will be calculated automatically to maintain aspect ratio
      // Converting to JPEG format alone significantly reduces file size
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width: maxWidth } }, // Resize maintaining aspect ratio
        ],
        {
          format: ImageManipulator.SaveFormat.JPEG, // Convert to JPEG for better compression
        }
      );
      
      return manipulatedImage.uri;
    } catch (error: any) {
      console.warn('Image manipulation failed, using original:', error);
      return uri; // Fallback to original if manipulation fails
    }
  }

  /**
   * Analyze face from image URI
   * Converts image to base64 (with compression) and sends to backend
   */
  async analyzeFace(photoUri: string): Promise<FaceAnalysis> {
    try {
      // Compress and resize image first to reduce size (max 800px width, JPEG format)
      const compressedUri = await this.compressImage(photoUri, 800);
      
      // Convert image URI to base64 using fetch
      const response = await fetch(compressedUri);
      const blob = await response.blob();
      
      // Convert blob to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Remove data URL prefix (data:image/jpeg;base64,)
          const base64Data = base64String.split(',')[1] || base64String;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Check size
      const sizeInBytes = (base64.length * 3) / 4;
      if (sizeInBytes > 1000000) { // 1MB
        console.warn('Image is still large after compression:', Math.round(sizeInBytes / 1024), 'KB');
      }

      // Determine MIME type
      const mimeType = 'image/jpeg'; // Always JPEG after compression

      // Create data URL
      const imageData = `data:${mimeType};base64,${base64}`;

      // Send to backend
      const apiResponse = await api.post<FaceAnalysis>(
        '/ai/analyze-face-base64',
        { image: imageData }
      );

      return apiResponse;
    } catch (error: any) {
      console.error('Error analyzing face:', error);
      throw new Error(error.message || 'Failed to analyze face');
    }
  }
}

export const aiService = new AIService();

