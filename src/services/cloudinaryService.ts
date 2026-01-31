import Constants from 'expo-constants';

// Cloudinary configuration
// Cloud Name: dcglnyola
// Note: For frontend uploads, you need an unsigned upload preset
// API Key and Secret are for server-side uploads only
const CLOUDINARY_CLOUD_NAME = 
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 
  Constants.expoConfig?.extra?.cloudinary?.cloudName || 
  'dcglnyola';
const CLOUDINARY_UPLOAD_PRESET = 
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 
  Constants.expoConfig?.extra?.cloudinary?.uploadPreset || 
  'caravan';

// Cloudinary upload URL
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`;

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
}

/**
 * Upload image to Cloudinary
 */
export async function uploadImage(uri: string, folder: string = 'chat/images'): Promise<UploadResult> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload preset is not configured. Please create an UNSIGNED upload preset in Cloudinary dashboard and set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }

  const formData = new FormData();
  // React Native FormData format
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name: `image_${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let React Native set it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      let errorMessage = error.error?.message || 'Failed to upload image';
      
      // Provide helpful error message for unsigned preset issues
      if (errorMessage.includes('whitelisted') || errorMessage.includes('unsigned')) {
        errorMessage = 'Upload preset must be set to "Unsigned" mode in Cloudinary. Go to Settings > Upload > Upload presets and set your preset to "Unsigned".';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
      secureUrl: data.secure_url || data.url,
    };
  } catch (error: any) {
    console.error('Error uploading image to Cloudinary:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
}

/**
 * Upload audio/voice note to Cloudinary
 */
export async function uploadAudio(uri: string, folder: string = 'chat/audio'): Promise<UploadResult> {
  if (!CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary cloud name is not configured. Please set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME');
  }

  if (!CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Cloudinary upload preset is not configured. Please create an UNSIGNED upload preset in Cloudinary dashboard and set EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET');
  }

  const formData = new FormData();
  // React Native FormData format
  formData.append('file', {
    uri,
    type: 'audio/m4a', // iOS uses m4a, Android uses 3gp
    name: `voice_${Date.now()}.m4a`,
  } as any);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }
  formData.append('resource_type', 'video'); // Cloudinary treats audio as video resource

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL.replace('/upload', '/video/upload'), {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - let React Native set it with boundary
    });

    if (!response.ok) {
      const error = await response.json();
      let errorMessage = error.error?.message || 'Failed to upload audio';
      
      // Provide helpful error message for unsigned preset issues
      if (errorMessage.includes('whitelisted') || errorMessage.includes('unsigned')) {
        errorMessage = 'Upload preset must be set to "Unsigned" mode in Cloudinary. Go to Settings > Upload > Upload presets and set your preset to "Unsigned".';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
      secureUrl: data.secure_url || data.url,
    };
  } catch (error: any) {
    console.error('Error uploading audio to Cloudinary:', error);
    throw new Error(error.message || 'Failed to upload audio');
  }
}

