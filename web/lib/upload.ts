import api from './api';

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  contentType: string;
  size: number;
}

/**
 * Upload service for handling file uploads (avatars, images, etc.)
 * Ensures cross-platform compatibility between web and mobile
 */
export const uploadService = {
  /**
   * Upload an avatar image
   * @param file File object from input[type="file"]
   * @returns Upload response with URL
   */
  async uploadAvatar(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading avatar...', { name: file.name, size: file.size, type: file.type });

      const response = await api.post<UploadResponse>('/uploads/avatar', formData, {
        headers: {
          // Let browser set Content-Type with boundary for FormData
          'Content-Type': undefined as any,
        },
      });

      console.log('Avatar uploaded successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Avatar upload failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload avatar');
    }
  },

  /**
   * Get full avatar URL from relative path
   * Ensures consistency between web and mobile
   * @param avatarUrl Relative or full URL
   * @returns Full URL or null
   */
  getAvatarUrl(avatarUrl?: string | null): string | null {
    if (!avatarUrl) return null;

    // If already a full URL (data: or http/https), return as-is
    if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }

    // Get API base URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://161.97.148.53:4000/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');

    // Construct full URL
    const fullUrl = `${baseUrl}${avatarUrl.startsWith('/') ? avatarUrl : '/' + avatarUrl}`;
    console.log('Avatar URL:', { relative: avatarUrl, full: fullUrl });
    return fullUrl;
  },
};
