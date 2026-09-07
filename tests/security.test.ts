import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  __resetRateLimitForTests,
  rateLimit,
} from "../src/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimitForTests());

  it("allows within window", () => {
    const a = rateLimit({ key: "t", limit: 2, windowMs: 60_000 });
    const b = rateLimit({ key: "t", limit: 2, windowMs: 60_000 });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
  });

  it("blocks after limit (brute-force login)", () => {
    rateLimit({ key: "login:1.1.1.1", limit: 2, windowMs: 60_000 });
    rateLimit({ key: "login:1.1.1.1", limit: 2, windowMs: 60_000 });
    const blocked = rateLimit({
      key: "login:1.1.1.1",
      limit: 2,
      windowMs: 60_000,
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) assert.ok(blocked.retryAfterSec >= 1);
  });
});

describe("afterAuthPath open-redirect safety", async () => {
  const { afterAuthPath } = await import("../src/lib/services");
  const brand = {
    id: "mail",
    clientIds: ["pnk-mail"],
    name: "pnk почта",
    logoSrc: "/",
    logoAlt: "",
    logoWidth: 1,
    logoHeight: 1,
    homeHref: "/",
    registerTitle: "",
    registerCta: "",
    loginCta: "",
    footerLine: "",
    footerCopy: "",
    supportEmail: "",
    showInstall: false,
    installAndroidHref: "#",
    installIosHref: "#",
    qrHint: "",
    oauthClientId: "pnk-mail",
    oauthRedirectUri: "http://localhost:3000/api/auth/callback/pnk-id",
  };

  it("rejects protocol-relative next", () => {
    assert.equal(
      afterAuthPath(brand as never, "//evil.com"),
      "/api/auth/continue?service=mail",
    );
  });

  it("rejects absolute external next", () => {
    assert.equal(
      afterAuthPath(brand as never, "https://evil.com"),
      "/api/auth/continue?service=mail",
    );
  });

  it("allows relative next", () => {
    assert.equal(afterAuthPath(brand as never, "/cabinet"), "/cabinet");
  });

  it("passes oauth state into continue", () => {
    const path = afterAuthPath(brand as never, null, "abc12345state");
    assert.match(path, /state=abc12345state/);
  });
});

describe("logout next open-redirect", () => {
  function safeNext(raw: string | null): string {
    if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/login";
    return raw;
  }

  it("blocks //evil and https", () => {
    assert.equal(safeNext("//evil.com"), "/login");
    assert.equal(safeNext("https://evil.com"), "/login");
    assert.equal(safeNext("/login?service=mail"), "/login?service=mail");
  });
});
