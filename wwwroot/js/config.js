/**
 * Runtime config — apiBaseUrl from layout inline script or default.
 */
export function getApiBaseUrl() {
    const fromWindow = typeof window !== 'undefined' && window.__OPSTRACKER_CONFIG?.apiBaseUrl;
    return (fromWindow || 'http://localhost:5085').replace(/\/$/, '');
}
