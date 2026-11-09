alert("ESTE ES UN PROTOTIPO DE PRUEBA ; Prototipo local para un negocio de pulseras de goma con codigo QR");

"use strict"

const STORAGE_KEY = "family-security-platform-v1";
const ADMIN_EMAIL = "familysecurityoficial@gmail.com";
const ADMIN_CODE = "62052802";
const TRIAL_DAYS = 30;
const MAX_PROFILES_PER_ACCOUNT = 6;

const QR_LEVEL_L = {
  1: { size: 21, dataCodewords: 19, ecCodewords: 7, align: [] },
  2: { size: 25, dataCodewords: 34, ecCodewords: 10, align: [6, 18] },
  3: { size: 29, dataCodewords: 55, ecCodewords: 15, align: [6, 22] },
  4: { size: 33, dataCodewords: 80, ecCodewords: 20, align: [6, 26] },
  5: { size: 37, dataCodewords: 108, ecCodewords: 26, align: [6, 30] },
};

const app = document.querySelector("#app");
let state = loadState();
let ui = {
  authMode: "create",
  selectedProfileId: null,
  editingProfileId: null,
  pendingPhoto: null,
  toast: "",
  adminFilter: "",
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.accounts) && Array.isArray(saved.profiles)) {
      return {
        accounts: saved.accounts,
        profiles: saved.profiles,
        scans: Array.isArray(saved.scans) ? saved.scans : [],
        session: saved.session || null,
      };
    }
  } catch {
    return createEmptyState();
  }
  return createEmptyState();
}

function createEmptyState() {
  return {
    accounts: [],
    profiles: [],
    scans: [],
    session: null,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function render() {
  const scanId = new URLSearchParams(window.location.search).get("scan");
  if (scanId) {
    renderScanPage(scanId);
    return;
  }

  if (state.session?.type === "admin") {
    renderAdminDashboard();
    return;
  }

  if (state.session?.type === "parent") {
    renderParentDashboard();
    return;
  }

  renderAuthPage();
}

function renderAuthPage() {
  app.className = "app-shell";
  app.innerHTML = `
    ${renderTopbar(false)}
    <main class="auth-layout">
      <section class="auth-panel">
        <div class="section-heading">
          <span class="eyebrow">Acceso familiar</span>
          <h2>Crear cuenta con Gmail</h2>
          <p>El padre, madre o tutor crea su cuenta y luego registra el perfil del niño para generar el QR.</p>
        </div>

        <div class="segmented" role="tablist" aria-label="Modo de acceso">
          <button class="${ui.authMode === "create" ? "active" : ""}" data-action="auth-mode" data-mode="create" type="button">Crear cuenta</button>
          <button class="${ui.authMode === "login" ? "active" : ""}" data-action="auth-mode" data-mode="login" type="button">Entrar</button>
        </div>

        ${ui.authMode === "create" ? renderCreateAccountForm() : renderLoginForm()}
      </section>

      <aside class="admin-entry">
        <div class="section-heading">
          <span class="eyebrow">Control del negocio</span>
          <h2>Panel administrador</h2>
          <p>Desde aqui puedes revisar cuentas, pagos, perfiles y desactivar pulseras si la mensualidad no esta activa.</p>
        </div>
        <form class="form-grid" id="admin-form">
          <label class="field">
            <span>Codigo de administrador</span>
            <input name="adminCode" type="password" autocomplete="off" placeholder="Codigo privado" required />
          </label>
          <button class="primary" type="submit">Entrar al panel</button>
        </form>
        <div class="notice">
          Prototipo local: el codigo de admin sirve para probar. En produccion debe existir login real, roles y servidor seguro.
        </div>
      </aside>
    </main>
  `;

  document.querySelector("#account-form")?.addEventListener("submit", handleCreateAccount);
  document.querySelector("#login-form")?.addEventListener("submit", handleLogin);
  document.querySelector("#admin-form")?.addEventListener("submit", handleAdminLogin);
  app.onclick = handleAuthClick;
}

function renderTopbar(showSessionActions) {
  return `
    <header class="topbar">
      <a class="brand" href="${escapeAttr(getHomeUrl())}" aria-label="Family Security">
        <span class="brand-mark">FS</span>
        <span>
          <strong>Family Security</strong>
          <small>Pulseras QR de emergencia familiar</small>
        </span>
      </a>
      ${
        showSessionActions
          ? `<div class="top-actions">
              <button class="secondary" data-action="go-home" type="button">Inicio</button>
              <button class="ghost" data-action="logout" type="button">Salir</button>
            </div>`
          : ""
      }
    </header>
  `;
}

function renderCreateAccountForm() {
  return `
    <form class="form-grid" id="account-form">
      ${renderToast()}
      <label class="field">
        <span>Nombre del padre, madre o tutor</span>
        <input name="parentName" maxlength="70" autocomplete="name" required />
      </label>
      <label class="field">
        <span>Gmail</span>
        <input name="email" type="email" maxlength="90" autocomplete="email" placeholder="nombre@gmail.com" required />
      </label>
      <div class="two-col">
        <label class="field">
          <span>DNI del padre o tutor</span>
          <input name="dni" maxlength="20" inputmode="numeric" required />
        </label>
        <label class="field">
          <span>Telefono</span>
          <input name="phone" maxlength="24" inputmode="tel" required />
        </label>
      </div>
      <div class="two-col">
        <label class="field">
          <span>Contrasena</span>
          <input name="password" type="password" minlength="8" autocomplete="new-password" required />
        </label>
        <label class="field">
          <span>Confirmar contrasena</span>
          <input name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required />
        </label>
      </div>
      <label class="check-row">
        <input name="consent" type="checkbox" required />
        <span>Acepto que Family Security guarde estos datos para administrar la pulsera y contactar en emergencias.</span>
      </label>
      <button class="primary" type="submit">Crear cuenta y continuar</button>
      <p class="microcopy">La contrasena no se envia por correo. Se guarda como huella tecnica en este prototipo.</p>
    </form>
  `;
}

function renderLoginForm() {
  return `
    <form class="form-grid" id="login-form">
      ${renderToast()}
      <label class="field">
        <span>Gmail</span>
        <input name="email" type="email" autocomplete="email" required />
      </label>
      <label class="field">
        <span>Contrasena</span>
        <input name="password" type="password" autocomplete="current-password" required />
      </label>
      <button class="primary" type="submit">Entrar</button>
    </form>
  `;
}

function renderParentDashboard() {
  const account = getCurrentAccount();
  if (!account) {
    logout();
    return;
  }

  const profiles = getProfilesForAccount(account.id);
  const selected = getSelectedProfile(profiles);
  const accountStatus = getAccountStatus(account);

  app.className = "app-shell";
  app.innerHTML = `
    ${renderTopbar(true)}
    <main class="dashboard">
      <section class="status-strip ${accountStatus.blocked ? "blocked" : ""}">
        <div>
          <span class="eyebrow">Cuenta familiar</span>
          <h1>${escapeHtml(account.parentName)}</h1>
          <p>${escapeHtml(account.email)} · Mensualidad: ${accountStatus.label}</p>
        </div>
        <div class="pill ${accountStatus.blocked ? "danger" : "success"}">${accountStatus.blocked ? "Bloqueada" : "Activa"}</div>
      </section>

      <div class="parent-grid">
        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>${ui.editingProfileId ? "Editar perfil" : "Crear perfil del niño"}</h2>
              <p>El padre registra solo la informacion necesaria para el QR.</p>
            </div>
          </div>
          ${renderProfileForm(account, profiles)}
        </section>

        <section class="panel">
          <div class="panel-head">
            <div>
              <h2>Mis pulseras</h2>
              <p>Selecciona una pulsera para ver su QR.</p>
            </div>
          </div>
          ${renderParentProfiles(profiles, account)}
        </section>
      </div>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>QR de la pulsera</h2>
            <p>Este codigo se imprime en la pulsera de goma.</p>
          </div>
          ${selected ? `<button class="secondary" data-action="print-qr" type="button">Imprimir</button>` : ""}
        </div>
        ${renderQrArea(selected, account)}
      </section>
    </main>
  `;

  document.querySelector("#profile-form")?.addEventListener("submit", handleSaveProfile);
  document.querySelector("input[name='photo']")?.addEventListener("change", handlePhotoUpload);
  app.onclick = handleParentClick;
}

function renderProfileForm(account, profiles) {
  const profile = ui.editingProfileId
    ? profiles.find((item) => item.id === ui.editingProfileId)
    : null;
  const data = profile || emptyProfile();
  const profileLimitReached = !profile && profiles.length >= MAX_PROFILES_PER_ACCOUNT;

  return `
    <form class="form-grid" id="profile-form">
      ${renderToast()}
      ${
        profileLimitReached
          ? `<div class="notice danger">Esta cuenta ya alcanzo el limite de ${MAX_PROFILES_PER_ACCOUNT} perfiles.</div>`
          : ""
      }
      <label class="field">
        <span>Nombre o apodo del niño</span>
        <input name="childName" value="${escapeAttr(data.childName)}" maxlength="50" required ${profileLimitReached ? "disabled" : ""} />
      </label>
      <div class="two-col">
        <label class="field">
          <span>Edad</span>
          <input name="age" value="${escapeAttr(data.age)}" maxlength="12" ${profileLimitReached ? "disabled" : ""} />
        </label>
        <label class="field">
          <span>Foto opcional</span>
          <input name="photo" type="file" accept="image/*" ${profileLimitReached ? "disabled" : ""} />
        </label>
      </div>
      <label class="field">
        <span>Mensaje de emergencia</span>
        <textarea name="note" maxlength="240" required ${profileLimitReached ? "disabled" : ""}>${escapeHtml(data.note)}</textarea>
      </label>
      <label class="field">
        <span>Informacion medica esencial</span>
        <textarea name="medical" maxlength="180" ${profileLimitReached ? "disabled" : ""}>${escapeHtml(data.medical)}</textarea>
      </label>

      <div class="two-col">
        <label class="field">
          <span>Contacto principal</span>
          <input name="contact1Name" value="${escapeAttr(data.contact1Name)}" maxlength="50" required ${profileLimitReached ? "disabled" : ""} />
        </label>
        <label class="field">
          <span>Telefono principal</span>
          <input name="contact1Phone" value="${escapeAttr(data.contact1Phone)}" maxlength="24" required ${profileLimitReached ? "disabled" : ""} />
        </label>
      </div>
      <label class="field">
        <span>WhatsApp principal</span>
        <input name="contact1WhatsApp" value="${escapeAttr(data.contact1WhatsApp)}" maxlength="24" ${profileLimitReached ? "disabled" : ""} />
      </label>

      <div class="two-col">
        <label class="field">
          <span>Contacto secundario</span>
          <input name="contact2Name" value="${escapeAttr(data.contact2Name)}" maxlength="50" ${profileLimitReached ? "disabled" : ""} />
        </label>
        <label class="field">
          <span>Telefono secundario</span>
          <input name="contact2Phone" value="${escapeAttr(data.contact2Phone)}" maxlength="24" ${profileLimitReached ? "disabled" : ""} />
        </label>
      </div>
      <label class="field">
        <span>WhatsApp secundario</span>
        <input name="contact2WhatsApp" value="${escapeAttr(data.contact2WhatsApp)}" maxlength="24" ${profileLimitReached ? "disabled" : ""} />
      </label>

      <div class="privacy-box">
        ${renderToggle("showPhoto", "Mostrar foto al escanear", data.showPhoto)}
        ${renderToggle("showAge", "Mostrar edad", data.showAge)}
        ${renderToggle("showMedical", "Mostrar informacion medica", data.showMedical)}
      </div>

      <div class="notice">
        No guardes direccion, colegio, documento del niño ni rutinas. El QR debe servir para contactar rapido, no para exponer.
      </div>

      <label class="check-row">
        <input name="notifyAdmin" type="checkbox" checked ${profileLimitReached ? "disabled" : ""} />
        <span>Autorizar envio de ficha segura a Family Security para registro manual.</span>
      </label>

      <div class="form-actions">
        <button class="primary" type="submit" ${profileLimitReached ? "disabled" : ""}>${profile ? "Guardar cambios" : "Crear perfil y QR"}</button>
        ${profile ? `<button class="secondary" data-action="cancel-edit" type="button">Cancelar</button>` : ""}
      </div>
    </form>
  `;
}

function renderToggle(name, label, checked) {
  return `
    <label class="toggle-row">
      <span>${label}</span>
      <span class="switch">
        <input type="checkbox" name="${name}" ${checked ? "checked" : ""} />
        <span class="slider"></span>
      </span>
    </label>
  `;
}

function renderParentProfiles(profiles, account) {
  if (!profiles.length) {
    return `<div class="empty">Aun no hay perfiles. Crea el primer perfil y se generara el QR.</div>`;
  }

  return `
    <div class="profile-list">
      ${profiles
        .map((profile) => {
          const status = getProfileStatus(profile, account);
          const selected = profile.id === ui.selectedProfileId || (!ui.selectedProfileId && profiles[0]?.id === profile.id);
          return `
            <article class="profile-card ${selected ? "selected" : ""}">
              <div class="profile-main">
                ${renderAvatar(profile, 58, false)}
                <div>
                  <h3>${escapeHtml(profile.childName)}</h3>
                  <p>${status.reason}</p>
                  <div class="badge-row">
                    <span class="pill ${status.canScan ? "success" : "danger"}">${status.label}</span>
                    <span class="pill neutral">${profile.scanCount || 0} escaneos</span>
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <button class="secondary" data-action="select-profile" data-id="${profile.id}" type="button">QR</button>
                <button class="secondary" data-action="edit-profile" data-id="${profile.id}" type="button">Editar</button>
                <button class="danger" data-action="delete-profile" data-id="${profile.id}" type="button">Borrar</button>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderQrArea(profile, account) {
  if (!profile) {
    return `<div class="empty">Crea un perfil del niño para generar el codigo QR.</div>`;
  }

  const status = getProfileStatus(profile, account);
  const url = getScanUrl(profile.id);
  const qr = createQrSvg(url);

  return `
    <div class="qr-grid">
      <div class="bracelet-preview">
        <div class="bracelet-copy">
          <strong>Family Security</strong>
          <span>Escanea si estoy perdido</span>
        </div>
        <div class="mini-qr">${qr.ok ? qr.svg : `<span>${escapeHtml(qr.message)}</span>`}</div>
      </div>

      <div class="qr-details">
        <div class="badge-row">
          <span class="pill ${status.canScan ? "success" : "danger"}">${status.label}</span>
          <span class="pill neutral">ID ${escapeHtml(profile.id)}</span>
        </div>
        <p class="public-link">${escapeHtml(url)}</p>
        <div class="form-actions">
          <a class="button primary" href="${escapeAttr(url)}">Probar escaneo</a>
          <button class="secondary" data-action="download-qr" data-id="${profile.id}" type="button" ${qr.ok ? "" : "disabled"}>Descargar QR</button>
          <button class="secondary" data-action="copy-link" data-id="${profile.id}" type="button">Copiar enlace</button>
        </div>
        <div class="notice ${status.canScan ? "" : "danger"}">${escapeHtml(status.reason)}</div>
      </div>
    </div>
  `;
}

function renderAdminDashboard() {
  const filteredAccounts = state.accounts.filter((account) => {
    const term = ui.adminFilter.trim().toLowerCase();
    if (!term) return true;
    return [account.parentName, account.email, account.phone, account.dni]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  app.className = "app-shell";
  app.innerHTML = `
    ${renderTopbar(true)}
    <main class="dashboard">
      <section class="status-strip admin">
        <div>
          <span class="eyebrow">Panel administrador</span>
          <h1>Control de Family Security</h1>
          <p>Administra cuentas, mensualidades y pulseras activas.</p>
        </div>
        <div class="pill success">Admin</div>
      </section>

      ${renderAdminStats()}

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Cuentas registradas</h2>
            <p>Los datos sensibles no se envian por correo en este prototipo.</p>
          </div>
          <button class="secondary" data-action="admin-report-all" type="button">Preparar reporte Gmail</button>
        </div>
        ${renderToast()}
        <label class="field search-field">
          <span>Buscar padre, Gmail, telefono o DNI</span>
          <input name="adminSearch" value="${escapeAttr(ui.adminFilter)}" data-action="admin-search" placeholder="Buscar cuenta" />
        </label>
        <div class="account-list">
          ${filteredAccounts.map(renderAdminAccountCard).join("") || `<div class="empty">Aun no hay cuentas registradas.</div>`}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Escaneos recientes</h2>
            <p>Historial local para probar alertas.</p>
          </div>
          <button class="secondary" data-action="clear-scans" type="button" ${state.scans.length ? "" : "disabled"}>Limpiar</button>
        </div>
        ${renderScanHistory()}
      </section>
    </main>
  `;

  document.querySelector("[name='adminSearch']")?.addEventListener("input", (event) => {
    ui.adminFilter = event.target.value;
    renderAdminDashboard();
  });
  app.onclick = handleAdminClick;
}

function renderAdminStats() {
  const activeAccounts = state.accounts.filter((account) => !getAccountStatus(account).blocked).length;
  const unpaidAccounts = state.accounts.filter((account) => getAccountStatus(account).blocked).length;
  const activeProfiles = state.profiles.filter((profile) => {
    const account = state.accounts.find((item) => item.id === profile.accountId);
    return account && getProfileStatus(profile, account).canScan;
  }).length;

  return `
    <section class="stats">
      <div class="stat"><strong>${state.accounts.length}</strong><span>Cuentas</span></div>
      <div class="stat"><strong>${activeAccounts}</strong><span>Cuentas activas</span></div>
      <div class="stat"><strong>${unpaidAccounts}</strong><span>Bloqueadas o sin pago</span></div>
      <div class="stat"><strong>${activeProfiles}</strong><span>Pulseras activas</span></div>
    </section>
  `;
}

function renderAdminAccountCard(account) {
  const profiles = getProfilesForAccount(account.id);
  const status = getAccountStatus(account);
  return `
    <article class="account-card">
      <div class="account-top">
        <div>
          <h3>${escapeHtml(account.parentName)}</h3>
          <p>${escapeHtml(account.email)} · ${escapeHtml(account.phone)}</p>
          <p>DNI: ${escapeHtml(maskDni(account.dni))} · Pago hasta: ${formatDate(account.paidUntil)}</p>
        </div>
        <span class="pill ${status.blocked ? "danger" : "success"}">${status.label}</span>
      </div>

      <div class="card-actions">
        <button class="primary" data-action="mark-paid" data-id="${account.id}" type="button">Marcar pagado 30 dias</button>
        <button class="secondary" data-action="mark-unpaid" data-id="${account.id}" type="button">Sin pago</button>
        <button class="${account.status === "suspended" ? "secondary" : "danger"}" data-action="toggle-account" data-id="${account.id}" type="button">
          ${account.status === "suspended" ? "Reactivar cuenta" : "Suspender cuenta"}
        </button>
        <button class="secondary" data-action="admin-report-one" data-id="${account.id}" type="button">Enviar resumen Gmail</button>
      </div>

      <div class="admin-profile-list">
        ${
          profiles
            .map((profile) => {
              const profileStatus = getProfileStatus(profile, account);
              return `
                <div class="admin-profile-row">
                  <div>
                    <strong>${escapeHtml(profile.childName)}</strong>
                    <span>${profileStatus.reason}</span>
                  </div>
                  <button class="${profile.adminDisabled ? "secondary" : "danger"}" data-action="toggle-profile-admin" data-id="${profile.id}" type="button">
                    ${profile.adminDisabled ? "Activar perfil" : "Desactivar perfil"}
                  </button>
                </div>
              `;
            })
            .join("") || `<div class="empty compact">Esta cuenta aun no tiene perfiles.</div>`
        }
      </div>
    </article>
  `;
}

function renderScanHistory() {
  if (!state.scans.length) {
    return `<div class="empty">Aun no hay escaneos registrados.</div>`;
  }

  return `
    <div class="history-list">
      ${state.scans
        .slice(0, 14)
        .map((scan) => {
          const profile = state.profiles.find((item) => item.id === scan.profileId);
          const account = profile ? state.accounts.find((item) => item.id === profile.accountId) : null;
          return `
            <article class="history-row">
              <strong>${escapeHtml(profile?.childName || "Perfil eliminado")} · ${formatDateTime(scan.createdAt)}</strong>
              <span>${escapeHtml(account?.email || "Cuenta no disponible")}</span>
              <p>${escapeHtml(scan.message || "La pulsera fue escaneada.")}</p>
              ${scan.helperName || scan.helperPhone ? `<p>${escapeHtml(scan.helperName || "Persona sin nombre")} ${scan.helperPhone ? `· ${escapeHtml(scan.helperPhone)}` : ""}</p>` : ""}
              ${scan.location ? `<p>${escapeHtml(scan.location)}</p>` : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderScanPage(profileId) {
  const profile = state.profiles.find((item) => item.id === profileId);
  const account = profile ? state.accounts.find((item) => item.id === profile.accountId) : null;

  app.className = "scan-page";

  if (!profile || !account) {
    app.innerHTML = `
      ${renderTopbar(false)}
      <main class="scan-shell">
        <section class="scan-card">
          <div class="notice danger">Este codigo QR no existe o fue eliminado.</div>
          <a class="button secondary" href="${escapeAttr(getHomeUrl())}">Volver</a>
        </section>
      </main>
    `;
    return;
  }

  recordScanOpen(profile.id);
  const status = getProfileStatus(profile, account);
  const contacts = getContacts(profile);

  app.innerHTML = `
    ${renderTopbar(false)}
    <main class="scan-shell">
      <section class="scan-card">
        <div class="scan-profile">
          ${renderAvatar(profile, 96, true)}
          <div>
            <span class="eyebrow">Pulsera Family Security</span>
            <h1>${escapeHtml(profile.childName)}</h1>
            <p>${status.canScan ? escapeHtml(profile.note) : "Esta pulsera no esta disponible en este momento."}</p>
          </div>
        </div>

        ${
          status.canScan
            ? `
              ${profile.showAge && profile.age ? `<div class="notice">Edad: ${escapeHtml(profile.age)}</div>` : ""}
              ${profile.showMedical && profile.medical ? `<div class="notice warn"><strong>Informacion medica:</strong> ${escapeHtml(profile.medical)}</div>` : ""}
              <div class="contact-grid">${contacts.map(renderContactCard).join("")}</div>
              ${renderHelperForm(profile.id)}
            `
            : `<div class="notice danger">${escapeHtml(status.reason)}</div>`
        }

        <div class="notice">
          Si el niño esta en peligro inmediato, llama a emergencias. Espera en un lugar publico y seguro.
        </div>
      </section>
    </main>
  `;

  document.querySelector("#helper-form")?.addEventListener("submit", (event) => handleHelperNotice(event, profile.id));
  app.onclick = (event) => handleScanClick(event, profile.id);
}

function renderContactCard(contact) {
  const phone = cleanPhone(contact.phone);
  const whatsapp = cleanPhone(contact.whatsapp || contact.phone);
  return `
    <article class="contact-card">
      <strong>${escapeHtml(contact.name || "Contacto familiar")}</strong>
      <span>${escapeHtml(contact.phone)}</span>
      <div class="card-actions">
        <a class="button primary" href="tel:${escapeAttr(phone)}">Llamar</a>
        <a class="button secondary" href="https://wa.me/${escapeAttr(whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
      </div>
    </article>
  `;
}

function renderHelperForm() {
  return `
    <form class="helper-form" id="helper-form">
      <label class="field">
        <span>Tu nombre</span>
        <input name="helperName" maxlength="50" placeholder="Opcional" />
      </label>
      <label class="field">
        <span>Tu telefono</span>
        <input name="helperPhone" maxlength="24" placeholder="Opcional" />
      </label>
      <label class="field">
        <span>Mensaje a la familia</span>
        <textarea name="message" maxlength="180" placeholder="Estoy con el niño en un lugar seguro."></textarea>
      </label>
      <div class="form-actions">
        <button class="primary" type="submit">Registrar aviso</button>
        <button class="secondary" data-action="share-location" type="button">Agregar ubicacion</button>
      </div>
    </form>
  `;
}

function renderAvatar(profile, size, publicView) {
  const showPhoto = profile.photoData && (!publicView || profile.showPhoto);
  return `
    <div class="avatar" style="width:${size}px">
      ${showPhoto ? `<img src="${profile.photoData}" alt="${escapeAttr(profile.childName)}" />` : `<span>${escapeHtml(getInitials(profile.childName))}</span>`}
    </div>
  `;
}

function renderToast() {
  return ui.toast ? `<div class="notice ${ui.toast.includes("Error") ? "danger" : "success"}">${escapeHtml(ui.toast)}</div>` : "";
}

function handleAuthClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.dataset.action === "auth-mode") {
    ui.authMode = target.dataset.mode || "create";
    ui.toast = "";
    renderAuthPage();
  }
}

async function handleCreateAccount(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!email.endsWith("@gmail.com")) {
    ui.toast = "Error: usa un correo Gmail para crear la cuenta.";
    renderAuthPage();
    return;
  }

  if (state.accounts.some((account) => account.email === email)) {
    ui.toast = "Error: ese Gmail ya esta registrado.";
    renderAuthPage();
    return;
  }

  if (password.length < 8 || password !== confirmPassword) {
    ui.toast = "Error: las contrasenas deben coincidir y tener minimo 8 caracteres.";
    renderAuthPage();
    return;
  }

  const salt = makeId("salt");
  const account = {
    id: makeId("acct"),
    parentName: String(form.get("parentName") || "").trim(),
    email,
    dni: String(form.get("dni") || "").trim(),
    phone: String(form.get("phone") || "").trim(),
    salt,
    passwordHash: await hashPassword(password, salt),
    status: "active",
    monthlyStatus: "trial",
    paidUntil: addDays(new Date(), TRIAL_DAYS).toISOString(),
    consentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.accounts.unshift(account);
  state.session = { type: "parent", accountId: account.id };
  saveState();
  ui.toast = "Cuenta creada. Ahora registra el perfil del niño.";
  renderParentDashboard();
}

async function handleLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = normalizeEmail(form.get("email"));
  const password = String(form.get("password") || "");
  const account = state.accounts.find((item) => item.email === email);

  if (!account || account.passwordHash !== (await hashPassword(password, account.salt))) {
    ui.toast = "Error: Gmail o contrasena incorrectos.";
    renderAuthPage();
    return;
  }

  account.lastLoginAt = new Date().toISOString();
  state.session = { type: "parent", accountId: account.id };
  saveState();
  ui.toast = "";
  renderParentDashboard();
}

function handleAdminLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  if (String(form.get("adminCode") || "").trim() !== ADMIN_CODE) {
    ui.toast = "Error: codigo de administrador incorrecto.";
    renderAuthPage();
    return;
  }

  state.session = { type: "admin" };
  saveState();
  ui.toast = "";
  renderAdminDashboard();
}

function handleParentClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (handleGlobalAction(action)) return;

  if (action === "select-profile") {
    ui.selectedProfileId = id;
    ui.editingProfileId = null;
    ui.toast = "";
    renderParentDashboard();
  }

  if (action === "edit-profile") {
    ui.editingProfileId = id;
    ui.selectedProfileId = id;
    ui.pendingPhoto = null;
    ui.toast = "";
    renderParentDashboard();
  }

  if (action === "cancel-edit") {
    ui.editingProfileId = null;
    ui.pendingPhoto = null;
    renderParentDashboard();
  }

  if (action === "delete-profile") {
    if (!confirm("Quieres borrar este perfil y su QR? Esta accion no se puede deshacer.")) return;
    state.profiles = state.profiles.filter((profile) => profile.id !== id);
    state.scans = state.scans.filter((scan) => scan.profileId !== id);
    if (ui.selectedProfileId === id) ui.selectedProfileId = null;
    if (ui.editingProfileId === id) ui.editingProfileId = null;
    saveState();
    ui.toast = "Perfil borrado.";
    renderParentDashboard();
  }

  if (action === "download-qr") {
    const profile = state.profiles.find((item) => item.id === id);
    if (profile) downloadQr(profile);
  }

  if (action === "copy-link") {
    const profile = state.profiles.find((item) => item.id === id);
    if (profile) copyText(getScanUrl(profile.id), target);
  }

  if (action === "print-qr") {
    window.print();
  }
}

function handleAdminClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  const id = target.dataset.id;

  if (handleGlobalAction(action)) return;

  if (action === "mark-paid") {
    const account = state.accounts.find((item) => item.id === id);
    if (account) {
      account.status = "active";
      account.monthlyStatus = "paid";
      account.paidUntil = addDays(new Date(), 30).toISOString();
      account.updatedAt = new Date().toISOString();
      saveState();
      ui.toast = "Mensualidad marcada como pagada.";
      renderAdminDashboard();
    }
  }

  if (action === "mark-unpaid") {
    const account = state.accounts.find((item) => item.id === id);
    if (account) {
      account.monthlyStatus = "unpaid";
      account.paidUntil = new Date(Date.now() - 86400000).toISOString();
      account.updatedAt = new Date().toISOString();
      saveState();
      ui.toast = "Cuenta marcada sin pago. Sus QR quedan bloqueados.";
      renderAdminDashboard();
    }
  }

  if (action === "toggle-account") {
    const account = state.accounts.find((item) => item.id === id);
    if (account) {
      account.status = account.status === "suspended" ? "active" : "suspended";
      account.updatedAt = new Date().toISOString();
      saveState();
      ui.toast = account.status === "suspended" ? "Cuenta suspendida." : "Cuenta reactivada.";
      renderAdminDashboard();
    }
  }

  if (action === "toggle-profile-admin") {
    const profile = state.profiles.find((item) => item.id === id);
    if (profile) {
      profile.adminDisabled = !profile.adminDisabled;
      profile.updatedAt = new Date().toISOString();
      saveState();
      ui.toast = profile.adminDisabled ? "Perfil desactivado." : "Perfil activado.";
      renderAdminDashboard();
    }
  }

  if (action === "admin-report-one") {
    const account = state.accounts.find((item) => item.id === id);
    if (account) openAdminMail(account);
  }

  if (action === "admin-report-all") {
    openAdminMail();
  }

  if (action === "clear-scans") {
    state.scans = [];
    saveState();
    ui.toast = "Historial de escaneos limpiado.";
    renderAdminDashboard();
  }
}

function handleGlobalAction(action) {
  if (action === "logout") {
    logout();
    return true;
  }

  if (action === "go-home") {
    window.location.href = getHomeUrl();
    return true;
  }

  return false;
}

function handlePhotoUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    ui.pendingPhoto = null;
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    ui.pendingPhoto = reader.result?.toString() || "";
  });
  reader.readAsDataURL(file);
}

function handleSaveProfile(event) {
  event.preventDefault();
  const account = getCurrentAccount();
  if (!account) return;

  const currentProfiles = getProfilesForAccount(account.id);
  const existing = ui.editingProfileId
    ? currentProfiles.find((profile) => profile.id === ui.editingProfileId)
    : null;

  if (!existing && currentProfiles.length >= MAX_PROFILES_PER_ACCOUNT) {
    ui.toast = "Error: la cuenta alcanzo el limite de perfiles.";
    renderParentDashboard();
    return;
  }

  const form = new FormData(event.currentTarget);
  const profile = {
    id: existing?.id || makeId("kid"),
    accountId: account.id,
    childName: String(form.get("childName") || "").trim(),
    age: String(form.get("age") || "").trim(),
    note: String(form.get("note") || "").trim(),
    medical: String(form.get("medical") || "").trim(),
    showPhoto: form.get("showPhoto") === "on",
    showAge: form.get("showAge") === "on",
    showMedical: form.get("showMedical") === "on",
    photoData: ui.pendingPhoto ?? existing?.photoData ?? "",
    contact1Name: String(form.get("contact1Name") || "").trim(),
    contact1Phone: String(form.get("contact1Phone") || "").trim(),
    contact1WhatsApp: String(form.get("contact1WhatsApp") || "").trim(),
    contact2Name: String(form.get("contact2Name") || "").trim(),
    contact2Phone: String(form.get("contact2Phone") || "").trim(),
    contact2WhatsApp: String(form.get("contact2WhatsApp") || "").trim(),
    adminDisabled: existing?.adminDisabled || false,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!profile.childName || !profile.contact1Phone) {
    ui.toast = "Error: falta nombre del niño o telefono principal.";
    renderParentDashboard();
    return;
  }

  if (existing) {
    state.profiles = state.profiles.map((item) => (item.id === existing.id ? profile : item));
    ui.toast = "Perfil actualizado.";
  } else {
    state.profiles.unshift(profile);
    ui.toast = "Perfil creado. El QR ya esta listo.";
  }

  ui.selectedProfileId = profile.id;
  ui.editingProfileId = null;
  ui.pendingPhoto = null;
  saveState();

  if (form.get("notifyAdmin") === "on") {
    openProfileRegistrationGmail(account, profile, existing ? "actualizacion" : "nuevo registro");
    ui.toast = `${ui.toast} Se abrio Gmail con la ficha segura para enviar.`;
  }

  renderParentDashboard();
}

function handleHelperNotice(event, profileId) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const scan = getLatestScan(profileId);
  if (scan) {
    scan.helperName = String(form.get("helperName") || "").trim();
    scan.helperPhone = String(form.get("helperPhone") || "").trim();
    scan.message =
      String(form.get("message") || "").trim() ||
      "La persona que escaneo la pulsera esta esperando con el niño.";
    scan.updatedAt = new Date().toISOString();
    saveState();
  }
  ui.toast = "Aviso registrado en el historial.";
  renderScanPage(profileId);
}

function handleScanClick(event, profileId) {
  const target = event.target.closest("[data-action]");
  if (!target || target.dataset.action !== "share-location") return;

  if (!navigator.geolocation) {
    updateLatestScanLocation(profileId, "El navegador no permite compartir ubicacion.");
    renderScanPage(profileId);
    return;
  }

  target.disabled = true;
  target.textContent = "Buscando ubicacion";
  navigator.geolocation.getCurrentPosition(
    (position) => {
      updateLatestScanLocation(
        profileId,
        `Ubicacion aproximada: ${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
      );
      renderScanPage(profileId);
    },
    () => {
      updateLatestScanLocation(profileId, "La persona no compartio ubicacion.");
      renderScanPage(profileId);
    },
    { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 },
  );
}

function logout() {
  state.session = null;
  saveState();
  ui = {
    authMode: "login",
    selectedProfileId: null,
    editingProfileId: null,
    pendingPhoto: null,
    toast: "",
    adminFilter: "",
  };
  window.history.replaceState({}, "", getHomeUrl());
  renderAuthPage();
}

function getCurrentAccount() {
  return state.accounts.find((account) => account.id === state.session?.accountId) || null;
}

function getProfilesForAccount(accountId) {
  return state.profiles
    .filter((profile) => profile.accountId === accountId)
    .map((profile) => ({
      ...profile,
      scanCount: state.scans.filter((scan) => scan.profileId === profile.id).length,
    }));
}

function getSelectedProfile(profiles) {
  return profiles.find((profile) => profile.id === ui.selectedProfileId) || profiles[0] || null;
}

function emptyProfile() {
  return {
    childName: "",
    age: "",
    note:
      "Estoy perdido. Por favor llama a mi familia y espera conmigo en un lugar publico y seguro.",
    medical: "",
    showPhoto: true,
    showAge: true,
    showMedical: false,
    photoData: "",
    contact1Name: "",
    contact1Phone: "",
    contact1WhatsApp: "",
    contact2Name: "",
    contact2Phone: "",
    contact2WhatsApp: "",
  };
}

function getAccountStatus(account) {
  const paidUntil = new Date(account.paidUntil || 0).getTime();
  const expired = Number.isFinite(paidUntil) && paidUntil < startOfToday().getTime();

  if (account.status === "suspended") {
    return { blocked: true, label: "Suspendida", reason: "Cuenta suspendida por administracion." };
  }

  if (account.monthlyStatus === "unpaid" || expired) {
    return { blocked: true, label: "Sin pago", reason: "Mensualidad vencida. El QR queda bloqueado." };
  }

  if (account.monthlyStatus === "trial") {
    return { blocked: false, label: `Prueba hasta ${formatDate(account.paidUntil)}`, reason: "Cuenta en periodo de prueba." };
  }

  return { blocked: false, label: `Pagada hasta ${formatDate(account.paidUntil)}`, reason: "Mensualidad activa." };
}

function getProfileStatus(profile, account) {
  const accountStatus = getAccountStatus(account);
  if (accountStatus.blocked) {
    return { canScan: false, label: "Bloqueada", reason: accountStatus.reason };
  }

  if (profile.adminDisabled) {
    return { canScan: false, label: "Desactivada", reason: "Este perfil fue desactivado por administracion." };
  }

  return { canScan: true, label: "QR activo", reason: "Pulsera lista para escanear." };
}

function getContacts(profile) {
  return [
    {
      name: profile.contact1Name,
      phone: profile.contact1Phone,
      whatsapp: profile.contact1WhatsApp,
    },
    {
      name: profile.contact2Name,
      phone: profile.contact2Phone,
      whatsapp: profile.contact2WhatsApp,
    },
  ].filter((contact) => contact.phone);
}

function recordScanOpen(profileId) {
  const key = `family-security-scan-${profileId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");
  state.scans.unshift({
    id: makeId("scan"),
    profileId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    helperName: "",
    helperPhone: "",
    message: "La pulsera fue escaneada.",
    location: "",
  });
  state.scans = state.scans.slice(0, 80);
  saveState();
}

function getLatestScan(profileId) {
  return state.scans.find((scan) => scan.profileId === profileId);
}

function updateLatestScanLocation(profileId, location) {
  const scan = getLatestScan(profileId);
  if (!scan) return;
  scan.location = location;
  scan.updatedAt = new Date().toISOString();
  saveState();
}

function openAdminMail(account) {
  const subject = account
    ? `Family Security - cuenta ${account.email}`
    : "Family Security - reporte administrativo";
  const body = account ? buildAccountReport(account) : buildGlobalReport();
  const url = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = url;
}

function openProfileRegistrationGmail(account, profile, type) {
  const subject = `Family Security - ${type} - ${profile.childName}`;
  const body = buildProfileRegistrationBody(account, profile, type);
  const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
    ADMIN_EMAIL,
  )}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.href = url;
  }
}

function buildProfileRegistrationBody(account, profile, type) {
  return [
    "FICHA DE REGISTRO FAMILY SECURITY",
    "",
    `Tipo: ${type}`,
    `Fecha: ${new Date().toLocaleString("es")}`,
    "",
    "DATOS DEL TUTOR",
    `Nombre: ${account.parentName}`,
    `Gmail: ${account.email}`,
    `Telefono: ${account.phone}`,
    `DNI: ${maskDni(account.dni)}`,
    `Cuenta ID: ${account.id}`,
    "",
    "DATOS DEL PERFIL DEL NINO",
    `Nombre/apodo: ${profile.childName}`,
    `Edad: ${profile.age || "No indicada"}`,
    `Perfil ID: ${profile.id}`,
    `QR activo: ${profile.adminDisabled ? "No" : "Si"}`,
    "",
    "CONTACTOS DE EMERGENCIA",
    `Principal: ${profile.contact1Name} - ${profile.contact1Phone}`,
    `WhatsApp principal: ${profile.contact1WhatsApp || "No indicado"}`,
    `Secundario: ${profile.contact2Name || "No indicado"} - ${profile.contact2Phone || "No indicado"}`,
    `WhatsApp secundario: ${profile.contact2WhatsApp || "No indicado"}`,
    "",
    "ENLACE QR",
    getScanUrl(profile.id),
    "",
    "SEGURIDAD",
    "No se incluyen contrasenas ni datos medicos completos por correo.",
    "El DNI se envia oculto para reducir riesgo. Los datos completos deben gestionarse en una base de datos segura.",
  ].join("\n");
}

function buildAccountReport(account) {
  const profiles = getProfilesForAccount(account.id);
  const status = getAccountStatus(account);
  return [
    "Reporte administrativo Family Security",
    "",
    `Padre/tutor: ${account.parentName}`,
    `Gmail: ${account.email}`,
    `Telefono: ${account.phone}`,
    `DNI: ${maskDni(account.dni)}`,
    `Estado: ${status.label}`,
    `Cuenta ID: ${account.id}`,
    `Perfiles: ${profiles.length}`,
    "",
    "Nota: no se incluyen contrasenas, datos medicos completos ni direccion del niño por seguridad.",
  ].join("\n");
}

function buildGlobalReport() {
  return [
    "Reporte administrativo Family Security",
    "",
    `Cuentas: ${state.accounts.length}`,
    `Perfiles: ${state.profiles.length}`,
    `Escaneos: ${state.scans.length}`,
    `Fecha: ${new Date().toLocaleString("es")}`,
    "",
    "Nota: este resumen evita enviar datos sensibles por correo.",
  ].join("\n");
}

function getScanUrl(profileId) {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("scan", profileId);
  return url.toString();
}

function getHomeUrl() {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function downloadQr(profile) {
  const qr = createQrSvg(getScanUrl(profile.id));
  if (!qr.ok) return;
  const blob = new Blob([qr.svg], { type: "image/svg+xml" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `family-security-${slugify(profile.childName)}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
    const old = button.textContent;
    button.textContent = "Copiado";
    setTimeout(() => {
      button.textContent = old;
    }, 1200);
  } catch {
    prompt("Copia este enlace:", text);
  }
}

async function hashPassword(password, salt) {
  const value = `${salt}:${password}`;
  if (globalThis.crypto?.subtle) {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
}

function createQrSvg(text) {
  try {
    const qr = makeQr(text);
    const border = 4;
    const cell = 7;
    const fullSize = (qr.size + border * 2) * cell;
    const parts = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" role="img" aria-label="Codigo QR">`,
      `<rect width="100%" height="100%" fill="#fff"/>`,
    ];

    for (let y = 0; y < qr.size; y += 1) {
      for (let x = 0; x < qr.size; x += 1) {
        if (qr.modules[y][x]) {
          parts.push(
            `<rect x="${(x + border) * cell}" y="${(y + border) * cell}" width="${cell}" height="${cell}" fill="#111827"/>`,
          );
        }
      }
    }

    parts.push("</svg>");
    return { ok: true, svg: parts.join("") };
  } catch (error) {
    return {
      ok: false,
      message: error.message || "No se pudo generar el QR.",
    };
  }
}

function makeQr(text) {
  const data = new TextEncoder().encode(text);
  const version = pickQrVersion(data.length);
  const config = QR_LEVEL_L[version];
  const bits = [];

  appendBits(bits, 0b0100, 4);
  appendBits(bits, data.length, 8);
  data.forEach((byte) => appendBits(bits, byte, 8));

  const capacityBits = config.dataCodewords * 8;
  appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) bits.push(0);

  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    codewords.push(bitsToByte(bits.slice(i, i + 8)));
  }

  let pad = true;
  while (codewords.length < config.dataCodewords) {
    codewords.push(pad ? 0xec : 0x11);
    pad = !pad;
  }

  const ec = reedSolomon(codewords, config.ecCodewords);
  const modules = createMatrix(config.size, false);
  const reserved = createMatrix(config.size, false);

  drawFunctionPatterns(modules, reserved, version);
  drawData(modules, reserved, [...codewords, ...ec]);
  applyMask(modules, reserved);
  drawFormatBits(modules, reserved, 0);

  return { size: config.size, modules };
}

function pickQrVersion(byteLength) {
  for (const [version, config] of Object.entries(QR_LEVEL_L)) {
    const capacity = config.dataCodewords - 2;
    if (byteLength <= capacity) return Number(version);
  }
  throw new Error("El enlace es muy largo para este generador QR local.");
}

function appendBits(target, value, length) {
  for (let i = length - 1; i >= 0; i -= 1) {
    target.push((value >>> i) & 1);
  }
}

function bitsToByte(bits) {
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

function createMatrix(size, value) {
  return Array.from({ length: size }, () => Array(size).fill(value));
}

function drawFunctionPatterns(modules, reserved, version) {
  const size = modules.length;
  drawFinder(modules, reserved, 0, 0);
  drawFinder(modules, reserved, size - 7, 0);
  drawFinder(modules, reserved, 0, size - 7);

  for (let i = 8; i < size - 8; i += 1) {
    setFunction(modules, reserved, i, 6, i % 2 === 0);
    setFunction(modules, reserved, 6, i, i % 2 === 0);
  }

  const align = QR_LEVEL_L[version].align;
  for (const y of align) {
    for (const x of align) {
      const nearFinder =
        (x === 6 && y === 6) ||
        (x === 6 && y === size - 7) ||
        (x === size - 7 && y === 6);
      if (!nearFinder) drawAlignment(modules, reserved, x, y);
    }
  }

  setFunction(modules, reserved, 8, size - 8, true);
  reserveFormatAreas(reserved);
}

function drawFinder(modules, reserved, left, top) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const xx = left + x;
      const yy = top + y;
      if (!inBounds(modules, xx, yy)) continue;
      const black =
        x >= 0 &&
        x <= 6 &&
        y >= 0 &&
        y <= 6 &&
        (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      setFunction(modules, reserved, xx, yy, black);
    }
  }
}

function drawAlignment(modules, reserved, centerX, centerY) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      setFunction(
        modules,
        reserved,
        centerX + x,
        centerY + y,
        Math.max(Math.abs(x), Math.abs(y)) !== 1,
      );
    }
  }
}

function reserveFormatAreas(reserved) {
  const size = reserved.length;
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      reserved[8][i] = true;
      reserved[i][8] = true;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8][size - 1 - i] = true;
    reserved[size - 1 - i][8] = true;
  }
}

function drawData(modules, reserved, codewords) {
  const bits = [];
  codewords.forEach((codeword) => appendBits(bits, codeword, 8));
  const size = modules.length;
  let bitIndex = 0;
  let upward = true;

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vertical = 0; vertical < size; vertical += 1) {
      const y = upward ? size - 1 - vertical : vertical;
      for (let dx = 0; dx < 2; dx += 1) {
        const x = right - dx;
        if (reserved[y][x]) continue;
        modules[y][x] = bitIndex < bits.length ? Boolean(bits[bitIndex]) : false;
        bitIndex += 1;
      }
    }
    upward = !upward;
  }
}

function applyMask(modules, reserved) {
  const size = modules.length;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (!reserved[y][x] && (x + y) % 2 === 0) {
        modules[y][x] = !modules[y][x];
      }
    }
  }
}

function drawFormatBits(modules, reserved, mask) {
  const size = modules.length;
  const bits = getFormatBits(1, mask);

  for (let i = 0; i <= 5; i += 1) setFunction(modules, reserved, 8, i, getBit(bits, i));
  setFunction(modules, reserved, 8, 7, getBit(bits, 6));
  setFunction(modules, reserved, 8, 8, getBit(bits, 7));
  setFunction(modules, reserved, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) setFunction(modules, reserved, 14 - i, 8, getBit(bits, i));

  for (let i = 0; i < 8; i += 1) setFunction(modules, reserved, size - 1 - i, 8, getBit(bits, i));
  for (let i = 8; i < 15; i += 1) setFunction(modules, reserved, 8, size - 15 + i, getBit(bits, i));
  setFunction(modules, reserved, 8, size - 8, true);
}

function getFormatBits(errorCorrectionBits, mask) {
  const data = (errorCorrectionBits << 3) | mask;
  let remainder = data << 10;
  for (let i = 14; i >= 10; i -= 1) {
    if (((remainder >>> i) & 1) !== 0) {
      remainder ^= 0x537 << (i - 10);
    }
  }
  return ((data << 10) | remainder) ^ 0x5412;
}

function getBit(value, index) {
  return ((value >>> index) & 1) === 1;
}

function setFunction(modules, reserved, x, y, black) {
  if (!inBounds(modules, x, y)) return;
  modules[y][x] = black;
  reserved[y][x] = true;
}

function inBounds(modules, x, y) {
  return y >= 0 && y < modules.length && x >= 0 && x < modules.length;
}

function reedSolomon(data, degree) {
  const generator = rsGenerator(degree);
  const result = Array(degree).fill(0);

  for (const value of data) {
    const factor = value ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i += 1) {
      result[i] ^= gfMultiply(generator[i + 1], factor);
    }
  }
  return result;
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = [1, gfPow(i)];
    const product = Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      product[j] ^= gfMultiply(poly[j], next[0]);
      product[j + 1] ^= gfMultiply(poly[j], next[1]);
    }
    poly = product;
  }
  return poly;
}

const GF_EXP = (() => {
  const exp = Array(512).fill(0);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) exp[i] = exp[i - 255];
  return exp;
})();

const GF_LOG = (() => {
  const log = Array(256).fill(0);
  for (let i = 0; i < 255; i += 1) log[GF_EXP[i]] = i;
  return log;
})();

function gfMultiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a] + GF_LOG[b]];
}

function gfPow(power) {
  return GF_EXP[power % 255];
}

function makeId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function maskDni(value) {
  const dni = String(value || "").trim();
  if (dni.length <= 4) return dni ? "****" : "No registrado";
  return `${"*".repeat(Math.max(2, dni.length - 4))}${dni.slice(-4)}`;
}

function getInitials(name) {
  return String(name || "FS")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function slugify(value) {
  return String(value || "qr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

render();
