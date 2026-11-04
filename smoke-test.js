"use strict";

const fs = require("fs");
const vm = require("vm");

const source = fs.readFileSync("app.js", "utf8");
const store = new Map();
const app = {
  className: "",
  innerHTML: "",
  onclick: null,
};

const context = {
  console,
  TextEncoder,
  URL,
  URLSearchParams,
  Intl,
  Date,
  Math,
  JSON,
  Array,
  Boolean,
  Number,
  String,
  RegExp,
  setTimeout() {},
  confirm() {
    return true;
  },
  prompt() {},
  localStorage: {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  },
  sessionStorage: {
    getItem(key) {
      return store.has(`s:${key}`) ? store.get(`s:${key}`) : null;
    },
    setItem(key, value) {
      store.set(`s:${key}`, String(value));
    },
  },
  window: {
    location: {
      href: "file:///C:/Users/marle/Documents/Codex/2026-05-30/codex/index.html",
      search: "",
      hash: "",
    },
    history: {
      replaceState() {},
    },
    print() {},
  },
  navigator: {},
  document: {
    querySelector() {
      return null;
    },
    createElement() {
      return {
        click() {},
        remove() {},
      };
    },
    body: {
      appendChild() {},
    },
  },
  Blob: function Blob() {},
};

context.document.querySelector = (selector) => (selector === "#app" ? app : null);
context.globalThis = context;
vm.createContext(context);

const checks = `
  const account = {
    id: "acct_test",
    parentName: "Padre Demo",
    email: "padre@gmail.com",
    dni: "12345678",
    phone: "+51999999999",
    salt: "salt",
    passwordHash: "hash",
    status: "active",
    monthlyStatus: "paid",
    paidUntil: addDays(new Date(), 30).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const profile = {
    id: "kid_test",
    accountId: account.id,
    childName: "Sofia",
    age: "7",
    note: "Estoy perdida. Por favor llama a mi familia.",
    medical: "Alergia importante.",
    showPhoto: true,
    showAge: true,
    showMedical: true,
    photoData: "",
    contact1Name: "Mama",
    contact1Phone: "+51900000000",
    contact1WhatsApp: "+51900000000",
    contact2Name: "",
    contact2Phone: "",
    contact2WhatsApp: "",
    adminDisabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.accounts = [account];
  state.profiles = [profile];
  state.session = { type: "parent", accountId: account.id };
  renderParentDashboard();
  const parentOk = app.innerHTML.includes("Mis pulseras") && app.innerHTML.includes("Codigo QR");
  const qrOk = createQrSvg(getScanUrl(profile.id)).ok;
  renderAdminDashboard();
  const adminOk = app.innerHTML.includes("Control de Family Security") && app.innerHTML.includes("Marcar pagado");
  window.location.search = "?scan=kid_test";
  renderScanPage(profile.id);
  const scanOk = app.innerHTML.includes("Pulsera Family Security") && app.innerHTML.includes("tel:");
  const ficha = buildProfileRegistrationBody(account, profile, "nuevo registro");
  const gmailFichaOk = ficha.includes("FICHA DE REGISTRO") && ficha.includes("padre@gmail.com") && ficha.includes("kid_test") && !ficha.includes("12345678");
  globalThis.__result = { parentOk, qrOk, adminOk, scanOk, gmailFichaOk };
`;

vm.runInContext(`${source}\n${checks}`, context, { filename: "app.js" });

console.log(JSON.stringify(context.__result, null, 2));
if (Object.values(context.__result).some((value) => !value)) {
  process.exitCode = 1;
}
