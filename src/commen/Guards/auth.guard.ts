import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { ITokenTypes, IUserPayload, TokenService } from '../jwt';
import { RoleTypes, TUser } from 'src/DB/models/User/user.schema';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { messageSystem } from '../messages';
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly userRepository: UserRepository,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const { authorization } = request.headers;
    if (!authorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }
    let payload: IUserPayload;
    const token: string[] = authorization.split(' ');
    if (!token[1]) {
      throw new UnauthorizedException('Invalid Authorization Format');
    }
    if (authorization?.startsWith(RoleTypes.USER)) {
      payload = this.tokenService.verify(
        token[1],
        RoleTypes.USER,
        ITokenTypes.access,
      );
    } else if (authorization?.startsWith(RoleTypes.ADMIN)) {
      payload = this.tokenService.verify(
        token[1],
        RoleTypes.ADMIN,
        ITokenTypes.access,
      );
    } else if (authorization?.startsWith(RoleTypes.SUPER_ADMIN)) {
      payload = this.tokenService.verify(
        token[1],
        RoleTypes.SUPER_ADMIN,
        ITokenTypes.access,
      );
    } else {
      throw new UnauthorizedException('Invalid authorization');
    }
    const user = await this.userRepository.findById(payload.userId);
    if (!user) throw new NotFoundException('User Not Found');
    if (user.isDeleted)
      throw new BadRequestException(messageSystem.user.freezeAcc);
    const { iat } = payload;
    if (!iat) {
      throw new UnauthorizedException('Missing token issue time (iat)');
    }
    if (user.isDeletedAt && user.isDeletedAt.getTime() > iat * 1000)
      throw new BadRequestException(messageSystem.user.token);
    request['user'] = user;
    return true;
  }
}
