export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // Serve /gm/* as-is (Access will gate it)
    if (url.pathname.startsWith("/gm/")) {
      return fetch(request); // go to origin (Netlify)
    }

    // Get the public page first
    const publicResp = await fetch(request);
    const accept = request.headers.get("accept") || "";
    const wantsHTML = accept.includes("text/html");
    if (!wantsHTML || publicResp.status !== 200) return publicResp;

    // Optional manual override: ?view=public
    if (url.searchParams.get("view") === "public") return publicResp;

    // Try the GM mirror internally: /gm + same path
    const gmUrl = new URL(request.url);
    gmUrl.pathname = "/gm" + url.pathname;

    // Forward original request (incl. Access cookies)
    const gmResp = await fetch(gmUrl.toString(), request);

    if (gmResp.ok) {
      const headers = new Headers(gmResp.headers);
      headers.set("Cache-Control", "private, no-store, max-age=0");
      return new Response(gmResp.body, { status: 200, headers });
    }
    // Not authenticated or no GM version → fall back
    return publicResp;
  }
};
