// ===========================================
// Auth Controller
// ===========================================

import {
    Controller,
    Post,
    Get,
    Put,
    Body,
    Req,
    HttpCode,
    HttpStatus,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, UpdateProfileDto } from './dto/auth.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
}

@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    /**
     * Register a new user
     * Rate limited to 5 requests per minute
     */
    @Post('register')
    @Public()
    @Throttle({ medium: { limit: 5, ttl: 60000 } })
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    /**
     * Login user
     * Rate limited to 10 requests per minute
     */
    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @Throttle({ medium: { limit: 10, ttl: 60000 } })
    async login(@Body() dto: LoginDto) {
        return this.authService.login(dto);
    }

    /**
     * Refresh access token
     */
    @Post('refresh')
    @Public()
    @HttpCode(HttpStatus.OK)
    async refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refreshToken);
    }

    /**
     * Logout user
     */
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    async logout(@Req() req: Request) {
        const token = (req as Request & { accessToken?: string }).accessToken;
        return this.authService.logout(token || '');
    }

    /**
     * Get current user profile
     */
    @Get('me')
    async getProfile(@CurrentUser() user: UserProfile) {
        return this.authService.getProfile(user.id);
    }

    /**
     * Update current user profile
     */
    @Put('me')
    async updateProfile(
        @CurrentUser() user: UserProfile,
        @Body() dto: UpdateProfileDto,
    ) {
        return this.authService.updateProfile(user.id, dto);
    }
}
