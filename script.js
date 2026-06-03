


























"use strict";

// ==================== CONFIGURACIÓN ====================
const SUPABASE_CONFIG = {
  url: "https://lhhaaqhonoyplaqoaura.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaGFhcWhvbm95cGxhcW9hdXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDkwMTgsImV4cCI6MjA5NjA4NTAxOH0.MsFLheaPbrncvqKrOLK5bdjDYZlvBMX8N-1lD5OJiCo"
};

// ==================== ESTADO ====================
const state = {
  profile: null,
  users: JSON.parse(localStorage.ad_users || '[{"id":"ADM-2026-001","email":"admin@avanzadigital.com","pass":"admin123","nombre":"Admin","apellido":"Principal","rol":"ADMINISTRADOR"},{"id":"FAC-2026-001","email":"facilitador@avanzadigital.com","pass":"fac123","nombre":"Juan","apellido":"Pérez","rol":"FACILITADOR"},{"id":"AD-2026-001","email":"estudiante@avanzadigital.com","pass":"est123","nombre":"María","apellido":"García","rol":"ESTUDIANTE"}]'),
  payments: JSON.parse(localStorage.ad_payments || "[]"),
  boletinesHabilitados: localStorage.ad_boletines === "true"
};

function save() {
  localStorage.ad_users = JSON.stringify(state.users);
  localStorage.ad_payments = JSON.stringify(state.payments);
  localStorage.ad_boletines = state.boletinesHabilitados;
}

// ==================== HELPERS ====================
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function esc(s) { return String(s||"").replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]); }
function fmt(n) { return "RD$" + Number(n||0).toLocaleString("es-DO"); }

// ==================== NAVEGACIÓN (NO TOCA LA PÁGINA PÚBLICA) ====================
document.addEventListener("DOMContentLoaded", () => {
  // Navbar scroll
  window.addEventListener("scroll", () => {
    const h = $("#siteHeader");
    if(h) h.classList.toggle("scrolled", scrollY > 20);
  }, {passive:true});

  // Menú móvil
  const toggle = $(".nav-toggle"), menu = $("#primaryNav");
  if(toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      menu.classList.toggle("is-open", !open);
    });
  }

  // Smooth scroll
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener("click", e => {
      const id = a.getAttribute("href");
      if(!id || id === "#") return;
      const el = $(id);
      if(!el) return;
      e.preventDefault();
      menu?.classList.remove("is-open");
      el.scrollIntoView({behavior:"smooth"});
    });
  });

  // Login modal
  $$("[data-open-login]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); openLogin(); }));
  $$("[data-close-login]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); closeLogin(); }));
  document.addEventListener("keydown", e => { if(e.key==="Escape") closeLogin(); });
  $("#loginModal")?.addEventListener("click", e => { if(e.target.classList.contains("modal-backdrop")) closeLogin(); });

  // Login form
  $("#loginForm")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = $("#loginEmail")?.value.trim();
    const pass = $("#loginPassword")?.value.trim();
    if(!email || !pass) return toast("error","Completa todos los campos");
    
    const user = state.users.find(u => u.email === email && u.pass === pass);
    if(!user) return toast("error","Credenciales inválidas","Email o contraseña incorrectos");
    
    state.profile = user;
    closeLogin();
    $("#loginForm").reset();
    showDashboard(user);
    toast("success","Bienvenido",user.nombre + " " + user.apellido);
  });

  // Verificar certificado
  $("#certificateForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const code = $("#certificateCode")?.value.trim().toUpperCase();
    const r = $("#certificateResult");
    if(!r) return;
    if(code === "AD-CERT-2026-001" || state.users.some(u => u.certCode === code)) {
      r.className = "verify-result is-valid";
      r.innerHTML = `<svg><use href="#icon-check-circle"></use></svg><div><strong>✅ Certificado válido</strong><span>Código: ${esc(code)}</span></div>`;
    } else {
      r.className = "verify-result is-error";
      r.innerHTML = `<svg><use href="#icon-alert-circle"></use></svg><div><strong>❌ No encontrado</strong></div>`;
    }
  });

  // Contacto
  $("#contactForm")?.addEventListener("submit", e => {
    e.preventDefault();
    const btn = $(".submit-button");
    if(btn){ btn.disabled = true; btn.querySelector("span").textContent = "Enviando..."; }
    setTimeout(() => {
      $("#contactForm").reset();
      toast("success","Mensaje enviado","Te contactaremos pronto");
      if(btn){ btn.disabled = false; btn.querySelector("span").textContent = "Enviar Mensaje"; }
    }, 800);
  });

  // Animaciones reveal
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add("is-visible"); });
  }, {threshold:0.1});
  $$(".reveal").forEach(el => observer.observe(el));

  console.log("✅ Avanza Digital listo");
  console.log("admin@avanzadigital.com / admin123");
  console.log("facilitador@avanzadigital.com / fac123");
  console.log("estudiante@avanzadigital.com / est123");
});

// ==================== LOGIN MODAL ====================
function openLogin() {
  const m = $("#loginModal");
  if(m){ m.classList.add("is-open"); m.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); }
}
function closeLogin() {
  const m = $("#loginModal");
  if(m){ m.classList.remove("is-open"); m.setAttribute("aria-hidden","true"); document.body.classList.remove("modal-open"); }
}

// ==================== TOAST ====================
function toast(type, title, msg) {
  const c = $("#toastContainer");
  if(!c) return;
  const icons = {success:"check-circle",error:"alert-circle",info:"info"};
  const t = document.createElement("div");
  t.className = `toast ${type}`;
  t.innerHTML = `<svg><use href="#icon-${icons[type]}"></use></svg><div><strong>${esc(title)}</strong><span>${esc(msg)}</span></div><button onclick="this.parentElement.remove()"><svg><use href="#icon-x"></use></svg></button>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

// ==================== DASHBOARD ====================
function showDashboard(user) {
  // Ocultar sitio público
  const publicSite = $("#publicSite");
  if(publicSite) publicSite.style.display = "none";
  
  const whatsapp = $(".floating-whatsapp");
  if(whatsapp) whatsapp.style.display = "none";

  // Mostrar dashboard
  const container = $("#dashboardContainer");
  if(!container) return;
  container.classList.remove("hidden");
  container.innerHTML = buildDashboard(user);
  
  // Inicializar navegación del dashboard
  $$(".dash-nav-link").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      $$(".dash-nav-link").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      const sectionId = link.getAttribute("data-section");
      $$(".dash-section").forEach(s => s.classList.remove("active"));
      const target = $("#" + sectionId);
      if(target) target.classList.add("active");
    });
  });
}

function buildDashboard(user) {
  const r = user.rol;
  let sidebar = "", content = "";
  
  // Sidebar común
  sidebar = `
    <div class="dash-sidebar-header"><svg><use href="#icon-graduation"></use></svg><span>Avanza<span style="color:#14B8A6">Digital</span></span></div>
    <nav class="dash-nav">
      <a href="#" class="dash-nav-link active" data-section="dash-home"><svg><use href="#icon-home"></use></svg>Dashboard</a>
  `;

  if(r === "ADMINISTRADOR") {
    sidebar += `
      <a href="#" class="dash-nav-link" data-section="dash-users"><svg><use href="#icon-users"></use></svg>Usuarios</a>
      <a href="#" class="dash-nav-link" data-section="dash-payments"><svg><use href="#icon-credit-card"></use></svg>Pagos</a>
      <a href="#" class="dash-nav-link" data-section="dash-facilitador"><svg><use href="#icon-user"></use></svg>Funciones Facilitador</a>
    `;
    content = buildAdminContent();
  } else if(r === "FACILITADOR") {
    sidebar += `
      <a href="#" class="dash-nav-link" data-section="dash-attendance"><svg><use href="#icon-calendar"></use></svg>Asistencia</a>
      <a href="#" class="dash-nav-link" data-section="dash-grades"><svg><use href="#icon-trending-up"></use></svg>Calificaciones</a>
      <a href="#" class="dash-nav-link" data-section="dash-boletines"><svg><use href="#icon-file-text"></use></svg>Boletines</a>
      <a href="#" class="dash-nav-link" data-section="dash-announce"><svg><use href="#icon-megaphone"></use></svg>Anuncios</a>
    `;
    content = buildFacilitadorContent();
  } else {
    sidebar += `
      <a href="#" class="dash-nav-link" data-section="dash-profile"><svg><use href="#icon-user"></use></svg>Mi Perfil</a>
      <a href="#" class="dash-nav-link" data-section="dash-attendance"><svg><use href="#icon-calendar"></use></svg>Asistencia</a>
      <a href="#" class="dash-nav-link" data-section="dash-tasks"><svg><use href="#icon-clipboard"></use></svg>Tareas</a>
      <a href="#" class="dash-nav-link" data-section="dash-payments"><svg><use href="#icon-credit-card"></use></svg>Pagos</a>
      <a href="#" class="dash-nav-link" data-section="dash-announce"><svg><use href="#icon-megaphone"></use></svg>Anuncios</a>
      <a href="#" class="dash-nav-link" data-section="dash-certs"><svg><use href="#icon-certificate"></use></svg>Certificados</a>
      <a href="#" class="dash-nav-link" data-section="dash-boletin"><svg><use href="#icon-file-text"></use></svg>Boletín</a>
    `;
    content = buildEstudianteContent();
  }

  sidebar += `</nav>
    <div class="dash-sidebar-footer">
      <p style="color:rgba(255,255,255,.7);font-size:.7rem;margin-bottom:8px;">${user.id}</p>
      <button class="btn btn-outline btn-small" style="width:100%;color:white;border-color:rgba(255,255,255,.3);" onclick="logout()"><svg><use href="#icon-log-out"></use></svg>Cerrar Sesión</button>
    </div>`;

  return `
    <div class="dashboard-layout">
      <aside class="dash-sidebar">${sidebar}</aside>
      <main class="dash-main">
        <header class="dash-header"><h2>${user.nombre} ${user.apellido}</h2><span class="role-badge role-${user.rol.toLowerCase()}">${user.rol}</span></header>
        <div class="dash-content">${content}</div>
      </main>
    </div>
  `;
}

// ==================== CONTENIDO ADMIN ====================
function buildAdminContent() {
  return `
    <div class="dash-section active" id="dash-home">
      <h2>Panel de Administrador</h2>
      <div class="dash-stats">
        <div class="dash-stat-card"><svg><use href="#icon-users"></use></svg><div><strong>${state.users.length}</strong><span>Usuarios</span></div></div>
        <div class="dash-stat-card"><svg><use href="#icon-credit-card"></use></svg><div><strong>${fmt(state.payments.reduce((s,p)=>s+Number(p.amount),0))}</strong><span>Pagos</span></div></div>
      </div>
    </div>

    <div class="dash-section" id="dash-users">
      <div class="dash-card">
        <h3>Crear Usuario</h3>
        <div class="dash-form">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-field"><label>Nombre</label><input type="text" id="newNombre" placeholder="Nombre"></div>
            <div class="form-field"><label>Apellido</label><input type="text" id="newApellido" placeholder="Apellido"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-field"><label>Email</label><input type="email" id="newEmail" placeholder="correo@ejemplo.com"></div>
            <div class="form-field"><label>Rol</label><select id="newRol"><option value="ESTUDIANTE">ESTUDIANTE</option><option value="FACILITADOR">FACILITADOR</option><option value="ADMINISTRADOR">ADMINISTRADOR</option></select></div>
          </div>
          <button class="btn btn-primary btn-small" onclick="crearUsuario()">Crear Usuario</button>
        </div>
      </div>
      <div class="dash-card" style="margin-top:16px;">
        <h3>Lista de Usuarios</h3>
        <table><thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th></tr></thead>
        <tbody id="usersTable"></tbody></table>
      </div>
    </div>

    <div class="dash-section" id="dash-payments">
      <div class="dash-card">
        <h3>Registrar Pago</h3>
        <div class="dash-form">
          <div class="form-field"><label>Estudiante</label><select id="payStudent">${state.users.filter(u=>u.rol==="ESTUDIANTE").map(u=>`<option value="${u.id}">${u.nombre} ${u.apellido}</option>`).join("")}</select></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div class="form-field"><label>Comprobante</label><input type="text" id="payReceipt"></div>
            <div class="form-field"><label>Monto</label><input type="number" id="payAmount" value="1000"></div>
          </div>
          <button class="btn btn-primary btn-small" onclick="registrarPago()">Registrar</button>
        </div>
      </div>
      <div class="dash-card" style="margin-top:16px;">
        <h3>Historial</h3>
        <table><thead><tr><th>Estudiante</th><th>Comprobante</th><th>Monto</th></tr></thead>
        <tbody id="paymentsTable"></tbody></table>
      </div>
    </div>

    <div class="dash-section" id="dash-facilitador">
      ${buildFacilitadorContent()}
    </div>
  `;
}

// ==================== CONTENIDO FACILITADOR ====================
function buildFacilitadorContent() {
  return `
    <div class="dash-section active" id="dash-home">
      <h2>Panel de Facilitador</h2>
      <p>Gestiona asistencia, calificaciones y boletines.</p>
    </div>

    <div class="dash-section" id="dash-attendance">
      <div class="dash-card"><h3>Registro de Asistencia</h3><p>Funcionalidad disponible.</p></div>
    </div>

    <div class="dash-section" id="dash-grades">
      <div class="dash-card">
        <h3>Calificaciones</h3>
        <p>Selecciona estudiante y módulo para calificar.</p>
      </div>
    </div>

    <div class="dash-section" id="dash-boletines">
      <div class="dash-card">
        <h3>Control de Boletines</h3>
        <p>Estado: <strong id="boletinStatus">${state.boletinesHabilitados ? "HABILITADOS" : "DESHABILITADOS"}</strong></p>
        <div style="display:flex;gap:10px;margin-top:12px;">
          <button class="btn btn-primary btn-small" onclick="habilitarBoletines()">Habilitar</button>
          <button class="btn btn-outline btn-small" onclick="deshabilitarBoletines()">Deshabilitar</button>
        </div>
      </div>
    </div>

    <div class="dash-section" id="dash-announce">
      <div class="dash-card"><h3>Anuncios</h3><p>Funcionalidad disponible.</p></div>
    </div>
  `;
}

// ==================== CONTENIDO ESTUDIANTE ====================
function buildEstudianteContent() {
  const hab = state.boletinesHabilitados;
  return `
    <div class="dash-section active" id="dash-home">
      <h2>Mi Panel</h2>
      <div class="dash-stats">
        <div class="dash-stat-card"><svg><use href="#icon-book-open"></use></svg><div><strong>AD-101</strong><span>Programa</span></div></div>
        <div class="dash-stat-card"><svg><use href="#icon-calendar"></use></svg><div><strong>92%</strong><span>Asistencia</span></div></div>
      </div>
    </div>
    <div class="dash-section" id="dash-profile"><div class="dash-card"><h3>Mi Perfil</h3><p><strong>Nombre:</strong> ${esc(state.profile?.nombre)} ${esc(state.profile?.apellido)}</p><p><strong>Email:</strong> ${esc(state.profile?.email)}</p></div></div>
    <div class="dash-section" id="dash-attendance"><div class="dash-card"><h3>Asistencia</h3><p>24/26 clases - 92%</p></div></div>
    <div class="dash-section" id="dash-tasks"><div class="dash-card"><h3>Tareas</h3><p>No hay tareas pendientes.</p></div></div>
    <div class="dash-section" id="dash-payments"><div class="dash-card"><h3>Pagos</h3><p>Estado: Al día</p></div></div>
    <div class="dash-section" id="dash-announce"><div class="dash-card"><h3>Anuncios</h3><p>No hay anuncios.</p></div></div>
    <div class="dash-section" id="dash-certs"><div class="dash-card"><h3>Certificados</h3><p>No hay certificados disponibles.</p></div></div>
    <div class="dash-section" id="dash-boletin">
      <div class="dash-card">
        <h3>Boletín Final</h3>
        ${hab ? `
          <p style="color:#059669;">✅ Los boletines están habilitados.</p>
          <button class="btn btn-primary btn-small" onclick="descargarBoletin()"><svg><use href="#icon-download"></use></svg>Descargar Boletín PDF</button>
        ` : `
          <p style="color:#DC2626;">🔒 El facilitador no ha habilitado los boletines.</p>
          <button class="btn btn-primary btn-small" disabled>Descargar Boletín PDF</button>
        `}
      </div>
    </div>
  `;
}

// ==================== FUNCIONES GLOBALES ====================
window.crearUsuario = function() {
  const nombre = $("#newNombre")?.value.trim();
  const apellido = $("#newApellido")?.value.trim();
  const email = $("#newEmail")?.value.trim();
  const rol = $("#newRol")?.value;
  
  if(!nombre || !apellido || !email) return toast("error","Completa todos los campos");
  
  const prefix = rol === "ADMINISTRADOR" ? "ADM" : rol === "FACILITADOR" ? "FAC" : "AD";
  const id = prefix + "-" + new Date().getFullYear() + "-" + String(state.users.length + 1).padStart(3,'0');
  const pass = Math.random().toString(36).slice(-8);
  
  state.users.push({ id, email, pass, nombre, apellido, rol });
  save();
  
  // Actualizar tabla
  actualizarTablaUsuarios();
  
  toast("success","Usuario creado",`${nombre} ${apellido} - Contraseña: ${pass}`);
  $("#newNombre").value = ""; $("#newApellido").value = ""; $("#newEmail").value = "";
};

window.registrarPago = function() {
  const student = $("#payStudent")?.value;
  const receipt = $("#payReceipt")?.value.trim();
  const amount = $("#payAmount")?.value;
  
  if(!student || !receipt || !amount) return toast("error","Completa todos los campos");
  
  const stu = state.users.find(u => u.id === student);
  state.payments.push({ student, studentName: stu?.nombre + " " + stu?.apellido, receipt, amount, date: new Date().toISOString().split('T')[0] });
  save();
  actualizarTablaPagos();
  toast("success","Pago registrado",`${fmt(amount)}`);
  $("#payReceipt").value = "";
};

window.habilitarBoletines = function() {
  state.boletinesHabilitados = true;
  save();
  const el = $("#boletinStatus");
  if(el) el.textContent = "HABILITADOS";
  toast("success","Boletines habilitados","Los estudiantes pueden descargar sus boletines.");
};

window.deshabilitarBoletines = function() {
  state.boletinesHabilitados = false;
  save();
  const el = $("#boletinStatus");
  if(el) el.textContent = "DESHABILITADOS";
  toast("info","Boletines deshabilitados");
};

window.descargarBoletin = function() {
  if(!state.boletinesHabilitados) return toast("error","Boletines deshabilitados");
  const win = window.open("","_blank","width=800,height=600");
  if(!win) return toast("error","Permite ventanas emergentes");
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Boletín Final</title><style>body{font-family:Arial;padding:40px;}h1{color:#0F172A;}table{width:100%;border-collapse:collapse;}th{background:#0F172A;color:white;padding:10px;}td{padding:10px;border-bottom:1px solid #E2E8F0;}.stamp{border:3px solid #14B8A6;color:#14B8A6;display:inline-block;padding:10px 30px;font-size:20px;font-weight:bold;margin-top:20px;}</style></head><body><h1>Avanza Digital - Boletín Final</h1><p>Estudiante: ${esc(state.profile?.nombre)} ${esc(state.profile?.apellido)}</p><p>Programa: AD-101</p><table><tr><th>Módulo</th><th>Conducta</th><th>Participación</th><th>Tarea</th><th>Total</th></tr>${[1,2,3,4,5,6].map(m=>`<tr><td>Módulo ${m}</td><td>5</td><td>2</td><td>3</td><td>10</td></tr>`).join("")}</table><p><strong>Proyecto Final:</strong> 35/40</p><h2>Nota Final: 95/100 - APROBADO</h2><div class="stamp">APROBADO</div><script>setTimeout(()=>window.print(),500);<\/script></body></html>`);
  win.document.close();
  toast("success","Boletín generado","El PDF se abrirá en una nueva ventana.");
};

window.logout = function() {
  state.profile = null;
  const publicSite = $("#publicSite");
  if(publicSite) publicSite.style.display = "";
  const whatsapp = $(".floating-whatsapp");
  if(whatsapp) whatsapp.style.display = "";
  const container = $("#dashboardContainer");
  if(container) { container.classList.add("hidden"); container.innerHTML = ""; }
  toast("info","Sesión cerrada");
};

// ==================== ACTUALIZAR TABLAS ====================
function actualizarTablaUsuarios() {
  const tbody = $("#usersTable");
  if(!tbody) return;
  tbody.innerHTML = state.users.map(u => `<tr><td>${esc(u.id)}</td><td>${esc(u.nombre)} ${esc(u.apellido)}</td><td>${esc(u.email)}</td><td>${esc(u.rol)}</td></tr>`).join("");
}

function actualizarTablaPagos() {
  const tbody = $("#paymentsTable");
  if(!tbody) return;
  if(!state.payments.length) { tbody.innerHTML = '<tr><td colspan="3">No hay pagos</td></tr>'; return; }
  tbody.innerHTML = state.payments.map(p => `<tr><td>${esc(p.studentName)}</td><td>${esc(p.receipt)}</td><td>${fmt(p.amount)}</td></tr>`).join("");
}

// Inicializar tablas cuando se carga el dashboard
setTimeout(() => {
  actualizarTablaUsuarios();
  actualizarTablaPagos();
}, 100);