import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
export const validationFile = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
  file: ['plain/text', 'application/json'],
};
export const cloudMulter = () => {
  return {
    storage: diskStorage({}),
    limits: {
      fileSize: 1024 * 1024 * 1024, // 1GB max file size for very large videos
      files: 10, // Maximum 10 files
      fieldSize: 50 * 1024 * 1024, // 50MB max field size
      fieldNameSize: 200, // Max field name size
      fields: 30, // Max number of fields
      parts: 1000, // Max number of parts
      headerPairs: 2000, // Max number of header pairs
    },
    fileFilter: (
      req: Request,
      file: Express.Multer.File,
      callback: Function,
    ) => {
      const allowedTypes = [...validationFile.image, ...validationFile.video];
      if (!allowedTypes.includes(file.mimetype)) {
        callback(
          new BadRequestException(
            'Invalid file type. Only images and videos are allowed.',
          ),
          false,
        );
      }
      callback(null, true);
    },
  };
};
