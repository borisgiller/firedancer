import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const siteDir = join(root, "site");

function readSiteFile(...parts) {
  return readFileSync(join(siteDir, ...parts), "utf8");
}

function listTopLevelPublicEntries() {
  return readdirSync(siteDir).sort();
}

test("public site is Camera Party Portals V1 with a three-app launcher", () => {
  const html = readSiteFile("index.html");

  assert.match(html, /<title>Camera Party Portals V1<\/title>/);
  assert.match(html, /<h1>Camera Party Portals V1<\/h1>/);
  assert.match(html, /href="\.\/apps\/v1-fire-webcam\/"/);
  assert.match(html, /href="\.\/apps\/firedancer-body\/"/);
  assert.match(html, /href="\.\/apps\/galactica\/"/);
});

test("public site contains only launcher assets and three app directories", () => {
  assert.deepEqual(listTopLevelPublicEntries(), ["apps", "index.html", "launcher.css"]);
  assert.deepEqual(readdirSync(join(siteDir, "apps")).sort(), [
    "firedancer-body",
    "galactica",
    "v1-fire-webcam"
  ]);
});

test("each packaged app has a runnable index file", () => {
  for (const app of ["v1-fire-webcam", "firedancer-body", "galactica"]) {
    const indexPath = join(siteDir, "apps", app, "index.html");
    assert.equal(existsSync(indexPath), true, `${app} is missing index.html`);
    assert.equal(statSync(indexPath).isFile(), true, `${app}/index.html must be a file`);
  }
});

test("launcher has no private or server-side release blockers", () => {
  const html = readSiteFile("index.html");
  const css = readSiteFile("launcher.css");
  const combined = `${html}\n${css}`;

  assert.doesNotMatch(combined, /secrets\.env|deploy-win-capture|win-captures|nginx|systemd/i);
});
