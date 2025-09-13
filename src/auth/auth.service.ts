import {
  BadRequestException,
  Body,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ConfirmDTO,
  confrimForgetPasswordDTO,
  ForgetPasswordDTO,
  loginDTO,
  ReSendCodeDTO,
  ResetPasswordDTO,
  SignupDTO,
} from './dto';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { EmailEvents } from 'src/commen/event/send-email';
import * as Randomstring from 'randomstring';
import { compareHash } from 'src/commen/security/compare';
import { generateHash } from 'src/commen/security/hash';
import { ITokenTypes, TokenService } from 'src/commen/jwt';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { OAuth2Client } from 'google-auth-library';
import { messageSystem } from 'src/commen/messages';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailEvent: EmailEvents,
    private readonly tokenService: TokenService,
  ) {}
  async signup(body: SignupDTO) {
    const check = await this.userRepository.findByEmail({ email: body.email });
    if (check) throw new ConflictException('user already exist');
    const generateOTP = Randomstring.generate({
      length: 6,
      charset: '1234567890',
    });
    this.emailEvent.sendEmail(body.email, generateOTP, body.userName);

    const user = await this.userRepository.create(body);
    user.code = generateHash(generateOTP);
    user.codeExpiration = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();
    return { data: 'Email is created but active frist' };
  }
  async reSendCode(body: ReSendCodeDTO) {
    const user = await this.userRepository.findByEmail({
      email: body.email,
      isConfirm: { $exists: false },
    });
    if (!user) throw new ConflictException(messageSystem.user.invalid);
    const generateOTP = Randomstring.generate({
      length: 6,
      charset: '1234567890',
    });
    this.emailEvent.sendEmail(body.email, generateOTP, user.userName);
    user.code = generateHash(generateOTP);
    user.codeExpiration = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();
    return { success: true, data: messageSystem.user.resetCode };
  }
  async confrim(body: ConfirmDTO) {
    const user = await this.userRepository.findByEmail({
      email: body.email,
      isConfirm: { $exists: false },
    });
    if (!user)
      throw new NotFoundException('User not found or already confrimed');
    if (!compareHash(body.code, user.code || ' '))
      throw new BadRequestException('In-valid OTP');
    user.isConfirm = true;
    user.code = undefined;
    await user.save();
    return { data: 'email confirmed successfully' };
  }
  async login(body: loginDTO) {
    const user = await this.userRepository.findByEmail({ email: body.email });
    if (!user) throw new BadRequestException('In-valid-user');
    if (!user.isConfirm)
      throw new BadRequestException('Sorry confirm your email first 😔');

    if (!compareHash(body.password, user.password))
      throw new BadRequestException('In-valid-user');
    const accessToken: string = this.tokenService.sign({
      payload: { userId: user._id.toString(), role: user.role },
      type: ITokenTypes.access,
      role: user.role,
      expiresIn: '1d',
    });
    const refreshToken: string = this.tokenService.sign({
      payload: { userId: user._id.toString(), role: user.role },
      type: ITokenTypes.refresh,
      role: user.role as RoleTypes,
      expiresIn: '7d',
    });
    return {
      data: {
        accessToken: `${user.role} ${accessToken}`,
        refreshToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        user: {
          id: user._id,
          email: user.email,
          name: user.userName,
          role: user.role,
          profileImage: user.profileImage?.secure_url,
        },
      },
    };
  }
  async googleLogin(idToken: string) {
    try {
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID, // تأكد إنها متضبطة في .env
      });

      if (!ticket) {
        throw new ConflictException('Invalid Google Token');
      }

      const payload = ticket.getPayload();
      if (!payload) {
        throw new ConflictException('Google token payload is empty');
      }

      const { email, name, picture } = payload;

      let user = await this.userRepository.findByEmail({ email });

      if (!user) {
        user = await this.userRepository.create({
          email,
          userName: name,
          profileImage: { secure_url: picture || 's' },
          provider: 'google',
          isConfirm: true,
        });
      }
      if (user.provider !== 'google') {
        throw new ConflictException(
          'This email is signed up with another provider',
        );
      }
      const accessToken: string = this.tokenService.sign({
        payload: { userId: user._id.toString(), role: user.role },
        type: ITokenTypes.access,
        role: user.role,
        expiresIn: '1d',
      });
      const refreshToken: string = this.tokenService.sign({
        payload: { userId: user._id.toString(), role: user.role },
        type: ITokenTypes.refresh,
        role: user.role as RoleTypes,
        expiresIn: '7d',
      });
      const responseData = {
        data: {
          accessToken: `${user.role} ${accessToken}`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
          refreshToken,
          user: {
            id: user._id,
            email: user.email,
            name: user.userName,
            role: user.role,
            profileImage: user.profileImage?.secure_url,
          },
        },
      };

      return responseData;
    } catch (error) {
      throw new BadRequestException(
        'Failed to verify Google token: ' + error.message,
      );
    }
  }
  async forgetPassword(body: ForgetPasswordDTO) {
    const user = await this.userRepository.findOne({
      email: body.email,
      isConfirm: true,
    });
    if (!user) throw new BadRequestException(messageSystem.user.invalid);
    const generateOTP = Randomstring.generate({
      length: 6,
      charset: '1234567890',
    });
    this.emailEvent.sendEmail(body.email, generateOTP, user.userName);
    user.code = generateHash(generateOTP);
    user.codeExpiration = new Date(Date.now() + 3 * 60 * 1000);
    await user.save();
    return { success: true, data: messageSystem.user.resetCode };
  }
  async confirmForgetPassword(body: confrimForgetPasswordDTO) {
    const user = await this.userRepository.findByEmail({
      email: body.email,
      isConfirm: true,
    });
    if (!user) throw new NotFoundException(messageSystem.user.invalid);
    if (!user.code) {
      throw new BadRequestException('No OTP code found');
    }
    if (!compareHash(body.code, user.code)) {
      throw new BadRequestException('Invalid OTP');
    }
    if (user.codeExpiration && user.codeExpiration < new Date()) {
      throw new BadRequestException('OTP has expired');
    }
    user.code = undefined;
    await user.save();
    const resetToken = this.tokenService.sign({
      payload: { userId: user._id.toString(), role: user.role },
      type: ITokenTypes.reset,
      role: user.role,
      expiresIn: '10m',
    });
    return { success: true, data: resetToken };
  }
  async resetPassword(body: ResetPasswordDTO) {
    const payload = this.tokenService.verify(
      body.resetToken,
      '',
      ITokenTypes.reset,
    );
    if (!payload || !payload.userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new NotFoundException(messageSystem.user.invalid);
    }

    user.password = body.password;
    user.code = undefined;

    await user.save();

    return { success: true, message: 'Password reset successfully' };
  }
  async freezeAccount(user: TUser) {
    if (user.isDeleted)
      throw new BadRequestException(messageSystem.user.isAlreadyDeleted);
    user.isDeletedAt = new Date();
    user.isDeleted = true;
    await user.save();
    return { success: true, data: messageSystem.user.freezeAcc };
  }
  async refreshToken(token: string) {
    const payload = this.tokenService.verify(token, ' ', ITokenTypes.refresh);
    const { iat } = payload;
    if (!iat) {
      throw new UnauthorizedException('Missing token issue time (iat)');
    }
    const user = await this.userRepository.findById(payload.userId);
    if (!user) throw new BadRequestException(messageSystem.user.invalid);
    if (user.isDeletedAt && user.isDeletedAt.getTime() > iat * 1000)
      throw new BadRequestException(messageSystem.user.token);
    const accessToken: string = this.tokenService.sign({
      payload: { userId: user._id.toString(), role: user.role },
      type: ITokenTypes.access,
      role: payload.role,
      expiresIn: '1d',
    });
    return { success: true, data: { accessToken } };
  }
  async getSession(user: TUser) {
    try {
      // Return current session info
      return {
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.userName,
            role: user.role,
            profileImage: user.profileImage?.secure_url,
          },
          session: {
            userId: user._id,
            loginTime: new Date(),
            isActive: true,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          },
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to get session info');
    }
  }

  async logout(user: TUser) {
    try {
      // In a real implementation, you might want to blacklist the token
      // or store logout information in database
      return {
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      };
    } catch (error) {
      throw new BadRequestException('Failed to logout');
    }
  }
}
