import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SignupDTO, loginDTO } from './dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    confrim: jest.fn(),
    reSendCode: jest.fn(),
    googleLogin: jest.fn(),
    forgetPassword: jest.fn(),
    resetPassword: jest.fn(),
    freezeAccount: jest.fn(),
    refreshToken: jest.fn(),
    getSession: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signup', () => {
    const signupDto: SignupDTO = {
      email: 'test@example.com',
      password: 'password123',
      userName: 'testuser',
      cPassword: 'password123',
      phone: '+1234567890',
    };

    it('should register a new user successfully', async () => {
      const expectedResult = {
        message: 'success',
        data: { data: 'Email is created but active first' },
      };
      mockAuthService.signup.mockResolvedValue({
        data: 'Email is created but active first',
      });

      const result = await controller.signup(signupDto);

      expect(authService.signup).toHaveBeenCalledWith(signupDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw BadRequestException when email already exists', async () => {
      mockAuthService.signup.mockRejectedValue(
        new BadRequestException('Email already exists'),
      );

      await expect(controller.signup(signupDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(authService.signup).toHaveBeenCalledWith(signupDto);
    });
  });

  describe('login', () => {
    const loginDto: loginDTO = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login user successfully', async () => {
      const expectedResult = {
        success: true,
        message: 'Login successful',
        data: {
          user: { email: loginDto.email },
          tokens: {
            accessToken: 'jwt-token',
            refreshToken: 'refresh-token',
          },
        },
      };
      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const expectedResult = {
        success: true,
        data: {
          accessToken: 'new-jwt-token',
          refreshToken: 'new-refresh-token',
        },
      };
      mockAuthService.refreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refreshToken({ refreshToken });

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const invalidRefreshToken = 'invalid-refresh-token';
      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Invalid refresh token'),
      );

      await expect(
        controller.refreshToken({ refreshToken: invalidRefreshToken }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('smoke tests', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('authService should be defined', () => {
      expect(authService).toBeDefined();
    });
  });
});
