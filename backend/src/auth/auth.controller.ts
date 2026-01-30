import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  UnauthorizedException,
  Param,
  Delete,
  Request as NestRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { UserSessionsService } from './user-sessions.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private sessionsService: UserSessionsService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @SwaggerApiResponse({ status: 201, description: 'User successfully registered' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid input data' })
  @SwaggerApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.fullName,
      registerDto.phone,
      registerDto.role,
    );
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @SwaggerApiResponse({ status: 200, description: 'Login successful' })
  @SwaggerApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req) {
    const deviceInfo = this.extractDeviceInfo(req);
    return this.authService.login(req.user, deviceInfo);
  }

  @Public()
  @Post('login/phone')
  @ApiOperation({ summary: 'Login with phone and password' })
  @SwaggerApiResponse({ status: 200, description: 'Login successful' })
  @SwaggerApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginWithPhone(
    @Body() loginDto: { phone: string; password: string },
    @NestRequest() req: any,
  ) {
    const user = await this.authService.validateUserByPhone(
      loginDto.phone,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const deviceInfo = this.extractDeviceInfo(req);
    return this.authService.login(user, deviceInfo);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({ type: ForgotPasswordDto })
  @SwaggerApiResponse({
    status: 200,
    description: 'Password reset email sent if account exists',
  })
  @SwaggerApiResponse({ status: 400, description: 'Invalid email format' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using token from email' })
  @ApiBody({ type: ResetPasswordDto })
  @SwaggerApiResponse({ status: 200, description: 'Password successfully reset' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('request-email-change')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Request email change verification code' })
  @SwaggerApiResponse({ status: 200, description: 'Verification code sent' })
  async requestEmailChange(@CurrentUser() user: any) {
    return this.authService.requestEmailChange(user.id);
  }

  @Post('change-email')
  @Public() // Can be public since token verifies identity
  @ApiOperation({ summary: 'Change email using verification token' })
  @SwaggerApiResponse({ status: 200, description: 'Email updated successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid token or email in use' })
  async changeEmail(@Body() body: { token: string; newEmail: string }) {
    return this.authService.changeEmail(body.token, body.newEmail);
  }

  @Get('profile')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @SwaggerApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @SwaggerApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  @Post('change-password')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Change current user password' })
  @SwaggerApiResponse({ status: 200, description: 'Password successfully updated' })
  @SwaggerApiResponse({ status: 400, description: 'Invalid old password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: { oldPassword?: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.id, body);
  }

  @Get('sessions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all active sessions for current user' })
  async getSessions(@CurrentUser() user: any) {
    return this.sessionsService.findAllForUser(user.id);
  }

  @Delete('sessions/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(@Param('id') sessionId: string, @CurrentUser() user: any) {
    await this.sessionsService.revokeSession(sessionId, user.id);
    return { success: true };
  }

  private extractDeviceInfo(req: any) {
    const ua = req.headers['user-agent'] || '';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    let deviceType = 'Desktop';
    if (/mobile/i.test(ua)) deviceType = 'Mobile';
    if (/tablet/i.test(ua)) deviceType = 'Tablet';

    let os = 'Unknown OS';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    else if (/linux/i.test(ua)) os = 'Linux';

    let browser = 'Unknown Browser';
    if (/chrome|crios/i.test(ua)) browser = 'Chrome';
    else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';
    else if (/opera|opr/i.test(ua)) browser = 'Opera';

    return {
      deviceType: `${os} ${deviceType}`,
      browser,
      os,
      ipAddress: typeof ip === 'string' ? ip.split(',')[0].trim() : ip,
      userAgent: ua,
    };
  }
}
