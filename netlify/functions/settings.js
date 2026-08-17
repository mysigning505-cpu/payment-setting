const { getStore } = require("@netlify/blobs");

const DEFAULTS = {
  amount: "2611",
  upi: "Khushboo149@fam",
  howToLink: "#",
  timerMinutes: 8
};

function headers() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Cache-Control",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate"
  };
}

function json(statusCode, body) {
  return { statusCode, headers: headers(), body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: headers(), body: "" };

  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    // In a deployed Netlify Function, this automatically uses the site's
    // Netlify Blobs credentials. No client-side secret is required.
    const store = getStore({ name: "payment-settings" });

    if (event.httpMethod === "GET") {
      const saved = await store.get("current", { type: "json" });
      return json(200, saved && typeof saved === "object" ? saved : DEFAULTS);
    }

    let d;
    try {
      d = JSON.parse(event.body || "{}");
    } catch {
      return json(400, { ok: false, error: "Request body is not valid JSON" });
    }

    const clean = {
      amount: String(d.amount ?? "").trim().slice(0, 50),
      upi: String(d.upi ?? "").trim().slice(0, 150),
      howToLink: String(d.howToLink ?? "#").trim().slice(0, 500) || "#",
      timerMinutes: Math.max(1, Math.min(1440, Number(d.timerMinutes) || 8))
    };

    if (!clean.amount || !clean.upi) {
      return json(400, { ok: false, error: "Amount and UPI are required" });
    }

    // Use set() with JSON text for broad @netlify/blobs compatibility.
    await store.set("current", JSON.stringify(clean), {
      contentType: "application/json"
    });

    // Read it back so the browser knows the backend really persisted it.
    const saved = await store.get("current", { type: "json" });
    if (!saved || String(saved.amount) !== clean.amount || String(saved.upi) !== clean.upi) {
      return json(500, { ok: false, error: "Backend write completed but verification failed" });
    }

    return json(200, { ok: true, settings: saved });
  } catch (error) {
    console.error("settings function error:", error);
    return json(500, {
      ok: false,
      error: "Netlify backend storage is unavailable. The settings function must be deployed as a Netlify Function and Netlify Blobs must be available on this site."
    });
  }
};
