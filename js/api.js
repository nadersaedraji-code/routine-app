import * as cloud from './cloud.js?v=20261124204157';

/* The published app is cloud-first. The old local server remains useful for
 * development, but the phone and Mac now talk to the same private space. */
export const api = {
  mode: 'cloud',
  clientId: `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,

  acceptKeyFromUrl: cloud.acceptKeyFromUrl,
  hasKey: cloud.hasKey,
  getKey: cloud.getKey,
  keyPreview: cloud.keyPreview,
  connect: cloud.connect,
  clearKey: cloud.clearKey,

  async loadInitial() {
    return cloud.loadInitial();
  },

  async loadState() {
    return cloud.pullChanges();
  },

  async saveState(state) {
    return cloud.pushState(state);
  },
};
