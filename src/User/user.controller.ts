import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { userService } from './user.service';
import { AuthGuard } from 'src/commen/Guards/auth.guard';
import { Request } from 'express';
import { RolesGuard } from 'src/commen/Guards/role.guard';
import { Roles } from 'src/commen/Decorator/roles.decorator';
import { User } from 'src/commen/Decorator/user.decorator';
import { TUser } from 'src/DB/models/User/user.schema';

@ApiTags('Users')
@Controller('user')
export class userController {
  constructor(private readonly userService: userService) {}
  @ApiOperation({
    summary: 'Get user profile',
    description: 'Retrieve the authenticated user profile information.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @Get('profile')
  @UseGuards(AuthGuard)
  getProfile(@User() user: TUser) {
    return this.userService.getProfile(user);
  }
  @ApiOperation({
    summary: 'Get admin profile',
    description:
      'Retrieve admin profile information. Requires admin privileges.',
  })
  @ApiBearerAuth('JWT')
  @ApiResponse({
    status: 200,
    description: 'Admin profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin privileges required',
  })
  @Get('profile/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(['admin', 'superAdmin'])
  getProfileAdmin(@User() user: TUser) {
    return this.userService.getProfile(user);
  }
}
