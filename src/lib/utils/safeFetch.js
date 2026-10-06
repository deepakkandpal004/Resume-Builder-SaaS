import { lookup } from "node:dns/promises";
// Fetch a user-supplied URL with basic SSRF protection:
// - only http(s), no credentials in URL
// - hostname must not resolve to a private / loopback / link-local address
// - redirects are followed manually (max 5) and re-validated hop by hop
// - request timeout is always cleared
// Returns the raw response text (sliced to a sane size), or null on any failure.
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 5;
const MAX_BYTES = 1_000_000;
const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const isBlockedIp = (ip) => {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        const [a, b] = ip.split(".").map(Number);
        if (a === 10)
            return true; // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31)
            return true; // 172.16.0.0/12
        if (a === 192 && b === 168)
            return true; // 192.168.0.0/16
        if (a === 127)
            return true; // 127.0.0.0/8 loopback
        if (a === 169 && b === 254)
            return true; // 169.254.0.0/16 link-local
        if (a === 0)
            return true; // 0.0.0.0/8
        return false;
    }
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::")
        return true;
    if (v.startsWith("fe80:"))
        return true; // fe80::/10 link-local
    if (v.startsWith("fc") || v.startsWith("fd"))
        return true; // fc00::/7 unique-local
    return false;
};
const assertSafeUrl = async (raw) => {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
        throw new Error("Only http(s) URLs are allowed");
    }
    if (u.username || u.password) {
        throw new Error("Credentials in URL are not allowed");
    }
    const { address } = await lookup(u.hostname);
    if (isBlockedIp(address)) {
        throw new Error("Blocked host address");
    }
    return u;
};
export const safeFetchText = async (rawUrl, opts) => {
    const timeoutMs = opts?.timeoutMs ?? TIMEOUT_MS;
    let current = rawUrl;
    try {
        for (let i = 0; i <= MAX_REDIRECTS; i++) {
            const url = await assertSafeUrl(current);
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
                const res = await fetch(url.toString(), {
                    signal: ctrl.signal,
                    redirect: "manual",
                    headers: { "User-Agent": BROWSER_UA, Accept: "text/html" },
                });
                if (res.status >= 300 && res.status < 400) {
                    const loc = res.headers.get("location");
                    if (!loc)
                        return null;
                    current = new URL(loc, url.toString()).toString();
                    continue;
                }
                if (!res.ok)
                    return null;
                const text = await res.text();
                return text.slice(0, MAX_BYTES);
            }
            finally {
                clearTimeout(timer);
            }
        }
        return null; // too many redirects
    }
    catch {
        return null;
    }
};
