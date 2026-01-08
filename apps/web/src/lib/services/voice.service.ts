// ===========================================
// Voice Service - Migrated from NestJS (Serverless compatible)
// ===========================================

import { AccessToken } from 'livekit-server-sdk';
import { BillsService } from './bills.service';
import { FlagsService, FlagReason } from './flags.service';

export type VoiceIntent =
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

export interface VoiceCommand {
    intent: VoiceIntent;
    entities: Record<string, string>;
    confidence: number;
    rawText: string;
}

// State is now passed with each request (serverless compatible)
export interface ConversationState {
    currentBillId?: string;
    currentFlagId?: string;
    awaitingConfirmation?: 'flag' | 'evidence';
    pendingFlagReason?: FlagReason;
}

export class VoiceService {
    static async generateToken(userId: string, roomName: string) {
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            throw new Error('LiveKit not configured');
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

    static async processCommand(
        guardId: string,
        command: VoiceCommand,
        state: ConversationState,
        billId?: string,
    ): Promise<{ text: string; action?: string; data?: Record<string, unknown>; state: ConversationState }> {
        if (billId) {
            state.currentBillId = billId;
        }

        let response: { text: string; action?: string; data?: Record<string, unknown> };

        switch (command.intent) {
            case 'verify_bill':
                response = await this.handleVerifyBill(state);
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
                response = this.handleAddEvidence(state);
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

        return { ...response, state };
    }

    private static async handleVerifyBill(state: ConversationState) {
        if (!state.currentBillId) {
            return { text: "Please scan the customer's QR code first.", action: 'request_scan' };
        }

        try {
            const bill = await BillsService.findById(state.currentBillId, undefined, 'guard');
            const items = (bill.items || []).map((item: { quantity: number; product: { name: string } }) =>
                `${item.quantity} ${item.product.name}`
            ).join(', ');

            return {
                text: `Bill ${bill.bill_number} has ${bill.total_items} items totaling ${bill.total_amount} rupees. Items: ${items}.`,
                action: 'show_bill',
                data: { bill },
            };
        } catch {
            return { text: "I couldn't find that bill. Please scan the QR code again.", action: 'request_scan' };
        }
    }

    private static async handleListItems(state: ConversationState) {
        if (!state.currentBillId) {
            return { text: "No bill selected. Please scan a QR code first.", action: 'request_scan' };
        }

        try {
            const bill = await BillsService.findById(state.currentBillId, undefined, 'guard');
            const itemsList = (bill.items || []).map((item: { quantity: number; product: { name: string }; unit_price: number }, i: number) =>
                `${i + 1}. ${item.quantity} ${item.product.name} at ${item.unit_price} rupees each`
            ).join('. ');

            return { text: `The bill contains: ${itemsList}`, action: 'list_items', data: { items: bill.items } };
        } catch {
            return { text: "Error fetching bill items." };
        }
    }

    private static async handleGetTotal(state: ConversationState) {
        if (!state.currentBillId) return { text: "No bill selected." };
        try {
            const bill = await BillsService.findById(state.currentBillId, undefined, 'guard');
            return { text: `The total amount is ${bill.total_amount} rupees.`, data: { total: bill.total_amount } };
        } catch {
            return { text: "Error fetching bill total." };
        }
    }

    private static async handleCountItems(state: ConversationState) {
        if (!state.currentBillId) return { text: "No bill selected." };
        try {
            const bill = await BillsService.findById(state.currentBillId, undefined, 'guard');
            return { text: `The bill has ${bill.total_items} items.`, data: { count: bill.total_items } };
        } catch {
            return { text: "Error counting items." };
        }
    }

    private static async handleFlagBill(guardId: string, state: ConversationState, command: VoiceCommand) {
        if (!state.currentBillId) {
            return { text: "No bill selected. Please scan the QR code first.", action: 'request_scan' };
        }

        const reason = command.entities?.reason as FlagReason | undefined;
        if (reason) {
            state.pendingFlagReason = reason;
            state.awaitingConfirmation = 'flag';
            return {
                text: `I'll flag this bill for ${reason.replace('_', ' ')}. Say "confirm" to proceed or "cancel" to go back.`,
                action: 'await_confirmation',
            };
        }

        return { text: "What's the reason for flagging? Say: item mismatch, quantity mismatch, suspected theft, or other.", action: 'await_reason' };
    }

    private static handleAddEvidence(state: ConversationState) {
        if (!state.currentFlagId) {
            return { text: "You need to create a flag first before adding evidence." };
        }
        state.awaitingConfirmation = 'evidence';
        return { text: "Opening camera. Take a photo of the discrepancy.", action: 'open_camera', data: { flagId: state.currentFlagId } };
    }

    private static async handleConfirm(guardId: string, state: ConversationState) {
        if (state.awaitingConfirmation === 'flag' && state.currentBillId && state.pendingFlagReason) {
            try {
                const flag = await FlagsService.create(guardId, {
                    billId: state.currentBillId,
                    reason: state.pendingFlagReason,
                });
                state.currentFlagId = flag.id;
                state.awaitingConfirmation = undefined;
                state.pendingFlagReason = undefined;
                return { text: "Flag submitted successfully. Would you like to add photo evidence?", action: 'flag_created', data: { flag } };
            } catch {
                return { text: "Failed to create flag. Please try again." };
            }
        }
        return { text: "Nothing to confirm. What would you like to do?" };
    }

    private static handleCancel(state: ConversationState) {
        state.awaitingConfirmation = undefined;
        state.pendingFlagReason = undefined;
        return { text: "Cancelled. What would you like to do?", action: 'cancelled' };
    }

    private static handleHelp() {
        return { text: "I can help you verify bills. Say: verify bill, list items, how many items, what's the total, flag customer, or add evidence." };
    }

    static parseCommand(text: string): VoiceCommand {
        const lowerText = text.toLowerCase().trim();
        const patterns: { intent: VoiceIntent; patterns: RegExp[] }[] = [
            { intent: 'verify_bill', patterns: [/verify.*bill/, /check.*bill/, /scan.*bill/, /show.*bill/] },
            { intent: 'list_items', patterns: [/list.*items/, /what.*items/, /show.*items/, /read.*items/] },
            { intent: 'get_total', patterns: [/total.*amount/, /how much/, /what.*total/, /bill.*amount/] },
            { intent: 'count_items', patterns: [/how many.*items/, /item.*count/, /number of items/, /count.*items/] },
            { intent: 'flag_bill', patterns: [/flag.*customer/, /flag.*bill/, /report/, /flag this/] },
            { intent: 'add_evidence', patterns: [/add.*evidence/, /add.*photo/, /take.*photo/, /upload.*image/] },
            { intent: 'confirm', patterns: [/^yes$/, /^confirm$/, /^proceed$/, /^okay$/, /^ok$/] },
            { intent: 'cancel', patterns: [/^no$/, /^cancel$/, /^stop$/, /never mind/, /go back/] },
            { intent: 'help', patterns: [/^help$/, /what can you do/, /commands/] },
        ];

        for (const { intent, patterns: patternList } of patterns) {
            for (const pattern of patternList) {
                if (pattern.test(lowerText)) {
                    const entities: Record<string, string> = {};
                    if (intent === 'flag_bill') {
                        if (/item.*mismatch/.test(lowerText)) entities.reason = 'item_mismatch';
                        else if (/quantity.*mismatch/.test(lowerText)) entities.reason = 'quantity_mismatch';
                        else if (/theft/.test(lowerText)) entities.reason = 'suspected_theft';
                        else if (/other/.test(lowerText)) entities.reason = 'other';
                    }
                    return { intent, entities, confidence: 0.9, rawText: text };
                }
            }
        }

        return { intent: 'unknown', entities: {}, confidence: 0.5, rawText: text };
    }
}
