import { EventEmitter2 } from '@nestjs/event-emitter';
import { generateOTPEmail } from '../email/templ/email';
import { sendEmail } from '../email/send-email';
import { Injectable } from '@nestjs/common';
@Injectable()
export class EmailEvents {
  constructor(private eventEmitter: EventEmitter2) {
    this.eventEmitter.on('sender', async (email, generateOTP, userName) => {
      const html = generateOTPEmail(generateOTP, userName);
      await sendEmail({ to: email, html });
    });
  }
  sendEmail(email: string, generateOTP, userName: string) {
    this.eventEmitter.emit('sender', email, generateOTP, userName);
  }
}
