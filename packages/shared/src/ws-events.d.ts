import type { PrintJobStatus, PrinterStatus } from './enums';
export interface AgentAssignedJobPayload {
    id: string;
    fileUrl: string;
    fileName: string;
    fileHash?: string;
    printerId: string;
    copies: number;
    duplex: boolean;
    color: boolean;
    paperSize: string;
    pageRange?: string;
}
/**
 * Server → Client events. Clients (web, admin, agent) subscribe to rooms
 * keyed by jobId, printerId, or shopId.
 */
export interface ServerToClientEvents {
    'job:status': (p: {
        jobId: string;
        status: PrintJobStatus;
        eta?: number;
    }) => void;
    'job:progress': (p: {
        jobId: string;
        pagesPrinted: number;
        pagesTotal: number;
    }) => void;
    'printer:status': (p: {
        printerId: string;
        status: PrinterStatus;
        paperLevel?: number;
        tonerLevel?: number;
        message?: string;
    }) => void;
    'agent:job-assigned': (p: AgentAssignedJobPayload) => void;
    'queue:paused': (p: {
        shopId: string;
        reason: string;
    }) => void;
    'queue:resumed': (p: {
        shopId: string;
    }) => void;
    'queue:position': (p: {
        jobId: string;
        position: number;
        etaSeconds: number;
    }) => void;
}
/**
 * Client → Server events. Mostly emitted by the print agent.
 */
export interface ClientToServerEvents {
    'agent:heartbeat': (p: {
        agentId: string;
        shopId: string;
        printers: {
            id: string;
            status: PrinterStatus;
        }[];
    }) => void;
    'agent:job-claimed': (p: {
        jobId: string;
        agentId: string;
    }) => void;
    'agent:job-result': (p: {
        jobId: string;
        status: 'completed' | 'failed';
        error?: string;
        pagesPrinted?: number;
    }) => void;
    'agent:printer-event': (p: {
        printerId: string;
        status: PrinterStatus;
        detail?: string;
    }) => void;
    'subscribe:job': (jobId: string) => void;
    'subscribe:shop': (shopId: string) => void;
}
export declare const WS_NAMESPACE = "/realtime";
