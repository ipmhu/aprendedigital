"use strict";
/* ========================================================================
   AVANZA DIGITAL v12.0 - SUPABASE + LOCAL STORAGE
   ======================================================================== */

const SUPABASE_URL = "https://lhhaaqhonoyplaqoaura.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoaGFhcWhvbm95cGxhcW9hdXJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDkwMTgsImV4cCI6MjA5NjA4NTAxOH0.MsFLheaPbrncvqKrOLK5bdjDYZlvBMX8N-1lD5OJiCo";

const DEFAULT_USERS = [
    { id: "ADM-2026-001", email: "admin@avanzadigital.com", pass: "admin123", nombre: "Admin", apellido: "Principal", rol: "ADMINISTRADOR", activo: true },
    { id: "FAC-2026-001", email: "facilitador@avanzadigital.com", pass: "fac123", nombre: "Juan", apellido: "Pérez", rol: "FACILITADOR", activo: true },
    { id: "AD-2026-001", email: "estudiante@avanzadigital.com", pass: "est123", nombre: "María", apellido: "García", rol: "ESTUDIANTE", activo: true }
];

const DEFAULT_STUDENTS = [
    { id: "AD-2026-001", nombre: "María García", programa: "AD-101", cohorte: "Julio 2026", aprobado: null },
    { id: "AD-2026-002", nombre: "Carlos López", programa: "AD-101", cohorte: "Julio 2026", aprobado: null },
    { id: "AD-2026-003", nombre: "Ana Martínez", programa: "AD-201", cohorte: "Agosto 2026", aprobado: null }
];

const DEFAULT_PROGRAMS = [
    { codigo: "AD-101", nombre: "Inteligencia Artificial Aplicada", descripcion: "Aprende a implementar soluciones de IA en entornos reales. Desde fundamentos hasta aplicaciones prácticas con herramientas modernas de machine learning.", duracion_semanas: 2, precio: 1000.00 },
    { codigo: "AD-201", nombre: "Digitación y Ofimática Profesional", descripcion: "Domina las herramientas ofimáticas esenciales y técnicas avanzadas de digitación para maximizar tu productividad en el entorno empresarial moderno.", duracion_semanas: 4, precio: 1000.00 },
    { codigo: "AD-301", nombre: "Computación y Soporte Técnico", descripcion: "Fórmate como técnico especializado en soporte de sistemas informáticos. Aprende diagnóstico, mantenimiento preventivo y resolución de problemas técnicos.", duracion_semanas: 3, precio: 1000.00 }
];

const state = {
    profile: null,
    users: [],
    students: [],
    programs: [...DEFAULT_PROGRAMS],
    payments: [],
    announcements: [],
    schedules: [],
    certificates: [],
    grades: {},
    attendance: {},
    tasks: [],
    boletinesHabilitados: false,
    supabaseConnected: false
};

// ==================== HELPERS ====================
const $ = (s, sc) => (sc || document).querySelector(s);
const $$ = (s, sc) => [...(sc || document).querySelectorAll(s)];
function esc(s) { return String(s || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]); }
function fmt(n) { return "RD$" + Number(n || 0).toLocaleString("es-DO"); }
function genId(prefijo) { const year = new Date().getFullYear(); const num = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0'); return prefijo + "-" + year + "-" + num; }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim()); }
function today() { return new Date().toISOString().split('T')[0]; }

// ==================== SUPABASE ====================
async function supabaseReq(path, opts = {}) {
    const url = SUPABASE_URL.replace(/\/$/, "");
    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, ...opts.headers };
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    try {
        const res = await fetch(`${url}${path}`, { ...opts, headers });
        if (!res.ok) return null;
        const txt = await res.text();
        return txt ? JSON.parse(txt) : null;
    } catch (e) { return null; }
}

async function loadUsersFromSupabase() {
    try {
        const data = await supabaseReq("/rest/v1/usuarios?select=*");
        if (data && data.length > 0) {
            state.supabaseConnected = true;
            // Convertir formato Supabase a nuestro formato
            state.users = data.map(u => ({
                id: u.identificador,
                email: u.email,
                pass: u.password_hash,
                nombre: u.nombre,
                apellido: u.apellido,
                rol: u.rol,
                activo: u.activo
            }));
            // También cargar estudiantes desde Supabase
            const studentsData = await supabaseReq("/rest/v1/usuarios?select=*&rol=eq.ESTUDIANTE");
            if (studentsData && studentsData.length > 0) {
                // Mantener los estudiantes existentes y agregar los nuevos
                const existingIds = state.students.map(s => s.id);
                studentsData.forEach(u => {
                    if (!existingIds.includes(u.identificador)) {
                        state.students.push({
                            id: u.identificador,
                            nombre: `${u.nombre} ${u.apellido}`,
                            programa: "AD-101",
                            cohorte: "Julio " + new Date().getFullYear(),
                            aprobado: null
                        });
                    }
                });
            }
            console.log("");
            return true;
        }
    } catch (e) {
        console.log("⚠️ No se pudo conectar con Supabase, usando datos locales");
    }
    return false;
}

// ==================== INICIALIZACIÓN ====================
function initState() {
    const localUsers = JSON.parse(localStorage.getItem("ad_users") || "null");
    const localStudents = JSON.parse(localStorage.getItem("ad_students") || "null");
    
    state.users = localUsers || [...DEFAULT_USERS];
    state.students = localStudents || [...DEFAULT_STUDENTS];
    state.payments = JSON.parse(localStorage.getItem("ad_payments") || "[]");
    state.announcements = JSON.parse(localStorage.getItem("ad_announcements") || "[]");
    state.schedules = JSON.parse(localStorage.getItem("ad_schedules") || "[]");
    state.certificates = JSON.parse(localStorage.getItem("ad_certificates") || "[]");
    state.grades = JSON.parse(localStorage.getItem("ad_grades") || "{}");
    state.attendance = JSON.parse(localStorage.getItem("ad_attendance") || "{}");
    state.tasks = JSON.parse(localStorage.getItem("ad_tasks") || "[]");
    state.boletinesHabilitados = localStorage.getItem("ad_boletines") === "true";
}

function saveAll() {
    localStorage.setItem("ad_users", JSON.stringify(state.users));
    localStorage.setItem("ad_students", JSON.stringify(state.students));
    localStorage.setItem("ad_payments", JSON.stringify(state.payments));
    localStorage.setItem("ad_announcements", JSON.stringify(state.announcements));
    localStorage.setItem("ad_schedules", JSON.stringify(state.schedules));
    localStorage.setItem("ad_certificates", JSON.stringify(state.certificates));
    localStorage.setItem("ad_grades", JSON.stringify(state.grades));
    localStorage.setItem("ad_attendance", JSON.stringify(state.attendance));
    localStorage.setItem("ad_tasks", JSON.stringify(state.tasks));
    localStorage.setItem("ad_boletines", String(state.boletinesHabilitados));
}

// ==================== ASIGNAR USUARIOS POR DEFECTO SI NO HAY NINGUNO ====================
(function ensureUsersExist() {
    initState();
    if (state.users.length === 0) {
        state.users = [...DEFAULT_USERS];
        state.students = [...DEFAULT_STUDENTS];
        saveAll();
    }
})();

// ==================== INTENTAR CARGAR DESDE SUPABASE ====================
loadUsersFromSupabase().then(success => {
    if (!success) {
        // Si no hay usuarios en Supabase, asegurar que existan los locales
        if (state.users.length === 0) {
            state.users = [...DEFAULT_USERS];
        }
    }
    saveAll();
});

// ==================== PDF GENERATOR ====================
function generatePDF(title, content) {
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) { showToast("error", "Popup bloqueado", "Permite ventanas emergentes."); return; }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${esc(title)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:40px;color:#1a1a1a;line-height:1.6}
.header{text-align:center;border-bottom:3px solid #14B8A6;padding-bottom:20px;margin-bottom:30px}.header h1{color:#0F172A;font-size:28px}
.header p{color:#14B8A6;font-size:15px;margin:5px 0}h2{color:#0F172A;margin:20px 0 10px}
table{width:100%;border-collapse:collapse;margin:15px 0}th{background:#0F172A;color:white;padding:12px;text-align:left;font-size:13px}
td{padding:10px;border-bottom:1px solid #E2E8F0;font-size:13px}tr:nth-child(even){background:#F8FAFC}
.footer{margin-top:40px;padding-top:20px;border-top:1px solid #E2E8F0;text-align:center;color:#64748B;font-size:11px}
.stamp{border:3px solid #14B8A6;color:#14B8A6;display:inline-block;padding:12px 35px;font-size:22px;font-weight:bold;margin-top:25px;letter-spacing:2px}
.signature{margin-top:50px;text-align:center}.signature-line{width:250px;border-top:1px solid #334155;margin:40px auto 5px}
@media print{body{padding:30px}@page{size:A4;margin:15mm}}</style></head><body>
<div class="header"><h1>Avanza Digital</h1><p>Aprende. Aplica. Avanza.</p><p>+1 (829) 674-2341 | aprendedigital@outlook.com</p></div>
${content}
<div class="footer"><p>Documento generado el ${new Date().toLocaleDateString("es-DO",{day:"2-digit",month:"long",year:"numeric"})}</p><p>© ${new Date().getFullYear()} Avanza Digital</p></div>
<script>setTimeout(function(){window.print();},600);<\/script></body></html>`);
    win.document.close();
}

// ==================== TOAST ====================
function showToast(type, title, msg) {
    const container = document.getElementById("toastContainer");
    if (!container) return;
    const icons = { success: "check-circle", error: "alert-circle", info: "info" };
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.setAttribute("role", "alert");
    toast.innerHTML = `<svg aria-hidden="true"><use href="#icon-${icons[type]||'info'}"></use></svg><div><strong>${esc(title)}</strong><span>${esc(msg)}</span></div><button type="button" aria-label="Cerrar" onclick="this.parentElement.remove()"><svg aria-hidden="true"><use href="#icon-x"></use></svg></button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add("is-removing"); setTimeout(() => toast.remove(), 300); }, 5000);
}

// ==================== DOM INIT ====================
document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener("scroll", () => { const h = document.getElementById("siteHeader"); if (h) h.classList.toggle("scrolled", window.scrollY > 30); }, { passive: true });

    const toggle = document.querySelector(".nav-toggle"), menu = document.getElementById("primaryNav");
    if (toggle && menu) {
        toggle.addEventListener("click", () => {
            const open = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!open));
            menu.classList.toggle("is-open", !open);
            document.body.classList.toggle("nav-open", !open);
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener("click", e => {
            const id = a.getAttribute("href"); if (!id || id === "#") return;
            const el = document.getElementById(id.substring(1)); if (!el) return;
            e.preventDefault(); menu?.classList.remove("is-open"); document.body.classList.remove("nav-open");
            toggle?.setAttribute("aria-expanded", "false"); el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    });

    document.querySelectorAll("[data-open-login]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); openLoginModal(); }));
    document.querySelectorAll("[data-close-login]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); closeLoginModal(); }));
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLoginModal(); });
    const loginModal = document.getElementById("loginModal");
    loginModal?.addEventListener("click", e => { if (e.target === loginModal || e.target.classList.contains("modal-backdrop")) closeLoginModal(); });

    document.getElementById("loginForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const email = document.getElementById("loginEmail")?.value.trim().toLowerCase();
        const pass = document.getElementById("loginPassword")?.value.trim();
        if (!email || !pass) return showToast("error", "Error", "Completa todos los campos.");
        
        // Buscar en TODOS los usuarios (locales + Supabase)
        const user = state.users.find(u => u.email === email && u.pass === pass);
        if (!user) return showToast("error", "Error de autenticación", "Credenciales inválidas. Verifica tu email y contraseña.");
        if (!user.activo) return showToast("error", "Usuario inactivo", "Contacta al administrador.");
        
        state.profile = user;
        closeLoginModal();
        document.getElementById("loginForm").reset();
        showDashboard(user);
        showToast("success", "Inicio de sesión exitoso", `Bienvenido/a, ${user.nombre}.`);
    });

    document.getElementById("forgotPasswordLink")?.addEventListener("click", e => { e.preventDefault(); closeLoginModal(); showToast("info", "Recuperar contraseña", "Contacta a soporte: +1 (829) 674-2341"); });

    document.getElementById("certificateForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const code = document.getElementById("certificateCode")?.value.trim().toUpperCase();
        const result = document.getElementById("certificateResult"); if (!result) return;
        const cert = state.certificates.find(c => c.code === code);
        if (cert || code === "AD-CERT-2026-001") {
            result.className = "verify-result is-valid";
            result.innerHTML = `<svg><use href="#icon-check-circle"></use></svg><div><strong>✅ Certificado válido</strong><span>Código: ${esc(cert?.code||code)}</span></div>`;
        } else {
            result.className = "verify-result is-error";
            result.innerHTML = `<svg><use href="#icon-alert-circle"></use></svg><div><strong>❌ No encontrado</strong></div>`;
        }
    });

    document.getElementById("contactForm")?.addEventListener("submit", e => {
        e.preventDefault();
        const form = document.getElementById("contactForm");
        const btn = form.querySelector(".submit-button");
        const fd = new FormData(form); const data = Object.fromEntries(fd.entries());
        if (!data.name?.trim() || !validEmail(data.email) || !data.program || !data.message?.trim()) return showToast("error", "Incompleto", "Llena todos los campos.");
        if (btn) { btn.classList.add("is-loading"); btn.disabled = true; btn.querySelector("span").textContent = "Enviando..."; }
        setTimeout(() => { form.reset(); showToast("success", "Enviado", "Te contactaremos pronto."); if (btn) { btn.classList.remove("is-loading"); btn.disabled = false; btn.querySelector("span").textContent = "Enviar Mensaje"; } }, 1000);
    });

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add("is-visible"); }); }, { threshold: 0.1 });
        document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
    }

    renderPublicPrograms();
});

// ==================== LOGIN MODAL ====================
function openLoginModal() { const m = document.getElementById("loginModal"); if (m) { m.classList.add("is-open"); m.setAttribute("aria-hidden","false"); document.body.classList.add("modal-open"); setTimeout(() => document.getElementById("loginEmail")?.focus(), 150); } }
function closeLoginModal() { const m = document.getElementById("loginModal"); if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden","true"); document.body.classList.remove("modal-open"); } }

// ==================== RENDER PROGRAMAS ====================
function renderPublicPrograms() {
    const grid = document.getElementById("programGrid"); if (!grid) return;
    grid.innerHTML = state.programs.map(p => `<article class="program-card reveal is-visible"><span class="program-code">${esc(p.codigo)}</span><div class="program-icon"><svg><use href="#icon-book-open"></use></svg></div><h3>${esc(p.nombre)}</h3><p>${esc(p.descripcion)}</p><ul class="feature-list"><li><svg><use href="#icon-clock"></use></svg>${p.duracion_semanas} semanas</li><li><svg><use href="#icon-video"></use></svg>Clases en Vivo</li><li><svg><use href="#icon-globe"></use></svg>100% Virtual</li><li><svg><use href="#icon-certificate"></use></svg>Certificado Digital</li></ul><div class="program-footer"><span class="price">${fmt(p.precio)}</span><a class="btn btn-outline" href="#contacto">Más Información</a></div></article>`).join("");
    const select = document.getElementById("program");
    if (select) select.innerHTML = '<option value="">Selecciona un programa</option>' + state.programs.map(p => `<option value="${esc(p.codigo)}">${esc(p.codigo)} - ${esc(p.nombre)}</option>`).join("");
}

// ==================== DASHBOARD ====================
function showDashboard(user) {
    document.getElementById("publicSite").style.display = "none";
    document.querySelector(".floating-whatsapp").style.display = "none";
    const container = document.getElementById("dashboardContainer");
    container.classList.remove("hidden");
    container.innerHTML = buildDashboardHTML(user);
    initDashboardNav();
    refreshAllDashboardTables();
}

function buildDashboardHTML(user) {
    const r = user.rol;
    let nav = "", content = "";
    const studentOpts = state.students.map(s => `<option value="${s.id}">${esc(s.nombre)} (${s.id})</option>`).join("");
    const programOpts = state.programs.map(p => `<option value="${p.codigo}">${esc(p.nombre)}</option>`).join("");

    if (r === "ADMINISTRADOR") {
        nav = `<a href="#" class="dash-nav-link active" data-section="dash-overview"><svg><use href="#icon-home"></use></svg>Dashboard</a><a href="#" class="dash-nav-link" data-section="dash-users"><svg><use href="#icon-users"></use></svg>Gestión Usuarios</a><a href="#" class="dash-nav-link" data-section="dash-finance"><svg><use href="#icon-credit-card"></use></svg>Control Financiero</a><a href="#" class="dash-nav-link" data-section="dash-announce"><svg><use href="#icon-megaphone"></use></svg>Anuncios</a><a href="#" class="dash-nav-link" data-section="dash-schedule"><svg><use href="#icon-calendar"></use></svg>Horarios</a><a href="#" class="dash-nav-link" data-section="dash-certs"><svg><use href="#icon-certificate"></use></svg>Certificados</a><a href="#" class="dash-nav-link" data-section="dash-facilitador"><svg><use href="#icon-user"></use></svg>Panel Facilitador</a>`;
        content = buildAdminContent(studentOpts, programOpts);
    } else if (r === "FACILITADOR") {
        nav = `<a href="#" class="dash-nav-link active" data-section="dash-overview"><svg><use href="#icon-home"></use></svg>Dashboard</a><a href="#" class="dash-nav-link" data-section="dash-attendance"><svg><use href="#icon-calendar"></use></svg>Asistencia</a><a href="#" class="dash-nav-link" data-section="dash-tasks"><svg><use href="#icon-clipboard"></use></svg>Tareas</a><a href="#" class="dash-nav-link" data-section="dash-grades"><svg><use href="#icon-trending-up"></use></svg>Calificaciones</a><a href="#" class="dash-nav-link" data-section="dash-project"><svg><use href="#icon-award"></use></svg>Proyecto Final</a><a href="#" class="dash-nav-link" data-section="dash-announce"><svg><use href="#icon-megaphone"></use></svg>Anuncios</a><a href="#" class="dash-nav-link" data-section="dash-students"><svg><use href="#icon-users"></use></svg>Estudiantes</a><a href="#" class="dash-nav-link" data-section="dash-close"><svg><use href="#icon-check-circle"></use></svg>Cierre Curso</a><a href="#" class="dash-nav-link" data-section="dash-boletines"><svg><use href="#icon-file-text"></use></svg>Boletines</a>`;
        content = buildFacilitadorContent(studentOpts);
    } else {
        nav = `<a href="#" class="dash-nav-link active" data-section="dash-overview"><svg><use href="#icon-home"></use></svg>Dashboard</a><a href="#" class="dash-nav-link" data-section="dash-profile"><svg><use href="#icon-user"></use></svg>Mi Perfil</a><a href="#" class="dash-nav-link" data-section="dash-attendance"><svg><use href="#icon-calendar"></use></svg>Asistencia</a><a href="#" class="dash-nav-link" data-section="dash-tasks"><svg><use href="#icon-clipboard"></use></svg>Tareas</a><a href="#" class="dash-nav-link" data-section="dash-finance"><svg><use href="#icon-credit-card"></use></svg>Pagos</a><a href="#" class="dash-nav-link" data-section="dash-announce"><svg><use href="#icon-megaphone"></use></svg>Anuncios</a><a href="#" class="dash-nav-link" data-section="dash-schedule"><svg><use href="#icon-clock"></use></svg>Horario</a><a href="#" class="dash-nav-link" data-section="dash-certs"><svg><use href="#icon-certificate"></use></svg>Certificados</a><a href="#" class="dash-nav-link" data-section="dash-boletin"><svg><use href="#icon-file-text"></use></svg>Boletín Final</a>`;
        content = buildEstudianteContent();
    }

    return `<div class="dashboard-layout"><aside class="dash-sidebar"><div class="dash-sidebar-header"><svg><use href="#icon-graduation"></use></svg><span>Avanza<span style="color:#14B8A6">Digital</span></span></div><nav class="dash-nav">${nav}</nav><div class="dash-sidebar-footer"><p style="color:rgba(255,255,255,.6);font-size:.7rem;margin-bottom:6px;">${user.id}</p><button class="btn btn-outline btn-sm" style="width:100%;color:white;border-color:rgba(255,255,255,.3);" onclick="logout()"><svg><use href="#icon-log-out"></use></svg>Cerrar Sesión</button></div></aside><main class="dash-main"><header class="dash-header"><h2>${user.nombre} ${user.apellido}</h2><span class="role-badge role-${user.rol.toLowerCase()}">${user.rol}</span></header><div class="dash-content">${content}</div></main></div>`;
}

function buildAdminContent(studentOpts, programOpts) {
    return `<div class="dash-section active" id="dash-overview"><h2>Panel de Administrador</h2><div class="dash-stats"><div class="dash-stat-card"><svg><use href="#icon-users"></use></svg><div><strong id="statUsers">${state.users.length}</strong><span>Usuarios</span></div></div><div class="dash-stat-card"><svg><use href="#icon-book-open"></use></svg><div><strong>${state.programs.length}</strong><span>Programas</span></div></div><div class="dash-stat-card"><svg><use href="#icon-certificate"></use></svg><div><strong id="statCerts">${state.certificates.length}</strong><span>Certificados</span></div></div><div class="dash-stat-card"><svg><use href="#icon-dollar-sign"></use></svg><div><strong id="statPayments">${fmt(state.payments.reduce((s,p)=>s+Number(p.amount),0))}</strong><span>Pagos</span></div></div></div></div>

    <div class="dash-section" id="dash-users"><div class="dash-card"><h3><svg><use href="#icon-plus"></use></svg>Crear Usuario</h3><div class="dash-form"><div class="dash-form-row"><div class="form-field"><label>Nombre</label><input type="text" id="newNombre" placeholder="Nombre"></div><div class="form-field"><label>Apellido</label><input type="text" id="newApellido" placeholder="Apellido"></div></div><div class="dash-form-row"><div class="form-field"><label>Email</label><input type="email" id="newEmail" placeholder="correo@ejemplo.com"></div><div class="form-field"><label>Rol</label><select id="newRol"><option value="ESTUDIANTE">ESTUDIANTE</option><option value="FACILITADOR">FACILITADOR</option><option value="ADMINISTRADOR">ADMINISTRADOR</option></select></div></div><div class="form-field" id="programField"><label>Programa (Estudiantes)</label><select id="newProgram">${programOpts}</select></div><button class="btn btn-primary btn-sm" onclick="createUser()"><svg><use href="#icon-check-circle"></use></svg>Crear Usuario</button></div></div><div class="dash-card"><h3>Usuarios Registrados</h3><table><thead><tr><th>ID</th><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody id="usersTableBody"></tbody></table></div></div>

    <div class="dash-section" id="dash-finance"><div class="dash-card"><h3><svg><use href="#icon-credit-card"></use></svg>Registrar Pago</h3><div class="dash-form"><div class="form-field"><label>Estudiante</label><select id="payStudent">${studentOpts}</select></div><div class="dash-form-row"><div class="form-field"><label>Método</label><select id="payMethod"><option value="BANRESERVAS">Banreservas</option><option value="BHD_LEON">BHD León</option></select></div><div class="form-field"><label>Nº Comprobante</label><input type="text" id="payReceipt" placeholder="12345678"></div></div><div class="dash-form-row"><div class="form-field"><label>Monto (RD$)</label><input type="number" id="payAmount" value="1000"></div><div class="form-field"><label>Últimos 4 dígitos</label><input type="text" id="payDigits" maxlength="4" placeholder="1234"></div></div><div class="dash-form-row"><div class="form-field"><label>Fecha</label><input type="date" id="payDate" value="${today()}"></div><div class="form-field"><label>Pago Recibido</label><select id="payReceived"><option value="SI">SI</option><option value="NO">NO</option></select></div></div><button class="btn btn-primary btn-sm" onclick="registerPayment()">Registrar Pago</button></div></div><div class="dash-card"><h3>Historial de Pagos</h3><table><thead><tr><th>Fecha</th><th>Estudiante</th><th>Banco</th><th>Comprobante</th><th>Monto</th><th>Estado</th><th>PDF</th></tr></thead><tbody id="paymentsTableBody"></tbody></table></div></div>

    <div class="dash-section" id="dash-announce"><div class="dash-card"><h3><svg><use href="#icon-megaphone"></use></svg>Enviar Anuncio</h3><div class="dash-form"><div class="form-field"><label>Título</label><input type="text" id="announceTitle" placeholder="Título"></div><div class="form-field"><label>Contenido</label><textarea id="announceContent" rows="3" placeholder="Contenido..."></textarea></div><div class="form-field"><label>Enviar a</label><select id="announceTarget"><option value="global">Global (todos)</option><option value="AD-101">AD-101</option><option value="AD-201">AD-201</option><option value="AD-301">AD-301</option></select></div><button class="btn btn-primary btn-sm" onclick="sendAnnouncement()"><svg><use href="#icon-send"></use></svg>Enviar</button></div></div><div class="dash-card"><h3>Anuncios Enviados</h3><div id="announceList"></div></div></div>

    <div class="dash-section" id="dash-schedule"><div class="dash-card"><h3><svg><use href="#icon-calendar"></use></svg>Crear Horario</h3><div class="dash-form"><div class="dash-form-row"><div class="form-field"><label>Programa</label><select id="schedProgram">${programOpts}</select></div><div class="form-field"><label>Día</label><select id="schedDay"><option>Lunes</option><option>Martes</option><option>Miércoles</option><option>Jueves</option><option>Viernes</option></select></div></div><div class="dash-form-row"><div class="form-field"><label>Hora Inicio</label><input type="time" id="schedStart"></div><div class="form-field"><label>Hora Fin</label><input type="time" id="schedEnd"></div></div><div class="form-field"><label>Enlace Google Meet</label><input type="text" id="schedLink" placeholder="https://meet.google.com/..."></div><button class="btn btn-primary btn-sm" onclick="createSchedule()">Crear Horario</button></div></div><div class="dash-card"><h3>Horarios</h3><div id="schedList"></div></div></div>

    <div class="dash-section" id="dash-certs"><div class="dash-card"><h3><svg><use href="#icon-certificate"></use></svg>Generar Certificado</h3><div class="dash-form"><div class="form-field"><label>Estudiante</label><select id="certStudent">${studentOpts}</select></div><div class="form-field"><label>Programa</label><select id="certProgram">${programOpts}</select></div><p>Código: <strong id="certPreview">AD-CERT-${new Date().getFullYear()}-XXX</strong></p><button class="btn btn-primary btn-sm" onclick="generateCertificate()"><svg><use href="#icon-download"></use></svg>Generar y Descargar PDF</button></div></div><div class="dash-card"><h3>Certificados Emitidos</h3><div id="certList"></div></div></div>

    <div class="dash-section" id="dash-facilitador"><div class="dash-card"><h3>Panel de Facilitador (Acceso Admin)</h3></div>${buildFacilitadorContent(studentOpts)}</div>`;
}

function buildFacilitadorContent(studentOpts) {
    return `<div class="dash-section active" id="dash-overview"><h2>Panel de Facilitador</h2><div class="dash-stats"><div class="dash-stat-card"><svg><use href="#icon-users"></use></svg><div><strong>${state.students.length}</strong><span>Estudiantes</span></div></div><div class="dash-stat-card"><svg><use href="#icon-clipboard"></use></svg><div><strong>${state.tasks.length}</strong><span>Tareas</span></div></div><div class="dash-stat-card"><svg><use href="#icon-book-open"></use></svg><div><strong>${state.programs.length}</strong><span>Programas</span></div></div></div></div>
    <div class="dash-section" id="dash-attendance"><div class="dash-card"><h3><svg><use href="#icon-calendar"></use></svg>Registro de Asistencia</h3><div class="form-field mb-2"><label>Fecha</label><input type="date" id="attDate" value="${today()}"></div><table><thead><tr><th>Estudiante</th><th>ID</th><th>Estado</th></tr></thead><tbody id="attTableBody"></tbody></table><button class="btn btn-primary btn-sm mt-2" onclick="saveAttendance()">Guardar Asistencia</button></div></div>
    <div class="dash-section" id="dash-tasks"><div class="dash-card"><h3><svg><use href="#icon-clipboard"></use></svg>Publicar Tarea</h3><div class="dash-form"><div class="form-field"><label>Título</label><input type="text" id="taskTitle" placeholder="Título"></div><div class="form-field"><label>Descripción</label><textarea id="taskDesc" rows="2" placeholder="Descripción..."></textarea></div><div class="dash-form-row"><div class="form-field"><label>Valor (pts)</label><input type="number" id="taskValue" value="10"></div><div class="form-field"><label>Fecha límite</label><input type="date" id="taskDeadline"></div></div><button class="btn btn-primary btn-sm" onclick="publishTask()">Publicar Tarea</button></div></div><div class="dash-card"><h3>Tareas Publicadas</h3><div id="tasksList"></div></div></div>
    <div class="dash-section" id="dash-grades"><div class="dash-card"><h3><svg><use href="#icon-trending-up"></use></svg>Calificaciones (6 Módulos × 10 pts = 60 pts)</h3><p style="margin-bottom:12px;">5 pts Conducta + 2 pts Participación + 3 pts Tarea</p><div class="dash-form-row mb-2"><div class="form-field"><label>Estudiante</label><select id="gradeStudent" onchange="loadStudentGrades()">${studentOpts}</select></div><div class="form-field"><label>Módulo</label><select id="gradeModule" onchange="loadStudentGrades()">${[1,2,3,4,5,6].map(m=>`<option value="${m}">Módulo ${m}</option>`).join("")}</select></div></div><table><thead><tr><th>Estudiante</th><th>Conducta (5)</th><th>Participación (2)</th><th>Tarea (3)</th><th>Total (10)</th></tr></thead><tbody id="gradesTableBody"><tr><td colspan="5" class="text-center">Selecciona estudiante y módulo</td></tr></tbody></table><div id="gradesSummary" class="mt-2"></div><button class="btn btn-primary btn-sm mt-2" onclick="saveGrades()">Guardar Calificaciones</button></div></div>
    <div class="dash-section" id="dash-project"><div class="dash-card"><h3><svg><use href="#icon-award"></use></svg>Proyecto Final (0-40 pts)</h3><div class="dash-form"><div class="form-field"><label>Estudiante</label><select id="projStudent">${studentOpts}</select></div><div class="form-field"><label>Nota (0-40)</label><input type="number" id="projGrade" min="0" max="40" value="35"></div><div class="form-field"><label>Observaciones</label><textarea id="projObs" rows="2"></textarea></div><button class="btn btn-primary btn-sm" onclick="assignProjectGrade()">Asignar Nota</button></div></div></div>
    <div class="dash-section" id="dash-announce"><div class="dash-card"><h3><svg><use href="#icon-megaphone"></use></svg>Crear Anuncio</h3><div class="dash-form"><div class="form-field"><label>Título</label><input type="text" id="facAnnounceTitle"></div><div class="form-field"><label>Contenido</label><textarea id="facAnnounceContent" rows="3"></textarea></div><button class="btn btn-primary btn-sm" onclick="sendFacilitatorAnnouncement()">Publicar</button></div></div></div>
    <div class="dash-section" id="dash-students"><div class="dash-card"><h3><svg><use href="#icon-users"></use></svg>Listado de Estudiantes</h3><table><thead><tr><th>ID</th><th>Nombre</th><th>Programa</th><th>Asistencia</th><th>Promedio</th></tr></thead><tbody id="studentsListBody"></tbody></table></div></div>
    <div class="dash-section" id="dash-close"><div class="dash-card"><h3><svg><use href="#icon-check-circle"></use></svg>Cierre de Curso</h3><div class="form-field mb-2"><label>Estudiante</label><select id="closeStudent">${studentOpts}</select></div><p>Promedio: <strong id="finalAvg">--</strong></p><div style="display:flex;gap:10px;margin-top:12px;"><button class="btn btn-success btn-sm" onclick="approveStudent()">Aprobar</button><button class="btn btn-danger btn-sm" onclick="failStudent()">Reprobar</button></div></div></div>
    <div class="dash-section" id="dash-boletines"><div class="dash-card"><h3><svg><use href="#icon-file-text"></use></svg>Control de Boletines</h3><p>Estado: <strong id="boletinStatusGlobal">${state.boletinesHabilitados?'HABILITADOS':'DESHABILITADOS'}</strong></p><div style="display:flex;gap:10px;margin-top:12px;"><button class="btn btn-success btn-sm" onclick="enableBoletines()">Habilitar para todos</button><button class="btn btn-outline btn-sm" onclick="disableBoletines()">Deshabilitar</button><button class="btn btn-outline btn-sm" onclick="generateBoletinPDF()">Vista previa PDF</button></div></div></div>`;
}

function buildEstudianteContent() {
    const sid = state.profile?.id;
    const student = state.students.find(s => s.id === sid);
    const grades = state.grades[sid] || {};
    let modTotal = 0; for (let m = 1; m <= 6; m++) modTotal += (grades[m]?.total || 0);
    const proj = grades.project?.grade || 0;
    const final = modTotal + proj;
    const aprobado = final >= 70;
    const hab = state.boletinesHabilitados;
    const att = state.attendance[sid] || { present: 0, total: 0 };
    const attPct = att.total > 0 ? Math.round((att.present / att.total) * 100) : 0;

    return `<div class="dash-section active" id="dash-overview"><h2>Mi Panel</h2><div class="dash-stats"><div class="dash-stat-card"><svg><use href="#icon-book-open"></use></svg><div><strong>${esc(student?.programa||"AD-101")}</strong><span>Programa</span></div></div><div class="dash-stat-card"><svg><use href="#icon-calendar"></use></svg><div><strong>${esc(student?.cohorte||"Jul 2026")}</strong><span>Cohorte</span></div></div><div class="dash-stat-card"><svg><use href="#icon-trending-up"></use></svg><div><strong>${attPct}%</strong><span>Asistencia</span></div></div><div class="dash-stat-card"><svg><use href="#icon-check-circle"></use></svg><div><strong>${final}/100</strong><span>Promedio</span></div></div></div></div>
    <div class="dash-section" id="dash-profile"><div class="dash-card"><h3>Mi Perfil</h3><p><strong>Nombre:</strong> ${esc(state.profile?.nombre)} ${esc(state.profile?.apellido)}</p><p><strong>Email:</strong> ${esc(state.profile?.email)}</p><p><strong>Programa:</strong> ${esc(student?.programa||"No asignado")}</p></div></div>
    <div class="dash-section" id="dash-attendance"><div class="dash-card"><h3>Asistencia</h3><p>Asistidas: ${att.present}/${att.total} - ${attPct}%</p><button class="btn btn-whatsapp btn-sm mt-2" onclick="reportAttendanceError()">Reportar error</button></div></div>
    <div class="dash-section" id="dash-tasks"><div class="dash-card"><h3>Mis Tareas</h3>${state.tasks.length?state.tasks.map(t=>`<div style="padding:8px;border-bottom:1px solid var(--color-border);"><strong>${esc(t.title)}</strong> - ${t.value} pts - ${esc(t.deadline)}</div>`).join(""):"<p>No hay tareas.</p>"}</div></div>
    <div class="dash-section" id="dash-finance"><div class="dash-card"><h3>Pagos</h3>${state.payments.filter(p=>p.student===sid).map(p=>`<div>${esc(p.date)} - ${fmt(p.amount)} - Recibido</div>`).join("")||"<p>Sin pagos.</p>"}</div></div>
    <div class="dash-section" id="dash-announce"><div class="dash-card"><h3>Anuncios</h3>${state.announcements.length?state.announcements.map(a=>`<div style="border-left:3px solid var(--color-secondary);padding:4px 12px;margin:4px 0;"><strong>${esc(a.title)}</strong><p>${esc(a.content)}</p></div>`).join(""):"<p>No hay anuncios.</p>"}</div></div>
    <div class="dash-section" id="dash-schedule"><div class="dash-card"><h3>Horario</h3>${state.schedules.length?state.schedules.map(s=>`<div>${esc(s.day)} ${esc(s.start)}-${esc(s.end)}</div>`).join(""):"<p>Sin horario.</p>"}</div></div>
    <div class="dash-section" id="dash-certs"><div class="dash-card"><h3>Certificados</h3>${state.certificates.filter(c=>c.student===sid).map(c=>`<div>${esc(c.code)} <button class="btn btn-primary btn-sm" onclick="downloadCertificate('${c.code}')">PDF</button></div>`).join("")||"<p>No hay certificados.</p>"}</div></div>
    <div class="dash-section" id="dash-boletin"><div class="dash-card"><h3>Boletín Final</h3><p><strong>Nota Final:</strong> <span style="font-size:1.5rem;color:${aprobado?'#059669':'#DC2626'}">${final}/100</span></p><p><strong>Estado:</strong> ${aprobado?'APROBADO':'PENDIENTE'}</p>${hab?`<button class="btn btn-primary btn-sm mt-2" onclick="downloadStudentBoletin()">Descargar PDF</button><p style="color:#059669;font-size:.75rem;">✅ Habilitado</p>`:`<button class="btn btn-primary btn-sm mt-2" disabled>Descargar PDF</button><p style="color:#DC2626;font-size:.75rem;">🔒 No habilitado</p>`}</div></div>`;
}

// ==================== FUNCIONES ====================
window.createUser = function() {
    const nombre = document.getElementById("newNombre")?.value.trim();
    const apellido = document.getElementById("newApellido")?.value.trim();
    const email = document.getElementById("newEmail")?.value.trim();
    const rol = document.getElementById("newRol")?.value;
    const program = document.getElementById("newProgram")?.value;
    if (!nombre || !apellido || !email) return showToast("error","Campos requeridos","Completa todos los campos.");
    if (state.users.find(u => u.email === email)) return showToast("error","Email duplicado","Ya existe un usuario con ese email.");
    const prefix = rol === "ADMINISTRADOR" ? "ADM" : rol === "FACILITADOR" ? "FAC" : "AD";
    const id = genId(prefix);
    const pass = Math.random().toString(36).slice(-8);
    state.users.push({ id, email, pass, nombre, apellido, rol, activo: true });
    if (rol === "ESTUDIANTE") state.students.push({ id, nombre: `${nombre} ${apellido}`, programa: program || "AD-101", cohorte: "Julio " + new Date().getFullYear(), aprobado: null });
    saveAll();
    // También guardar en Supabase si está conectado
    if (state.supabaseConnected) {
        supabaseReq("/rest/v1/usuarios", { method: "POST", body: JSON.stringify({ identificador: id, email, password_hash: pass, nombre, apellido, rol, activo: true }), headers: { Prefer: "return=minimal" } });
    }
    refreshAllDashboardTables();
    showToast("success","Usuario creado",`${nombre} ${apellido} - Contraseña: ${pass}`);
    document.getElementById("newNombre").value = ""; document.getElementById("newApellido").value = ""; document.getElementById("newEmail").value = "";
};

window.registerPayment = function() {
    const student = document.getElementById("payStudent")?.value;
    const method = document.getElementById("payMethod")?.value;
    const receipt = document.getElementById("payReceipt")?.value.trim();
    const amount = document.getElementById("payAmount")?.value;
    const date = document.getElementById("payDate")?.value || today();
    const digits = document.getElementById("payDigits")?.value.trim();
    const received = document.getElementById("payReceived")?.value === "SI";
    if (!student || !receipt || !amount) return showToast("error","Campos requeridos","Completa todos los campos.");
    const stu = state.students.find(s => s.id === student);
    state.payments.push({ id: genId("PAY"), student, studentName: stu?.nombre || student, method, receipt, amount: Number(amount), date, digits, received });
    saveAll();
    refreshAllDashboardTables();
    showToast("success","Pago registrado",fmt(amount));
    document.getElementById("payReceipt").value = ""; document.getElementById("payDigits").value = "";
};

window.sendAnnouncement = function() {
    const title = document.getElementById("announceTitle")?.value.trim();
    const content = document.getElementById("announceContent")?.value.trim();
    if (!title || !content) return showToast("error","Completa título y contenido.");
    state.announcements.push({ title, content, date: new Date().toLocaleDateString("es-DO") });
    saveAll(); refreshAllDashboardTables();
    showToast("success","Anuncio enviado",title);
    document.getElementById("announceTitle").value = ""; document.getElementById("announceContent").value = "";
};

window.createSchedule = function() {
    const p = document.getElementById("schedProgram")?.value;
    const d = document.getElementById("schedDay")?.value;
    const s = document.getElementById("schedStart")?.value;
    const e = document.getElementById("schedEnd")?.value;
    const l = document.getElementById("schedLink")?.value.trim();
    if (!s || !e) return showToast("error","Ingresa hora inicio y fin.");
    state.schedules.push({ id: genId("SCH"), program: p, day: d, start: s, end: e, link: l });
    saveAll(); refreshAllDashboardTables();
    showToast("success","Horario creado",`${d} ${s}-${e}`);
};

window.generateCertificate = function() {
    const sid = document.getElementById("certStudent")?.value;
    const prog = document.getElementById("certProgram")?.value;
    if (!sid) return showToast("error","Selecciona un estudiante.");
    const stu = state.students.find(s => s.id === sid);
    const code = genId("AD-CERT");
    state.certificates.push({ code, student: sid, studentName: stu?.nombre || sid, program: prog, date: today() });
    saveAll(); refreshAllDashboardTables();
    generatePDF("Certificado",`<h2 style="text-align:center;">Certificado</h2><h1 style="text-align:center;color:#14B8A6;">${esc(stu?.nombre||sid)}</h1><h2 style="text-align:center;">${esc(prog)}</h2><p style="text-align:center;"><strong>Código:</strong> ${code}</p><div style="text-align:center;"><div class="stamp">VÁLIDO</div></div>`);
    showToast("success","Certificado generado",code);
};

window.saveAttendance = function() {
    document.querySelectorAll(".att-select").forEach(sel => {
        const sid = sel.getAttribute("data-student");
        if (!state.attendance[sid]) state.attendance[sid] = { present: 0, total: 0 };
        state.attendance[sid].total++;
        if (sel.value === "PRESENTE") state.attendance[sid].present++;
    });
    saveAll(); refreshAllDashboardTables();
    showToast("success","Asistencia guardada");
};

window.publishTask = function() {
    const t = document.getElementById("taskTitle")?.value.trim();
    const d = document.getElementById("taskDesc")?.value.trim();
    const v = document.getElementById("taskValue")?.value;
    const dl = document.getElementById("taskDeadline")?.value;
    if (!t || !dl) return showToast("error","Ingresa título y fecha límite.");
    state.tasks.push({ id: genId("TSK"), title: t, desc: d, value: v, deadline: dl });
    saveAll(); refreshAllDashboardTables();
    showToast("success","Tarea publicada",t);
    document.getElementById("taskTitle").value = ""; document.getElementById("taskDesc").value = "";
};

window.loadStudentGrades = function() {
    const sid = document.getElementById("gradeStudent")?.value;
    const mod = parseInt(document.getElementById("gradeModule")?.value);
    if (!sid || !mod) return;
    if (!state.grades[sid]) state.grades[sid] = {};
    if (!state.grades[sid][mod]) state.grades[sid][mod] = { conducta: 5, participacion: 2, tarea: 3, total: 10 };
    const g = state.grades[sid][mod];
    const stu = state.students.find(s => s.id === sid);
    const tbody = document.getElementById("gradesTableBody");
    tbody.innerHTML = `<tr><td><strong>${esc(stu?.nombre||sid)}</strong></td><td><input type="number" id="gCond" value="${g.conducta}" max="5" min="0" style="width:60px;" oninput="calcGradeTotal()"></td><td><input type="number" id="gPart" value="${g.participacion}" max="2" min="0" style="width:60px;" oninput="calcGradeTotal()"></td><td><input type="number" id="gTarea" value="${g.tarea}" max="3" min="0" style="width:60px;" oninput="calcGradeTotal()"></td><td><strong id="gTotal">${g.total}</strong></td></tr>`;
    updateGradesSummary(sid);
};

window.calcGradeTotal = function() {
    const c = parseFloat(document.getElementById("gCond")?.value) || 0;
    const p = parseFloat(document.getElementById("gPart")?.value) || 0;
    const t = parseFloat(document.getElementById("gTarea")?.value) || 0;
    document.getElementById("gTotal").textContent = Math.min(c + p + t, 10);
};

function updateGradesSummary(sid) {
    let total = 0;
    const grades = state.grades[sid] || {};
    for (let m = 1; m <= 6; m++) total += (grades[m]?.total || 0);
    const el = document.getElementById("gradesSummary"); if (el) el.innerHTML = `<strong>Total módulos: ${total}/60 pts</strong>`;
}

window.saveGrades = function() {
    const sid = document.getElementById("gradeStudent")?.value;
    const mod = parseInt(document.getElementById("gradeModule")?.value);
    if (!sid || !mod) return;
    const c = parseFloat(document.getElementById("gCond")?.value) || 0;
    const p = parseFloat(document.getElementById("gPart")?.value) || 0;
    const t = parseFloat(document.getElementById("gTarea")?.value) || 0;
    if (!state.grades[sid]) state.grades[sid] = {};
    state.grades[sid][mod] = { conducta: c, participacion: p, tarea: t, total: Math.min(c + p + t, 10) };
    saveAll();
    showToast("success","Calificaciones guardadas",`Módulo ${mod}`);
};

window.assignProjectGrade = function() {
    const sid = document.getElementById("projStudent")?.value;
    const grade = parseInt(document.getElementById("projGrade")?.value);
    const obs = document.getElementById("projObs")?.value.trim();
    if (!sid || isNaN(grade)) return showToast("error","Ingresa una nota válida.");
    if (!state.grades[sid]) state.grades[sid] = {};
    state.grades[sid].project = { grade, obs };
    saveAll();
    showToast("success","Proyecto calificado",`${grade}/40`);
};

window.sendFacilitatorAnnouncement = function() {
    const t = document.getElementById("facAnnounceTitle")?.value.trim();
    const c = document.getElementById("facAnnounceContent")?.value.trim();
    if (!t || !c) return showToast("error","Completa título y contenido.");
    state.announcements.push({ title: t, content: c, date: new Date().toLocaleDateString("es-DO") });
    saveAll(); refreshAllDashboardTables();
    showToast("success","Anuncio publicado",t);
    document.getElementById("facAnnounceTitle").value = ""; document.getElementById("facAnnounceContent").value = "";
};

window.approveStudent = function() {
    const sid = document.getElementById("closeStudent")?.value;
    if (!sid) return;
    const stu = state.students.find(s => s.id === sid);
    if (stu) { stu.aprobado = true; saveAll(); }
    refreshAllDashboardTables();
    showToast("success","Estudiante aprobado");
};

window.failStudent = function() {
    const sid = document.getElementById("closeStudent")?.value;
    if (!sid) return;
    const stu = state.students.find(s => s.id === sid);
    if (stu) { stu.aprobado = false; saveAll(); }
    refreshAllDashboardTables();
    showToast("error","Estudiante reprobado");
};

window.enableBoletines = function() { state.boletinesHabilitados = true; saveAll(); updateBoletinUI(); showToast("success","Boletines habilitados"); };
window.disableBoletines = function() { state.boletinesHabilitados = false; saveAll(); updateBoletinUI(); showToast("info","Boletines deshabilitados"); };
window.generateBoletinPDF = function() { generateBoletinForStudent(document.getElementById("closeStudent")?.value || state.students[0]?.id); };
window.downloadStudentBoletin = function() { if (!state.boletinesHabilitados) return showToast("error","No habilitado"); generateBoletinForStudent(state.profile?.id); };

function generateBoletinForStudent(sid) {
    const stu = state.students.find(s => s.id === sid);
    const grades = state.grades[sid] || {};
    let rows = "", modTotal = 0;
    for (let m = 1; m <= 6; m++) { const g = grades[m] || { conducta: 0, participacion: 0, tarea: 0, total: 0 }; modTotal += g.total; rows += `<tr><td>Módulo ${m}</td><td>${g.conducta}/5</td><td>${g.participacion}/2</td><td>${g.tarea}/3</td><td>${g.total}/10</td></tr>`; }
    const proj = grades.project?.grade || 0;
    const final = modTotal + proj;
    const estado = final >= 70 ? "APROBADO" : "REPROBADO";
    generatePDF("Boletín Final",`<h2 style="text-align:center;">Boletín Final</h2><p><strong>Estudiante:</strong> ${esc(stu?.nombre||sid)}</p><p><strong>Programa:</strong> ${esc(stu?.programa||"")}</p><table><thead><tr><th>Módulo</th><th>Conducta</th><th>Participación</th><th>Tarea</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p><strong>Proyecto Final:</strong> ${proj}/40</p><h2 style="text-align:center;">Nota Final: ${final}/100 - ${estado}</h2><div style="text-align:center;"><div class="stamp">${estado}</div></div>`);
}

window.downloadCertificate = function(code) { const cert = state.certificates.find(c => c.code === code); if (!cert) return; generatePDF("Certificado",`<h2 style="text-align:center;">Certificado</h2><h1 style="text-align:center;color:#14B8A6;">${esc(cert.studentName)}</h1><h2 style="text-align:center;">${esc(cert.program)}</h2><p style="text-align:center;"><strong>Código:</strong> ${code}</p><div style="text-align:center;"><div class="stamp">VÁLIDO</div></div>`); };
window.reportAttendanceError = function() { window.open(`https://wa.me/18296742341?text=${encodeURIComponent("Hola, deseo reportar un error en mi asistencia. Solicito revisión. Gracias.")}`,"_blank"); };

// ==================== REFRESH ====================
function refreshAllDashboardTables() {
    const usersBody = document.getElementById("usersTableBody");
    if (usersBody) usersBody.innerHTML = state.users.map(u => `<tr><td>${esc(u.id)}</td><td>${esc(u.nombre)} ${esc(u.apellido)}</td><td>${esc(u.email)}</td><td>${esc(u.rol)}</td><td><span class="badge-status ${u.activo?'badge-active':'badge-inactive'}">${u.activo?'Activo':'Inactivo'}</span></td><td><button class="btn btn-outline btn-sm" onclick="toggleUser('${u.id}')">${u.activo?'Desactivar':'Activar'}</button></td></tr>`).join("");
    
    const payBody = document.getElementById("paymentsTableBody");
    if (payBody) payBody.innerHTML = state.payments.length ? state.payments.map((p,i) => `<tr><td>${esc(p.date)}</td><td>${esc(p.studentName)}</td><td>${p.method==='BANRESERVAS'?'Banreservas':'BHD León'}</td><td>${esc(p.receipt)}</td><td>${fmt(p.amount)}</td><td><span class="badge-status ${p.received?'badge-active':'badge-pending'}">${p.received?'Recibido':'Pendiente'}</span></td><td><button class="btn btn-primary btn-sm" onclick="downloadPaymentPDF(${i})">PDF</button></td></tr>`).join("") : '<tr><td colspan="7" class="text-center">Sin pagos.</td></tr>';
    
    const attBody = document.getElementById("attTableBody");
    if (attBody) attBody.innerHTML = state.students.map(s => `<tr><td>${esc(s.nombre)}</td><td>${esc(s.id)}</td><td><select class="att-select" data-student="${s.id}"><option value="PRESENTE">Presente</option><option value="AUSENTE">Ausente</option><option value="JUSTIFICADA">Justificada</option></select></td></tr>`).join("");
    
    const tasksDiv = document.getElementById("tasksList");
    if (tasksDiv) tasksDiv.innerHTML = state.tasks.length ? state.tasks.map(t => `<div style="padding:8px;border-bottom:1px solid var(--color-border);"><strong>${esc(t.title)}</strong> - ${t.value} pts - ${esc(t.deadline)}</div>`).join("") : "<p>Sin tareas.</p>";
    
    const studentsBody = document.getElementById("studentsListBody");
    if (studentsBody) studentsBody.innerHTML = state.students.map(s => { const g = state.grades[s.id] || {}; let t = 0; for (let m = 1; m <= 6; m++) t += (g[m]?.total || 0); t += g.project?.grade || 0; const a = state.attendance[s.id] || { present: 0, total: 0 }; const pct = a.total > 0 ? Math.round((a.present / a.total) * 100) : 0; return `<tr><td>${esc(s.id)}</td><td>${esc(s.nombre)}</td><td>${esc(s.programa)}</td><td>${pct}%</td><td>${t}/100</td></tr>`; }).join("");
    
    updateBoletinUI();
}

function updateBoletinUI() { const el = document.getElementById("boletinStatusGlobal"); if (el) el.textContent = state.boletinesHabilitados ? "HABILITADOS" : "DESHABILITADOS"; }

window.toggleUser = function(id) { const u = state.users.find(u => u.id === id); if (u) { u.activo = !u.activo; saveAll(); refreshAllDashboardTables(); } };
window.downloadPaymentPDF = function(i) { const p = state.payments[i]; if (!p) return; generatePDF("Comprobante",`<h2>Comprobante de Pago</h2><p><strong>Estudiante:</strong> ${esc(p.studentName)}</p><p><strong>Banco:</strong> ${p.method==='BANRESERVAS'?'Banreservas':'BHD León'}</p><p><strong>Comprobante:</strong> ${esc(p.receipt)}</p><p><strong>Monto:</strong> ${fmt(p.amount)}</p><div style="text-align:center;"><div class="stamp">${p.received?'PAGO RECIBIDO':'PENDIENTE'}</div></div>`); };

function initDashboardNav() {
    document.querySelectorAll(".dash-nav-link").forEach(link => {
        link.addEventListener("click", e => {
            e.preventDefault();
            const sidebar = link.closest(".dash-sidebar");
            sidebar.querySelectorAll(".dash-nav-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            const id = link.getAttribute("data-section");
            const main = document.querySelector(".dash-content");
            main.querySelectorAll(".dash-section").forEach(s => s.classList.remove("active"));
            const target = document.getElementById(id);
            if (target) { target.classList.add("active"); refreshAllDashboardTables(); }
        });
    });
}

window.logout = function() {
    state.profile = null;
    document.getElementById("publicSite").style.display = "";
    document.querySelector(".floating-whatsapp").style.display = "";
    document.getElementById("dashboardContainer").classList.add("hidden");
    document.getElementById("dashboardContainer").innerHTML = "";
    document.getElementById("inicio")?.scrollIntoView({ behavior: "smooth" });
    showToast("info","Sesión cerrada","Has salido del sistema.");
};
