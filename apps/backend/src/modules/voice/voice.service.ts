// ===========================================
// Voice Agent Service
// ===========================================

import { Injectable, BadRequestException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { SupabaseService } from '../../common/supabase/supabase.service';
import { BillsService } from '../bills/bills.service';
import { FlagsService, FlagReason } from '../flags/flags.service';

// Voice command intents
type VoiceIntent =
    | 'verify_bill'
    | 'flag_bill'
    | 'list_items'
    | 'get_total'
    | 'count_items'
    | 'add_evidence'
    | 'help'
    | 'confirm'
    | 'cancel'
    | 'unknown';

interface VoiceCommand {
    intent: VoiceIntent;
    entities: Record<string, string>;
    confidence: number;
    rawText: string;
}

interface ConversationState {
    currentBillId?: string;
    currentFlagId?: string;
    awaitingConfirmation?: 'flag' | 'evidence';
    pendingFlagReason?: FlagReason;
    lastResponse?: string;
}

@Injectable()
export class VoiceService {
    private conversationStates: Map<string, ConversationState> = new Map();

    constructor(
        private readonly supabaseService: SupabaseService,
        private readonly billsService: BillsService,
        private readonly flagsService: FlagsService,
    ) { }

    /**
     * Generate LiveKit access token for guard
     */
    async generateToken(userId: string, roomName: string) {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw new BadRequestException('LiveKit not configured');
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: userId,
            ttl: '1h',
        });

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
        });

        const token = await at.toJwt();

        return {
            token,
            roomName,
            url: process.env.LIVEKIT_URL,
        };
    }

    /**
     * Process voice command
     */
    async processCommand(
        guardId: string,
        command: VoiceCommand,
        billId?: string,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        // Get or create conversation state
        let state = this.conversationStates.get(guardId) || {};

        if (billId) {
            state.currentBillId = billId;
        }

        let response: { text: string; action?: string; data?: Record<string, unknown> };

        switch (command.intent) {
            case 'verify_bill':
                response = await this.handleVerifyBill(guardId, state);
                break;

            case 'list_items':
                response = await this.handleListItems(state);
                break;

            case 'get_total':
                response = await this.handleGetTotal(state);
                break;

            case 'count_items':
                response = await this.handleCountItems(state);
                break;

            case 'flag_bill':
                response = await this.handleFlagBill(guardId, state, command);
                break;

            case 'add_evidence':
                response = await this.handleAddEvidence(state);
                break;

            case 'confirm':
                response = await this.handleConfirm(guardId, state);
                break;

            case 'cancel':
                response = this.handleCancel(state);
                break;

            case 'help':
                response = this.handleHelp();
                break;

            default:
                response = {
                    text: "I didn't understand that. You can say: verify bill, list items, flag customer, or help.",
                };
        }

        // Save state
        this.conversationStates.set(guardId, state);
        state.lastResponse = response.text;

        return response;
    }

    /**
     * Handle verify bill command
     */
    private async handleVerifyBill(
        guardId: string,
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentBillId) {
            return {
                text: "Please scan the customer's QR code first.",
                action: 'request_scan',
            };
        }

        try {
            const bill = await this.billsService.findById(state.currentBillId, undefined, 'guard') as {
                bill_number: string;
                total_items: number;
                total_amount: number;
                items: Array<{ product: { name: string }; quantity: number }>;
            };

            const itemsList = bill.items
                .map((item: { product: { name: string }; quantity: number }) => `${item.quantity} ${item.product.name}`)
                .join(', ');

            return {
                text: `Bill ${bill.bill_number} has ${bill.total_items} items totaling ${bill.total_amount} rupees. Items: ${itemsList}. Say "approve" to verify or "flag" to report an issue.`,
                action: 'show_bill',
                data: { bill },
            };
        } catch {
            return {
                text: "I couldn't find that bill. Please scan the QR code again.",
                action: 'request_scan',
            };
        }
    }

    /**
     * Handle list items command
     */
    private async handleListItems(
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentBillId) {
            return {
                text: "No bill selected. Please scan a QR code first.",
                action: 'request_scan',
            };
        }

        try {
            const bill = await this.billsService.findById(state.currentBillId, undefined, 'guard') as {
                items: Array<{ product: { name: string }; quantity: number; unit_price: number }>;
            };

            const itemsList = bill.items
                .map((item: { product: { name: string }; quantity: number; unit_price: number }, i: number) =>
                    `${i + 1}. ${item.quantity} ${item.product.name} at ${item.unit_price} rupees each`
                )
                .join('. ');

            return {
                text: `The bill contains: ${itemsList}`,
                action: 'list_items',
                data: { items: bill.items },
            };
        } catch {
            return { text: "Error fetching bill items." };
        }
    }

    /**
     * Handle get total command
     */
    private async handleGetTotal(
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentBillId) {
            return { text: "No bill selected." };
        }

        try {
            const bill = await this.billsService.findById(state.currentBillId, undefined, 'guard') as {
                total_amount: number;
            };
            return {
                text: `The total amount is ${bill.total_amount} rupees.`,
                data: { total: bill.total_amount },
            };
        } catch {
            return { text: "Error fetching bill total." };
        }
    }

    /**
     * Handle count items command
     */
    private async handleCountItems(
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentBillId) {
            return { text: "No bill selected." };
        }

        try {
            const bill = await this.billsService.findById(state.currentBillId, undefined, 'guard') as {
                total_items: number;
            };
            return {
                text: `The bill has ${bill.total_items} items.`,
                data: { count: bill.total_items },
            };
        } catch {
            return { text: "Error counting items." };
        }
    }

    /**
     * Handle flag bill command
     */
    private async handleFlagBill(
        guardId: string,
        state: ConversationState,
        command: VoiceCommand,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentBillId) {
            return {
                text: "No bill selected. Please scan the QR code first.",
                action: 'request_scan',
            };
        }

        // Check if reason is provided
        const reason = command.entities?.reason as FlagReason | undefined;

        if (reason) {
            state.pendingFlagReason = reason;
            state.awaitingConfirmation = 'flag';
            return {
                text: `I'll flag this bill for ${reason.replace('_', ' ')}. Say "confirm" to proceed or "cancel" to go back.`,
                action: 'await_confirmation',
            };
        }

        // Ask for reason
        return {
            text: "What's the reason for flagging? Say: item mismatch, quantity mismatch, suspected theft, or other.",
            action: 'await_reason',
        };
    }

    /**
     * Handle add evidence command
     */
    private async handleAddEvidence(
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (!state.currentFlagId) {
            return {
                text: "You need to create a flag first before adding evidence.",
            };
        }

        state.awaitingConfirmation = 'evidence';
        return {
            text: "Opening camera. Take a photo of the discrepancy and tap confirm when done.",
            action: 'open_camera',
            data: { flagId: state.currentFlagId },
        };
    }

    /**
     * Handle confirm command
     */
    private async handleConfirm(
        guardId: string,
        state: ConversationState,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown> }> {
        if (state.awaitingConfirmation === 'flag' && state.currentBillId && state.pendingFlagReason) {
            try {
                const flag = await this.flagsService.create(guardId, {
                    billId: state.currentBillId,
                    reason: state.pendingFlagReason,
                });

                state.currentFlagId = flag.id;
                state.awaitingConfirmation = undefined;
                state.pendingFlagReason = undefined;

                return {
                    text: "Flag submitted successfully. Would you like to add photo evidence? Say yes or no.",
                    action: 'flag_created',
                    data: { flag },
                };
            } catch {
                return { text: "Failed to create flag. Please try again." };
            }
        }

        return {
            text: "Nothing to confirm. What would you like to do?",
        };
    }

    /**
     * Handle cancel command
     */
    private handleCancel(state: ConversationState): { text: string; action?: string } {
        state.awaitingConfirmation = undefined;
        state.pendingFlagReason = undefined;

        return {
            text: "Cancelled. What would you like to do?",
            action: 'cancelled',
        };
    }

    /**
     * Handle help command
     */
    private handleHelp(): { text: string } {
        return {
            text: "I can help you verify bills. Just say: verify bill, list items, how many items, what's the total, flag customer, or add evidence.",
        };
    }

    /**
     * Parse voice command text to intent
     */
    parseCommand(text: string): VoiceCommand {
        const lowerText = text.toLowerCase().trim();

        // Intent patterns
        const patterns: { intent: VoiceIntent; patterns: RegExp[] }[] = [
            {
                intent: 'verify_bill',
                patterns: [/verify.*bill/, /check.*bill/, /scan.*bill/, /show.*bill/],
            },
            {
                intent: 'list_items',
                patterns: [/list.*items/, /what.*items/, /show.*items/, /read.*items/],
            },
            {
                intent: 'get_total',
                patterns: [/total.*amount/, /how much/, /what.*total/, /bill.*amount/],
            },
            {
                intent: 'count_items',
                patterns: [/how many.*items/, /item.*count/, /number of items/, /count.*items/],
            },
            {
                intent: 'flag_bill',
                patterns: [/flag.*customer/, /flag.*bill/, /report/, /flag this/],
            },
            {
                intent: 'add_evidence',
                patterns: [/add.*evidence/, /add.*photo/, /take.*photo/, /upload.*image/],
            },
            {
                intent: 'confirm',
                patterns: [/^yes$/, /^confirm$/, /^proceed$/, /^okay$/, /^ok$/],
            },
            {
                intent: 'cancel',
                patterns: [/^no$/, /^cancel$/, /^stop$/, /never mind/, /go back/],
            },
            {
                intent: 'help',
                patterns: [/^help$/, /what can you do/, /commands/],
            },
        ];

        // Find matching intent
        for (const { intent, patterns: patternList } of patterns) {
            for (const pattern of patternList) {
                if (pattern.test(lowerText)) {
                    // Extract entities
                    const entities: Record<string, string> = {};

                    // Extract flag reason if present
                    if (intent === 'flag_bill') {
                        if (/item.*mismatch/.test(lowerText)) entities.reason = 'item_mismatch';
                        else if (/quantity.*mismatch/.test(lowerText)) entities.reason = 'quantity_mismatch';
                        else if (/theft/.test(lowerText)) entities.reason = 'suspected_theft';
                        else if (/other/.test(lowerText)) entities.reason = 'other';
                    }

                    return {
                        intent,
                        entities,
                        confidence: 0.9,
                        rawText: text,
                    };
                }
            }
        }

        return {
            intent: 'unknown',
            entities: {},
            confidence: 0.5,
            rawText: text,
        };
    }

    /**
     * Generate TTS audio using Murf AI
     */
    async generateSpeech(text: string): Promise<{ audioUrl?: string; text: string }> {
        const apiKey = process.env.MURF_API_KEY;

        if (!apiKey) {
            return { text }; // Return text-only if Murf not configured
        }

        try {
            const response = await fetch('https://api.murf.ai/v1/speech/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': apiKey,
                },
                body: JSON.stringify({
                    text,
                    voiceId: 'en-IN-aarav', // Indian English male voice
                    style: 'conversational',
                    format: 'mp3',
                    sampleRate: 48000,
                }),
            });

            if (!response.ok) {
                console.error('Murf API error:', await response.text());
                return { text };
            }

            const data = await response.json();
            return {
                text,
                audioUrl: data.audioFile,
            };
        } catch (error) {
            console.error('Murf API error:', error);
            return { text };
        }
    }

    /**
     * Clear conversation state
     */
    clearState(guardId: string) {
        this.conversationStates.delete(guardId);
    }
}
