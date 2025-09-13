import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailEvents } from 'src/commen/event/send-email';
import { SharedModule } from 'src/commen/sharedModules';
import { AuthController } from './auth.controller';

@Module({
  imports: [SharedModule],
  controllers: [AuthController],
  providers: [AuthService, EmailEvents],
})
export class AuthModule {}

// RolesGuard,
//     AuthGuard,
//     TokenService,
//     UserRepository,
//     JwtService,
//     UserModel
