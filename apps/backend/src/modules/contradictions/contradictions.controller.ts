// ===========================================
// Contradictions Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ContradictionsService, CreateContradictionDto } from './contradictions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
}

@Controller('contradictions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContradictionsController {
    constructor(private readonly contradictionsService: ContradictionsService) { }

    /**
     * Create a contradiction (dispute a flag)
     */
    @Post()
    @Roles('customer')
    async create(
        @CurrentUser() user: UserProfile,
        @Body() dto: CreateContradictionDto,
    ) {
        return this.contradictionsService.create(user.id, dto);
    }

    /**
     * Get customer's contradictions
     */
    @Get('my')
    @Roles('customer')
    async getMyContradictions(@CurrentUser() user: UserProfile) {
        return this.contradictionsService.getByCustomer(user.id);
    }

    /**
     * Get all pending contradictions (admin)
     */
    @Get('pending')
    @Roles('admin')
    async getPending() {
        return this.contradictionsService.getAllPending();
    }

    /**
     * Get contradiction by ID
     */
    @Get(':id')
    @Roles('customer', 'admin')
    async findById(@Param('id') id: string) {
        return this.contradictionsService.findById(id);
    }
}
