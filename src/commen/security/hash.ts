import { hashSync } from "bcrypt"

export const generateHash = (plainText: string, salt: number = parseInt(process.env.SALT as string)): string => {
    return hashSync(plainText, salt)
}