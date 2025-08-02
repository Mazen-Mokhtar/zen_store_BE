import { BadRequestException } from "@nestjs/common"
import { diskStorage } from "multer"
export const validationFile = {
    image: ["image/jpeg", "image/png", "image/gif","image/webp"],
    file: ["plain/text", "application/json"]
}
export const cloudMulter = () => {
    return {
        storage: diskStorage({}),
        fileFilter : (req: Request, file: Express.Multer.File , callback :Function )=>{
            if(!validationFile.image.includes(file.mimetype)){
                callback(new BadRequestException("In-valid-typeFile"), false)
            }
            callback(null , true )
        }
    }
}