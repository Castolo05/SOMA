import { SecureStorageBase } from './base';
import type { KeychainAccess, SecureStoragePlugin } from './definitions';
export declare class SecureStorageNative extends SecureStorageBase {
    constructor(capProxy: SecureStoragePlugin);
    protected setSynchronizeKeychain(options: {
        sync: boolean;
    }): Promise<void>;
    protected internalGetItem(options: {
        prefixedKey: string;
        sync: boolean;
    }): Promise<{
        data: string;
    }>;
    protected internalSetItem(options: {
        prefixedKey: string;
        data: string;
        sync: boolean;
        access: KeychainAccess;
    }): Promise<void>;
    protected internalRemoveItem(options: {
        prefixedKey: string;
        sync: boolean;
    }): Promise<{
        success: boolean;
    }>;
    clear(sync?: boolean): Promise<void>;
    protected clearItemsWithPrefix(options: {
        prefix: string;
        sync: boolean;
    }): Promise<void>;
    protected getPrefixedKeys(options: {
        prefix: string;
        sync: boolean;
    }): Promise<{
        keys: string[];
    }>;
}
