import { Capacitor, registerPlugin } from '@capacitor/core';

const native = registerPlugin('AtlasCredential');
export const credentialStore = {
  async save(value) {
    if (window.atlasCredential) return window.atlasCredential.save(value);
    if (Capacitor.getPlatform() === 'android') return native.save({ value });
    throw new Error('Armazenamento protegido disponível apenas no aplicativo desktop ou Android.');
  },
  async read() {
    if (window.atlasCredential) return window.atlasCredential.read();
    if (Capacitor.getPlatform() === 'android') return (await native.read()).value || null;
    return null;
  },
  async clear() {
    if (window.atlasCredential) return window.atlasCredential.clear();
    if (Capacitor.getPlatform() === 'android') return native.clear();
  },
};
