import { registerPlugin } from '@capacitor/core';
const proxy = registerPlugin('SecureStorage', {
    web: async () => import('./web').then((module) => new module.SecureStorageWeb()),
    ios: async () => import('./native').then((module) => new module.SecureStorageNative(proxy)),
    android: async () => import('./native').then((module) => new module.SecureStorageNative(proxy)),
});
export * from './definitions';
export { proxy as SecureStorage };
