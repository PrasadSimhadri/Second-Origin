// ===========================================
// Contradictions Module
// ===========================================

import { Module } from '@nestjs/common';
import { ContradictionsService } from './contradictions.service';
import { ContradictionsController } from './contradictions.controller';

@Module({
    controllers: [ContradictionsController],
    providers: [ContradictionsService],
    exports: [ContradictionsService],
})
export class ContradictionsModule { }
