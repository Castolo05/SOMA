import { Capacitor, CapacitorException, WebPlugin } from '@capacitor/core';
import { KeychainAccess, StorageError, StorageErrorType } from './definitions';
function isStorageErrorType(value) {
    return value !== undefined && Object.keys(StorageErrorType).includes(value);
}
export class SecureStorageBase extends WebPlugin {
    constructor() {
        super(...arguments);
        this.prefix = 'capacitor-storage_';
        this.sync = false;
        this.access = KeychainAccess.whenUnlocked;
    }
    async setSynchronize(sync) {
        this.sync = sync;
        if (Capacitor.getPlatform() === 'ios') {
            return this.setSynchronizeKeychain({ sync });
        }
        // no-op on other platforms
        return Promise.resolve();
    }
    async getSynchronize() {
        return Promise.resolve(this.sync);
    }
    async setDefaultKeychainAccess(access) {
        this.access = access;
        return Promise.resolve();
    }
    async tryOperation(operation) {
        try {
            // Ensure that only one operation is in progress at a time.
            return await operation();
        }
        catch (e) {
            // Native calls which reject will throw a CapacitorException with a code.
            // We want to convert these to StorageErrors.
            if (e instanceof CapacitorException && isStorageErrorType(e.code)) {
                throw new StorageError(e.message, e.code);
            }
            throw e;
        }
    }
    async get(key, convertDate = true, sync) {
        if (key) {
            const { data } = await this.tryOperation(async () => this.internalGetItem({
                prefixedKey: this.prefixedKey(key),
                sync: sync !== null && sync !== void 0 ? sync : this.sync,
            }));
            if (data === null) {
                return null;
            }
            if (convertDate) {
                const date = parseISODate(data);
                if (date) {
                    return date;
                }
            }
            try {
                return JSON.parse(data);
            }
            catch (e) {
                throw new StorageError('Invalid data', StorageErrorType.invalidData);
            }
        }
        return SecureStorageBase.missingKey();
    }
    async getItem(key) {
        if (key) {
            const { data } = await this.tryOperation(async () => this.internalGetItem({
                prefixedKey: this.prefixedKey(key),
                sync: this.sync,
            }));
            return data;
        }
        return null;
    }
    async set(key, data, convertDate = true, sync, access) {
        if (key) {
            let convertedData = data;
            if (convertDate && data instanceof Date) {
                convertedData = data.toISOString();
            }
            return this.tryOperation(async () => this.internalSetItem({
                prefixedKey: this.prefixedKey(key),
                data: JSON.stringify(convertedData),
                sync: sync !== null && sync !== void 0 ? sync : this.sync,
                access: access !== null && access !== void 0 ? access : this.access,
            }));
        }
        return SecureStorageBase.missingKey();
    }
    async setItem(key, value) {
        if (key) {
            return this.tryOperation(async () => this.internalSetItem({
                prefixedKey: this.prefixedKey(key),
                data: value,
                sync: this.sync,
                access: this.access,
            }));
        }
        return SecureStorageBase.missingKey();
    }
    async remove(key, sync) {
        if (key) {
            const { success } = await this.tryOperation(async () => this.internalRemoveItem({
                prefixedKey: this.prefixedKey(key),
                sync: sync !== null && sync !== void 0 ? sync : this.sync,
            }));
            return success;
        }
        return SecureStorageBase.missingKey();
    }
    async removeItem(key) {
        if (key) {
            await this.tryOperation(async () => this.internalRemoveItem({
                prefixedKey: this.prefixedKey(key),
                sync: this.sync,
            }));
            return;
        }
        SecureStorageBase.missingKey();
    }
    async keys(sync) {
        const { keys } = await this.tryOperation(async () => this.getPrefixedKeys({
            prefix: this.prefix,
            sync: sync !== null && sync !== void 0 ? sync : this.sync,
        }));
        const prefixLength = this.prefix.length;
        return keys.map((key) => key.slice(prefixLength));
    }
    async getKeyPrefix() {
        return Promise.resolve(this.prefix);
    }
    async setKeyPrefix(prefix) {
        this.prefix = prefix;
        return Promise.resolve();
    }
    prefixedKey(key) {
        return this.prefix + key;
    }
    static missingKey() {
        throw new StorageError('No key provided', StorageErrorType.missingKey);
    }
}
// RegExp to match an ISO 8601 date string in the form YYYY-MM-DDTHH:mm:ss.sssZ
const isoDateRE = /^"(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z"$/u;
function parseISODate(isoDate) {
    const match = isoDateRE.exec(isoDate);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1; // month is zero-based
        const day = parseInt(match[3], 10);
        const hour = parseInt(match[4], 10);
        const minute = parseInt(match[5], 10);
        const second = parseInt(match[6], 10);
        const millis = parseInt(match[7], 10);
        const epochTime = Date.UTC(year, month, day, hour, minute, second, millis);
        return new Date(epochTime);
        /* eslint-enable */
    }
    return null;
}
