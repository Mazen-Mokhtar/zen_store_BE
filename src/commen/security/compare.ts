import { compareSync } from "bcrypt"

export const compareHash = (plainText: string, hashValue: string): boolean => {
    return compareSync(plainText, hashValue)
}