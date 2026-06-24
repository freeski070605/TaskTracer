import crypto from 'crypto';
import { env } from '../config/env';

interface CreateUploadSignatureInput {
  publicId: string;
  tags?: string[];
}

const buildSignature = (params: Record<string, string | number>) => {
  const toSign = Object.entries(params)
    .filter(([, value]) => value !== '')
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${toSign}${env.CLOUDINARY_API_SECRET}`).digest('hex');
};

export const createUploadSignature = ({ publicId, tags = [] }: CreateUploadSignatureInput) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = env.CLOUDINARY_UPLOAD_FOLDER.trim().replace(/^\/+|\/+$/g, '');
  const normalizedPublicId = folder ? `${folder}/${publicId}` : publicId;
  const joinedTags = tags.join(',');
  const signature = buildSignature({
    public_id: normalizedPublicId,
    tags: joinedTags,
    timestamp,
  });

  return {
    uploadUrl: `${env.CLOUDINARY_UPLOAD_PREFIX}/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    publicId: normalizedPublicId,
    tags,
  };
};
