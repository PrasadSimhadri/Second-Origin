// ===========================================
// Flags Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FlagsService, CreateFlagDto } from './flags.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
}

class AddEvidenceDto {
    imageData: string; // Base64 encoded image
}

@Controller('flags')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FlagsController {
    constructor(private readonly flagsService: FlagsService) { }

    /**
     * Create a flag (guards only)
     */
    @Post()
    @Roles('guard')
    async create(
        @CurrentUser() user: UserProfile,
        @Body() dto: CreateFlagDto,
    ) {
        return this.flagsService.create(user.id, dto);
    }

    /**
     * Upload evidence file
     */
    @Post(':id/evidence/upload')
    @Roles('guard')
    @UseInterceptors(FileInterceptor('file'))
    async uploadEvidence(
        @Param('id') flagId: string,
        @CurrentUser() user: UserProfile,
        @UploadedFile() file: Express.Multer.File,
    ) {
        return this.flagsService.uploadEvidence(user.id, flagId, file);
    }

    /**
     * Add evidence as base64 (for camera capture)
     */
    @Post(':id/evidence')
    @Roles('guard')
    async addEvidence(
        @Param('id') flagId: string,
        @CurrentUser() user: UserProfile,
        @Body() dto: AddEvidenceDto,
    ) {
        return this.flagsService.addEvidenceUrl(user.id, flagId, dto.imageData);
    }

    /**
     * Get guard's own flags
     */
    @Get('my')
    @Roles('guard')
    async getMyFlags(@CurrentUser() user: UserProfile) {
        return this.flagsService.getByGuard(user.id);
    }

    /**
     * Get all pending flags (admin)
     */
    @Get('pending')
    @Roles('admin')
    async getPending() {
        return this.flagsService.getAllPending();
    }

    /**
     * Get flag by ID
     */
    @Get(':id')
    @Roles('guard', 'admin')
    async findById(@Param('id') id: string) {
        return this.flagsService.findById(id);
    }
}
