// ===========================================
// Voice Controller
// ===========================================

import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import { VoiceService } from './voice.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface UserProfile {
    id: string;
}

class ProcessCommandDto {
    text: string;
    billId?: string;
}

class GenerateSpeechDto {
    text: string;
}

@Controller('voice')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoiceController {
    constructor(private readonly voiceService: VoiceService) { }

    /**
     * Get LiveKit token for joining voice room
     */
    @Get('token')
    @Roles('guard')
    async getToken(
        @CurrentUser() user: UserProfile,
        @Query('room') roomName?: string,
    ) {
        const room = roomName || `guard-${user.id}`;
        return this.voiceService.generateToken(user.id, room);
    }

    /**
     * Process voice command (for text-based testing)
     */
    @Post('command')
    @Roles('guard')
    async processCommand(
        @CurrentUser() user: UserProfile,
        @Body() dto: ProcessCommandDto,
    ) {
        const command = this.voiceService.parseCommand(dto.text);
        const response = await this.voiceService.processCommand(
            user.id,
            command,
            dto.billId,
        );

        // Generate TTS if available
        const speechResponse = await this.voiceService.generateSpeech(response.text);

        return {
            ...response,
            audioUrl: speechResponse.audioUrl,
            parsedCommand: command,
        };
    }

    /**
     * Generate speech from text (TTS)
     */
    @Post('speak')
    @Roles('guard')
    async generateSpeech(@Body() dto: GenerateSpeechDto) {
        return this.voiceService.generateSpeech(dto.text);
    }

    /**
     * Clear conversation state
     */
    @Post('clear')
    @Roles('guard')
    async clearState(@CurrentUser() user: UserProfile) {
        this.voiceService.clearState(user.id);
        return { success: true };
    }
}
