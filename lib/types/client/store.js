import { defineStore } from '@deepseek-ai/dsh-client-store';
export function createReaderStore() {
    return defineStore({
        init: () => ({ expanded: {}, motion: true }),
        persist: 'dsh.reader.v1',
        actions: {
            setExpanded: (draft, key, value) => { draft.expanded[key] = value; },
            setMotion: (draft, value) => { draft.motion = value; },
        },
    });
}
//# sourceMappingURL=store.js.map