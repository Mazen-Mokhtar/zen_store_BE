import { Body, Controller, Get, HttpCode, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConfirmDTO, confrimForgetPasswordDTO, ForgetPasswordDTO, GoogleLoginDTO, loginDTO, RefreshTokenDTO, ReSendCodeDTO, ResetPasswordDTO, SignupDTO } from './dto';
import { UserRepository } from 'src/DB/models/User/user.repository';
import { log } from 'console';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
@UsePipes(new ValidationPipe({ whitelist: true }))
@Controller("auth")
export class AuthController {
  constructor(private readonly AuthService: AuthService) { }

  @Post("signup")
  async signup(@Body() signupDTO: SignupDTO) {

    const data = await this.AuthService.signup(signupDTO)
    return { message: "success", data }
  }
  @HttpCode(200)
  @Post("confirm-email")
  async confirm(@Body() confirmDTO: ConfirmDTO) {
    return this.AuthService.confrim(confirmDTO)
  }
  @HttpCode(200)
  @Post("login")
  async login(@Body() loginDTO: loginDTO) {
    return this.AuthService.login(loginDTO)
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
  async confirmForgetPassword(@Body() confirmForgetPasswordDTO: confrimForgetPasswordDTO) {
    return await this.AuthService.confirmForgetPassword(confirmForgetPasswordDTO);
  }
  @HttpCode(200)
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDTO: ResetPasswordDTO) {
    return await this.AuthService.resetPassword(resetPasswordDTO);
  }
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Post('freeze-account')
  async freezeAccount(@User() user : TUser) {
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
