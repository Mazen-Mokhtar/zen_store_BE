import { AdminAndResourceOptions, v2 as cloudinary } from "cloudinary"
import { log } from "console";
export interface IAttachments {
    secure_url?: string;
    public_id?: string;
}
export class cloudService {
    constructor() {
        cloudinary.config({
            api_key: process.env.API_KEY,
            api_secret: process.env.API_SECRET,
            cloud_name: process.env.CLOUD_NAME
        })
    }
    
    async uploadFile(file: Express.Multer.File , {folder = process.env.APP_NAME}) {
        return await cloudinary.uploader.upload(file.path , {folder})
    }
    async uploadFiles(files: Express.Multer.File[]) {
        let attachments: IAttachments[] = []
        for (const file of files) {
            const { secure_url, public_id } = await cloudinary.uploader.upload(file.path)
            attachments.push({ secure_url, public_id })
        }
        return attachments
    }
    async destroyFile(public_id: string) {
        return await cloudinary.uploader.destroy(public_id)
    }
    async destroyFiles(public_ids: string[], options?: AdminAndResourceOptions) {
        return await cloudinary.api.delete_resources(public_ids, options || { type: "upload", resource_type: "image" })
    }
    async destroyFolderAssets(path: string) {
        return await cloudinary.api.delete_resources_by_prefix(path)
    }
}