import { Client, Storage, ID } from 'node-appwrite';
const { InputFile } = require('node-appwrite/file');
import { log } from 'console';
export interface IAttachments {
  secure_url?: string;
  public_id?: string;
}
export class cloudService {
  private client: Client;
  private storage: Storage;
  private bucketId: string;

  constructor() {
    this.client = new Client();
    this.client
      .setEndpoint(
        process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      )
      .setProject(process.env.APPWRITE_PROJECT_ID!)
      .setKey(process.env.APPWRITE_API_KEY!);

    this.storage = new Storage(this.client);
    this.bucketId = process.env.APPWRITE_BUCKET_ID!;
  }

  async uploadFile(
    file: Express.Multer.File,
    { folder = process.env.APP_NAME } = {},
  ) {
    try {
      const fileId = ID.unique();
      const inputFile = file.path
        ? InputFile.fromPath(file.path, file.originalname)
        : InputFile.fromBuffer(file.buffer, file.originalname);

      const uploadedFile = await this.storage.createFile(
        this.bucketId,
        fileId,
        inputFile,
      );

      // Generate the preview URL
      const secure_url = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${this.bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;

      return {
        secure_url,
        public_id: uploadedFile.$id,
      };
    } catch (error) {
      log('Error uploading file:', error);
      throw error;
    }
  }
  async uploadFiles(files: Express.Multer.File[]) {
    const attachments: IAttachments[] = [];
    for (const file of files) {
      try {
        const fileId = ID.unique();
        const inputFile = file.path
          ? InputFile.fromPath(file.path, file.originalname)
          : InputFile.fromBuffer(file.buffer, file.originalname);

        const uploadedFile = await this.storage.createFile(
          this.bucketId,
          fileId,
          inputFile,
        );

        const secure_url = `${process.env.APPWRITE_ENDPOINT}/storage/buckets/${this.bucketId}/files/${uploadedFile.$id}/view?project=${process.env.APPWRITE_PROJECT_ID}`;
        attachments.push({ secure_url, public_id: uploadedFile.$id });
      } catch (error) {
        log('Error uploading file:', error);
        throw error;
      }
    }
    return attachments;
  }
  async destroyFile(public_id: string) {
    try {
      return await this.storage.deleteFile(this.bucketId, public_id);
    } catch (error) {
      log('Error deleting file:', error);
      throw error;
    }
  }
  async destroyFiles(public_ids: string[], options?: any) {
    try {
      const deletePromises = public_ids.map((id) =>
        this.storage.deleteFile(this.bucketId, id),
      );
      return await Promise.all(deletePromises);
    } catch (error) {
      log('Error deleting files:', error);
      throw error;
    }
  }
  async destroyFolderAssets(path: string) {
    try {
      // List all files in the bucket
      const filesList = await this.storage.listFiles(this.bucketId);

      // Filter files that match the prefix (simulating folder structure)
      const filesToDelete = filesList.files.filter(
        (file) => file.name.startsWith(path) || file.$id.startsWith(path),
      );

      // Delete all matching files
      const deletePromises = filesToDelete.map((file) =>
        this.storage.deleteFile(this.bucketId, file.$id),
      );

      return await Promise.all(deletePromises);
    } catch (error) {
      log('Error deleting folder assets:', error);
      throw error;
    }
  }
}
