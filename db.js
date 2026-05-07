// ============================================================
// SUPABASE DB & STORAGE
// ============================================================
const DB = {
    async query(path, opts = {}) {
        const res = await fetch(CONFIG.SUPABASE.URL + '/rest/v1/' + path, {
            ...opts,
            cache: 'no-store',
            headers: {
                'apikey': CONFIG.SUPABASE.KEY,
                'Authorization': 'Bearer ' + CONFIG.SUPABASE.KEY,
                'Content-Type': 'application/json',
                'Prefer': opts.prefer || 'return=representation',
                ...opts.headers
            }
        });
        const text = await res.text();
        if (!res.ok) throw new Error(`DB Error ${res.status}: ${text.substring(0, 200)}`);
        return text ? JSON.parse(text) : null;
    },

    async select(table, params = '') {
        return this.query(`${table}?${params}`);
    },

    async insert(table, payload) {
        return this.query(table, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    },

    async update(table, params, payload) {
        return this.query(`${table}?${params}`, {
            method: 'PATCH',
            prefer: 'return=minimal',
            body: JSON.stringify(payload)
        });
    },

    async uploadFile(bucket, path, blob, contentType = 'image/jpeg') {
        const res = await fetch(`${CONFIG.SUPABASE.URL}/storage/v1/object/${bucket}/${path}`, {
            method: 'POST',
            headers: {
                'apikey': CONFIG.SUPABASE.KEY,
                'Authorization': 'Bearer ' + CONFIG.SUPABASE.KEY,
                'Content-Type': contentType,
                'x-upsert': 'false'
            },
            body: blob
        });
        if (!res.ok) { const t = await res.text(); throw new Error(t); }
        return `${CONFIG.SUPABASE.URL}/storage/v1/object/public/${bucket}/${path}`;
    }
};
