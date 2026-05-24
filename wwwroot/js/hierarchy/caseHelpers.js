/** Read property supporting PascalCase or camelCase API payloads. */
export function pick(obj, ...keys) {
    if (!obj) return undefined;
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

export function fullName(user) {
    const first = pick(user, 'firstName', 'FirstName') ?? '';
    const last = pick(user, 'lastName', 'LastName') ?? '';
    return `${first} ${last}`.trim() || pick(user, 'email', 'Email') || 'User';
}

export function slugCode(name, prefix = 'SG') {
    const base = String(name || 'item')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toUpperCase()
        .slice(0, 12);
    return `${prefix}-${base || 'NEW'}-${Date.now().toString(36).slice(-4).toUpperCase()}`;
}
