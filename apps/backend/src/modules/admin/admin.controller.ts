// ===========================================
// Admin Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    AdminService,
    UpdateThresholdsDto,
    ResolveFlagDto,
    ResolveContradictionDto,
    UserActionDto,
} from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * Get all stores
     */
    @Get('stores')
    async getStores() {
        return this.adminService.getStores();
    }

    /**
     * Update store thresholds
     */
    @Put('thresholds')
    async updateThresholds(
        @CurrentUser() user: UserProfile,
        @Body() dto: UpdateThresholdsDto,
    ) {
        return this.adminService.updateThresholds(user.id, dto);
    }

    /**
     * Resolve a flag
     */
    @Post('flags/:id/resolve')
    async resolveFlag(
        @Param('id') flagId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: ResolveFlagDto,
    ) {
        return this.adminService.resolveFlag(user.id, flagId, dto);
    }

    /**
     * Resolve a contradiction
     */
    @Post('contradictions/:id/resolve')
    async resolveContradiction(
        @Param('id') contradictionId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: ResolveContradictionDto,
    ) {
        return this.adminService.resolveContradiction(user.id, contradictionId, dto);
    }

    /**
     * Block or unblock a user
     */
    @Post('users/:id/status')
    async updateUserStatus(
        @Param('id') userId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: UserActionDto,
    ) {
        return this.adminService.updateUserStatus(user.id, userId, dto);
    }

    /**
     * Get analytics
     */
    @Get('analytics')
    async getAnalytics(@Query('storeId') storeId?: string) {
        return this.adminService.getAnalytics(storeId);
    }

    /**
     * Get all users
     */
    @Get('users')
    async getUsers(@Query('role') role?: string) {
        return this.adminService.getUsers(role);
    }

    /**
     * Get all bills
     */
    @Get('bills')
    async getAllBills(
        @Query('status') status?: string,
        @Query('storeId') storeId?: string,
    ) {
        return this.adminService.getAllBills(status, storeId);
    }

    /**
     * Get audit logs
     */
    @Get('audit')
    async getAuditLogs(@Query('limit') limit?: number) {
        return this.adminService.getAuditLogs(limit);
    }
}
