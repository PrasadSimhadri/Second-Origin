// ===========================================
// ScanKart Backend - App Module
// ===========================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { BillsModule } from './modules/bills/bills.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FlagsModule } from './modules/flags/flags.module';
import { ContradictionsModule } from './modules/contradictions/contradictions.module';
import { AdminModule } from './modules/admin/admin.module';
import { VoiceModule } from './modules/voice/voice.module';

// Common
import { SupabaseModule } from './common/supabase/supabase.module';

@Module({
    imports: [
        // Environment configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '../../.env.example',
        }),

        // Rate limiting - global throttler
        ThrottlerModule.forRoot([
            {
                name: 'short',
                ttl: 1000, // 1 second
                limit: 10, // 10 requests per second
            },
            {
                name: 'medium',
                ttl: 60000, // 1 minute
                limit: parseInt(process.env.RATE_LIMIT_PUBLIC || '100'),
            },
            {
                name: 'long',
                ttl: 3600000, // 1 hour
                limit: 1000,
            },
        ]),

        // Supabase client
        SupabaseModule,

        // Feature modules
        AuthModule,
        ProductsModule,
        BillsModule,
        PaymentsModule,
        FlagsModule,
        ContradictionsModule,
        AdminModule,
        VoiceModule,
    ],
    providers: [
        // Apply rate limiting globally
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule { }
