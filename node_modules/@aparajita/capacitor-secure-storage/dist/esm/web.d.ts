import { SecureStorageBase } from './base';
export declare class SecureStorageWeb extends SecureStorageBase {
    protected setSynchronizeKeychain(options: {
        sync: boolean;
    }): Promise<void>;
    protected internalGetItem(options: {
        prefixedKey: string;
    }): Promise<{
        data: string | null;
    }>;
    protected internalSetItem(options: {
        prefixedKey: string;
        data: string;
    }): Promise<void>;
    protected internalRemoveItem(options: {
        prefixedKey: string;
    }): Promise<{
        success: boolean;
    }>;
    clear(): Promise<void>;
    protected clearItemsWithPrefix(options: {
        prefix: string;
    }): Promise<void>;
    protected getPrefixedKeys(options: {
        prefix: string;
    }): Promise<{
        keys: string[];
    }>;
}
