/**
 * Network Detection Utility
 *
 * Detects online/offline state and provides utilities for waiting
 * for network availability. Used by cache providers and services
 * to gracefully handle offline scenarios.
 */
type NetworkStatusCallback = (isOnline: boolean) => void;
export declare class NetworkDetector {
    private isOnlineCache;
    private lastCheck;
    private readonly CHECK_INTERVAL;
    private readonly TIMEOUT;
    private listeners;
    /**
     * Check if network is available by trying to reach Door43
     */
    isOnline(): Promise<boolean>;
    /**
     * Force a network check (bypassing cache)
     */
    forceCheck(): Promise<boolean>;
    /**
     * Wait for network to become available
     * @param timeout Maximum time to wait in milliseconds
     * @param checkInterval How often to check in milliseconds
     */
    waitForOnline(timeout?: number, checkInterval?: number): Promise<boolean>;
    /**
     * Register a callback for network status changes
     */
    onStatusChange(callback: NetworkStatusCallback): () => void;
    /**
     * Notify all listeners of status change
     */
    private notifyListeners;
    /**
     * Get cached status without checking
     */
    getCachedStatus(): boolean | null;
    /**
     * Clear cached status
     */
    clearCache(): void;
}
export declare const networkDetector: NetworkDetector;
export declare const isOnline: () => Promise<boolean>;
export declare const forceNetworkCheck: () => Promise<boolean>;
export declare const waitForOnline: (timeout?: number, checkInterval?: number) => Promise<boolean>;
export declare const onNetworkStatusChange: (callback: NetworkStatusCallback) => () => void;
export {};
//# sourceMappingURL=network-detector.d.ts.map