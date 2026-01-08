// ===========================================
// Flags Module
// ===========================================

import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FlagsService } from './flags.service';
import { FlagsController } from './flags.controller';

@Module({
    imports: [
        MulterModule.register({
            limits: {
                fileSize: 10 * 1024 * 1024, // 10MB limit
            },
        }),
    ],
    controllers: [FlagsController],
    providers: [FlagsService],
    exports: [FlagsService],
})
export class FlagsModule { }
