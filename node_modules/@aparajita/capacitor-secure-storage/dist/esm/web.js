import { SecureStorageBase } from './base';
// eslint-disable-next-line import/prefer-default-export
export class SecureStorageWeb extends SecureStorageBase {
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async setSynchronizeKeychain(options) {
        return Promise.resolve();
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/require-await
    async internalGetItem(options) {
        return { data: localStorage.getItem(options.prefixedKey) };
    }
    // @native
    async internalSetItem(options) {
        localStorage.setItem(options.prefixedKey, options.data);
        return Promise.resolve();
    }
    // @native
    async internalRemoveItem(options) {
        const item = localStorage.getItem(options.prefixedKey);
        if (item !== null) {
            localStorage.removeItem(options.prefixedKey);
            return Promise.resolve({ success: true });
        }
        return Promise.resolve({ success: false });
    }
    async clear() {
        const { keys } = await this.getPrefixedKeys({ prefix: this.prefix });
        keys.forEach((key) => {
            localStorage.removeItem(key);
        });
        return Promise.resolve();
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/require-await,@typescript-eslint/no-unused-vars
    async clearItemsWithPrefix(options) {
        console.warn('clearItemsWithPrefix is native only');
    }
    // @native
    async getPrefixedKeys(options) {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key === null || key === void 0 ? void 0 : key.startsWith(options.prefix)) {
                keys.push(key);
            }
        }
        return Promise.resolve({ keys });
    }
}
