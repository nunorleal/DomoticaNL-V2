export const bridge = window.parent !== window ? (window.parent as any).CasaMeteoBridge : null;
export function openCasaSettings() { bridge?.settings(); }
