import { InternalServerErrorException } from "@nestjs/common"
import { createTransport, SendMailOptions } from "nodemailer"
export const sendEmail = async (data: SendMailOptions) => {
    try {
        const transporter = createTransport({
            host: "smtp.gmail.email",
            service: "gmail",
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL,
                pass: process.env.EMAIL_PASS,
            },
        });

        // Wrap in an async IIFE so we can use await.
        (async () => {
            const info = await transporter.sendMail({
                from: `"e-commrece <${process.env.EMAIL}>`,
                ...data
            });

            console.log("Message sent:", info.messageId);
        })();
    } catch (error) {
        throw new InternalServerErrorException(error)
    }
}