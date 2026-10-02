import axios from 'axios';
import { useState } from 'react';
import { apiClient } from '@/api/client';
import type { ApiEnvelope, SignedUpload } from '@/api/types';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  publicId: string;
}

/**
 * Validate an image file, sign an upload on the backend, push the bytes
 * straight to Cloudinary, and return the delivery URL + public id.
 * Throws an Error with a human-readable message on any failure.
 */
export async function uploadImageFile(file: File, folder: string): Promise<UploadedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image must be 5 MB or smaller.');
  }
  let signature: SignedUpload;
  try {
    const { data } = await apiClient.post<ApiEnvelope<SignedUpload>>('/admin/media/sign', {
      folder,
      resourceType: 'image',
    });
    signature = data.data;
  } catch (err) {
    throw new Error(err instanceof Error ? `Could not start upload: ${err.message}` : 'Could not start upload');
  }
  const body = new FormData();
  body.append('file', file);
  body.append('api_key', signature.apiKey);
  body.append('timestamp', String(signature.timestamp));
  body.append('folder', signature.folder);
  body.append('signature', signature.signature);
  try {
    const upload = await axios.post<{ secure_url: string; public_id: string }>(
      `https://api.cloudinary.com/v1_1/${signature.cloudName}/${signature.resourceType}/upload`,
      body,
    );
    return { url: upload.data.secure_url, publicId: upload.data.public_id };
  } catch (err) {
    throw new Error(err instanceof Error ? `Upload failed: ${err.message}` : 'Upload failed');
  }
}

/**
 * File-picker button that uploads straight to Cloudinary and reports the
 * resulting URL. Renders a dashed picker tile; callers show previews/errors.
 */
export function ImageUploadButton({
  folder,
  onUploaded,
  onError,
  label = '+ Add image',
  className = '',
  disabled = false,
}: {
  folder: string;
  onUploaded: (image: UploadedImage) => void;
  onError: (message: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      onUploaded(await uploadImageFile(file, folder));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <label
      className={`flex h-24 w-36 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 px-2 text-center text-xs text-slate-500 transition-colors hover:border-flame-400 hover:text-flame-600 ${uploading || disabled ? 'pointer-events-none opacity-60' : ''} ${className}`}
    >
      {uploading ? 'Uploading…' : label}
      <input
        type="file"
        accept="image/*"
        disabled={uploading || disabled}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void handleFile(file);
        }}
      />
    </label>
  );
}
