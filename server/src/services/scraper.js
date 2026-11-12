import * as cheerio from "cheerio";
import AppError from "../utils/AppError.js";

const TIMEOUT_MS = 15000;

// "example.com" -> "https://example.com/". Rejects non-http(s) and local addresses.
export function normalizeUrl(input) {
    let raw = String(input || "").trim();
    if (!raw) throw new AppError("Please enter a URL");
    if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

    let url;
    try {
        url = new URL(raw);
    } catch {
        throw new AppError("That doesn't look like a valid URL");
    }

    const host = url.hostname.toLowerCase();
    const isLocal =
        host === "localhost" || host.endsWith(".local") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host.startsWith("[");
    if (isLocal || !host.includes(".")) throw new AppError("Please enter a public website URL");

    return url.href;
}

const sameSite = (a, b) => a.replace(/^www\./, "") === b.replace(/^www\./, "");

// Downloads the page and extracts the data the Gemini prompt needs
export async function scrapeWebsite(targetUrl) {
    const start = Date.now();
    let res, html;

    try {
        res = await fetch(targetUrl, {
            redirect: "follow",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
            },
        });
        html = await res.text();
    } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            throw new AppError("The website took longer than 15 seconds to respond. Try again or try another URL.", 504);
        }
        const code = err.cause?.code;
        if (code === "ENOTFOUND" || code === "EAI_AGAIN") throw new AppError("Could not find that website. Check the URL for typos.", 422);
        throw new AppError("Could not connect to the website. It may be down or blocking automated requests.", 502);
    }

    const loadTime = Date.now() - start;

    if (res.status === 401 || res.status === 403 || res.status === 429) {
        throw new AppError(`The website blocked our request (status ${res.status}). Some sites don't allow automated scans.`, 422);
    }
    if (!res.ok) throw new AppError(`The website responded with an error (status ${res.status}).`, 422);

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("html")) throw new AppError("That URL is not an HTML web page.", 422);

    const finalUrl = new URL(res.url || targetUrl);
    const $ = cheerio.load(html);
    const meta = (selector) => ($(selector).attr("content") || "").trim();

    const charsetFromHttpEquiv = (meta('meta[http-equiv="Content-Type" i]').match(/charset=([^;]+)/i) || [])[1] || "";

    const metaData = {
        title: $("head title").first().text().trim() || $("title").first().text().trim(),
        description: meta('meta[name="description" i]'),
        canonical: ($('link[rel="canonical"]').attr("href") || "").trim(),
        robots: meta('meta[name="robots" i]'),
        ogTitle: meta('meta[property="og:title"]'),
        ogDescription: meta('meta[property="og:description"]'),
        ogImage: meta('meta[property="og:image"]'),
        twitterCard: meta('meta[name="twitter:card"]'),
        viewport: meta('meta[name="viewport" i]'),
        charset: ($("meta[charset]").attr("charset") || charsetFromHttpEquiv).trim(),
    };

    const headings = {
        h1: $("h1").length,
        h2: $("h2").length,
        h3: $("h3").length,
        h4: $("h4").length,
        h5: $("h5").length,
        h6: $("h6").length,
        h1Texts: $("h1")
            .map((_, el) => $(el).text().replace(/\s+/g, " ").trim())
            .get()
            .filter(Boolean)
            .slice(0, 10),
    };

    let internal = 0;
    let external = 0;
    $("a[href]").each((_, el) => {
        const href = ($(el).attr("href") || "").trim();
        if (!href || href.startsWith("#") || /^(javascript|mailto|tel):/i.test(href)) return;
        try {
            const link = new URL(href, finalUrl);
            if (!link.protocol.startsWith("http")) return;
            sameSite(link.hostname, finalUrl.hostname) ? internal++ : external++;
        } catch {
            /* ignore malformed hrefs */
        }
    });

    const imgs = $("img");
    const withAlt = imgs.filter((_, el) => ($(el).attr("alt") || "").trim().length > 0).length;

    // Visible text only
    $("script, style, noscript, svg, template, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    return {
        url: finalUrl.href,
        loadTime,
        statusCode: res.status,
        pageSize: Buffer.byteLength(html, "utf8"),
        wordCount: text ? text.split(" ").length : 0,
        metaData,
        headings,
        links: { broken: 0, internal, external, total: internal + external },
        images: { total: imgs.length, missingAlt: imgs.length - withAlt, withAlt },
        bodyText: text.slice(0, 3000),
    };
}
