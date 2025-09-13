import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  ConfirmDTO,
  confrimForgetPasswordDTO,
  ForgetPasswordDTO,
  GoogleLoginDTO,
  loginDTO,
  RefreshTokenDTO,
  ReSendCodeDTO,
  ResetPasswordDTO,
  SignupDTO,
} from './dto';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { log } from 'console';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import {
  ApiResponseDto,
  ErrorResponseDto,
} from '../common/dto/common-response.dto';
@ApiTags('Authentication')
@ApiHeader({
  name: 'X-API-Version',
  description: 'API Version',
  required: false,
  schema: { default: 'v1' },
})
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller('auth')
export class AuthController {
  constructor(private readonly AuthService: AuthService) {}

  @Post('signup')
  @ApiOperation({
    summary: 'User Registration',
    description: 'Register a new user account with email verification',
  })
  @ApiBody({ type: SignupDTO })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Verification email sent.',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or email already exists',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: 'Too Many Requests - Rate limit exceeded',
    type: ErrorResponseDto,
  })
  async signup(@Body() signupDTO: SignupDTO) {
    const data = await this.AuthService.signup(signupDTO);
    return { message: 'success', data };
  }
  @HttpCode(200)
  @Post('confirm-email')
  @ApiOperation({
    summary: 'Email Verification',
    description: 'Confirm user email address with verification code',
  })
  @ApiBody({ type: ConfirmDTO })
  @ApiResponse({
    status: 200,
    description: 'Email confirmed successfully',
    type: ApiResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification code',
    type: ErrorResponseDto,
  })
  async confirm(@Body() confirmDTO: ConfirmDTO) {
    return this.AuthService.confrim(confirmDTO);
  }
  @HttpCode(200)
  @Post('login')
  @ApiOperation({
    summary: 'User Login',
    description: 'Authenticate user and return access/refresh tokens',
  })
  @ApiBody({ type: loginDTO })
  @ApiResponse({
    status: 200,
    description: 'Login successful. Returns access and refresh tokens.',
    type: ApiResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: 'user_id',
            email: 'user@example.com',
            firstName: 'John',
            lastName: 'Doe',
          },
          tokens: {
            accessToken: 'jwt_access_token',
            refreshToken: 'jwt_refresh_token',
          },
        },
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or unverified email',
    type: ErrorResponseDto,
  })
  async login(@Body() loginDTO: loginDTO) {
    return this.AuthService.login(loginDTO);
  }
  @HttpCode(200)
  @Post('resend-code')
  async reSendCode(@Body() reSendCodeDTO: ReSendCodeDTO) {
    return await this.AuthService.reSendCode(reSendCodeDTO);
  }
  @HttpCode(200)
  @Post('google-login')
  async googleLogin(@Body() googleLoginDTO: GoogleLoginDTO) {
    return await this.AuthService.googleLogin(googleLoginDTO.idToken);
  }
  @HttpCode(200)
  @Post('forget-password')
  async forgetPassword(@Body() forgetPasswordDTO: ForgetPasswordDTO) {
    return await this.AuthService.forgetPassword(forgetPasswordDTO);
  }
  @HttpCode(200)
  @Post('confirm-forget-password')
  async confirmForgetPassword(
    @Body() confirmForgetPasswordDTO: confrimForgetPasswordDTO,
  ) {
    return await this.AuthService.confirmForgetPassword(
      confirmForgetPasswordDTO,
    );
  }
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    return await this.AuthService.resetPassword(resetPasswordDTO);
  }
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('freeze-account')
  async freezeAccount(@User() user: TUser) {
    return await this.AuthService.freezeAccount(user);
  }
  @HttpCode(200)
  @Post('refresh-token')
  async refreshToken(@Body() refreshTokenDTO: RefreshTokenDTO) {
    return await this.AuthService.refreshToken(refreshTokenDTO.refreshToken);
  }

  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Get('session')
  async getSession(@User() user: TUser) {
    return await this.AuthService.getSession(user);
  }

  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('logout')
  async logout(@User() user: TUser) {
    return await this.AuthService.logout(user);
  }
}
