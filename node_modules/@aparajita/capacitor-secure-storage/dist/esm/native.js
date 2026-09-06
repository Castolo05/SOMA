import { SecureStorageBase } from './base';
// eslint-disable-next-line import/prefer-default-export
export class SecureStorageNative extends SecureStorageBase {
    constructor(capProxy) {
        super();
        // capProxy is a proxy of an instance of this class, so it is safe
        // to cast it to this class.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        const proxy = capProxy;
        /* eslint-disable @typescript-eslint/unbound-method */
        this.setSynchronizeKeychain = proxy.setSynchronizeKeychain;
        this.internalGetItem = proxy.internalGetItem;
        this.internalSetItem = proxy.internalSetItem;
        this.internalRemoveItem = proxy.internalRemoveItem;
        this.clearItemsWithPrefix = proxy.clearItemsWithPrefix;
        this.getPrefixedKeys = proxy.getPrefixedKeys;
        /* eslint-enable */
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async setSynchronizeKeychain(options) {
        return Promise.resolve();
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async internalGetItem(options) {
        return Promise.resolve({ data: '' });
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async internalSetItem(options) {
        return Promise.resolve();
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async internalRemoveItem(options) {
        return Promise.resolve({ success: true });
    }
    async clear(sync) {
        return this.tryOperation(async () => this.clearItemsWithPrefix({
            prefix: this.prefix,
            sync: sync !== null && sync !== void 0 ? sync : this.sync,
        }));
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async clearItemsWithPrefix(options) {
        return Promise.resolve();
    }
    // @native
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async getPrefixedKeys(options) {
        return Promise.resolve({ keys: [] });
    }
}
