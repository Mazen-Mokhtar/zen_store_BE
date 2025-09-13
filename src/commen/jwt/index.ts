import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { Types } from 'mongoose';
import { RoleTypes } from 'src/DB/models/User/user.schema';
export enum ITokenTypes {
  access = 'access',
  refresh = 'refresh',
  reset = 'reset',
}
export interface IUserPayload extends JwtPayload {
  userId: string;
  role: RoleTypes | string;
}
interface IGenarateToken {
  payload: IUserPayload;
  type: ITokenTypes;
  role: RoleTypes | string;
  expiresIn?: string;
}
@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}
  sign({
    payload,
    type = ITokenTypes.access,
    role,
    expiresIn,
  }: IGenarateToken) {
    const { accessToken, refreshToken } = this.getSignature(role, type);
    return this.jwtService.sign(payload, {
      secret:
        type === ITokenTypes.access || type === ITokenTypes.reset
          ? accessToken
          : refreshToken,
      expiresIn:
        type === ITokenTypes.access ? expiresIn : process.env.EXPIRESIN_ADMIN,
    });
  }
  private getSignature(
    role: RoleTypes | string | undefined,
    type: ITokenTypes,
  ): { accessToken: string; refreshToken: string } {
    let accessToken: string;
    let refreshToken: string;
    if (type === ITokenTypes.reset) {
      accessToken = process.env.SIGNATURE_RESET as string;
      refreshToken = process.env.SIGNATURE_RESET as string;
      return { accessToken, refreshToken };
    }
    switch (role) {
      case RoleTypes.ADMIN:
        accessToken = process.env.SIGNATURE_ADMIN as string;
        break;
      case RoleTypes.SUPER_ADMIN:
        accessToken = process.env.SIGNATURE_SUPER_ADMIN as string;
        break;

      default:
        accessToken = process.env.SIGNATURE_USER as string;
        break;
    }
    refreshToken = process.env.SIGNATURE_REFRESH as string;
    return { accessToken, refreshToken };
  }
  verify(token: string, role: RoleTypes | string, type: ITokenTypes) {
    try {
      const tokenType: ITokenTypes = type;
      let payload: IUserPayload;
      const { accessToken, refreshToken } = this.getSignature(role, type);

      if (tokenType == ITokenTypes.access) {
        payload = this.jwtService.verify(token, { secret: accessToken });
      } else if (tokenType == ITokenTypes.refresh) {
        payload = this.jwtService.verify(token, { secret: refreshToken });
      } else if (tokenType == ITokenTypes.reset) {
        payload = this.jwtService.verify(token, { secret: accessToken });
      } else {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
