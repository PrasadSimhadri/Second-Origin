// ===========================================
// Voice Module
// ===========================================

import { Module } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';
import { BillsModule } from '../bills/bills.module';
import { FlagsModule } from '../flags/flags.module';

@Module({
    imports: [BillsModule, FlagsModule],
    controllers: [VoiceController],
    providers: [VoiceService],
    exports: [VoiceService],
})
export class VoiceModule { }
