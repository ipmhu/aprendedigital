-- AVANZA DIGITAL - RESET COMPLETO + ESQUEMA SUPABASE
-- SE IGNORA EL SISTEMA DE AUTH DE SUPABASE PARA USAR LOGIN MANUAL.

-- 1) LIMPIEZA TOTAL (Borra todo lo existente para evitar conflictos)
-- Usamos CASCADE para que borre funciones y triggers asociados automáticamente
drop table if exists 
  boletines,
  proyectos_finales,
  entregas,
  tareas,
  asistencia,
  horarios,
  pagos,
  certificados,
  anuncios,
  auditoria,
  inscripciones,
  cohortes,
  programas,
  configuracion,
  usuarios
cascade;

-- Limpieza de tipos (Enums)
do $$ begin
  drop type if exists user_role cascade;
  drop type if exists payment_status cascade;
  drop type if exists attendance_status cascade;
  drop type if exists task_status cascade;
  drop type if exists student_status cascade;
  drop type if exists payment_method cascade;
exception when others then null; end $$;

-- 2) EXTENSIONES
create extension if not exists "uuid-ossp";

-- 3) ENUMS
create type user_role as enum ('ADMINISTRADOR', 'FACILITADOR', 'ESTUDIANTE');
create type payment_status as enum ('PENDIENTE', 'COMPLETADO', 'RECHAZADO');
create type attendance_status as enum ('PRESENTE', 'AUSENTE', 'JUSTIFICADA');
create type task_status as enum ('PENDIENTE', 'ENTREGADA', 'CALIFICADA', 'NO_ENTREGADA');
create type student_status as enum ('ACTIVO', 'INACTIVO', 'GRADUADO', 'RETIRADO');
create type payment_method as enum ('BANRESERVAS', 'BHD_LEON');

-- 4) TABLAS
create table usuarios (
  id uuid primary key default uuid_generate_v4(),
  identificador varchar(20) unique,
  email varchar(255) unique not null,
  password_hash text not null, -- Texto plano para simplicidad máxima
  nombre varchar(100) not null,
  apellido varchar(100) not null,
  telefono varchar(20),
  ciudad varchar(100),
  rol user_role not null default 'ESTUDIANTE',
  activo boolean not null default true,
  cambio_password_obligatorio boolean not null default true,
  ultimo_acceso timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Deshabilitamos RLS en usuarios para que el login manual sea directo
alter table usuarios disable row level security;

create table programas (
  id uuid primary key default uuid_generate_v4(),
  codigo varchar(20) unique not null,
  nombre varchar(200) not null,
  descripcion text,
  duracion_semanas integer not null check (duracion_semanas > 0),
  precio decimal(10,2) not null default 1000.00 check (precio >= 0),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table cohortes (
  id uuid primary key default uuid_generate_v4(),
  programa_id uuid references programas(id) on delete cascade,
  nombre varchar(100) not null,
  fecha_inicio date not null,
  fecha_fin date,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  check (fecha_fin is null or fecha_fin >= fecha_inicio)
);

create table tareas (
  id uuid primary key default uuid_generate_v4(),
  cohorte_id uuid references cohortes(id) on delete cascade,
  titulo varchar(200) not null,
  descripcion text,
  valor integer not null default 10 check (valor >= 0),
  fecha_limite timestamptz not null,
  created_by uuid references usuarios(id),
  created_at timestamptz not null default now()
);

create table asistencia (
  id uuid primary key default uuid_generate_v4(),
  estudiante_id uuid references usuarios(id) on delete cascade,
  cohorte_id uuid references cohortes(id) on delete cascade,
  fecha date not null,
  estado attendance_status not null default 'AUSENTE',
  registrado_por uuid references usuarios(id),
  created_at timestamptz not null default now(),
  unique (estudiante_id, fecha)
);

create table entregas (
  id uuid primary key default uuid_generate_v4(),
  tarea_id uuid references tareas(id) on delete cascade,
  estudiante_id uuid references usuarios(id) on delete cascade,
  estado task_status not null default 'PENDIENTE',
  calificacion decimal(5,2) check (calificacion between 0 and 100),
  observaciones text,
  calificado_por uuid references usuarios(id),
  fecha_entrega timestamptz,
  fecha_calificacion timestamptz,
  updated_at timestamptz not null default now(),
  unique (tarea_id, estudiante_id)
);

create table certificados (
  id uuid primary key default uuid_generate_v4(),
  estudiante_id uuid references usuarios(id) on delete cascade,
  cohorte_id uuid references cohortes(id) on delete cascade,
  codigo varchar(50) unique not null,
  fecha_emision date not null default current_date,
  emitido_por uuid references usuarios(id),
  created_at timestamptz not null default now(),
  unique (estudiante_id, cohorte_id)
);

create table auditoria (
  id uuid primary key default uuid_generate_v4(),
  usuario_id uuid references usuarios(id),
  identificador varchar(20),
  accion text not null,
  detalles jsonb,
  ip_address varchar(45),
  created_at timestamptz not null default now()
);

create table configuracion (
  id uuid primary key default uuid_generate_v4(),
  clave varchar(100) unique not null,
  valor text,
  updated_at timestamptz not null default now()
);

-- 5) INDICES
create index idx_usuarios_rol on usuarios(rol);
create index idx_usuarios_email on usuarios(email);
create index idx_usuarios_identificador on usuarios(identificador);
create index idx_auditoria_usuario on auditoria(usuario_id);
create index idx_auditoria_fecha on auditoria(created_at);

-- 6) FUNCIONES Y TRIGGERS
create or replace function generar_identificador(p_rol user_role)
returns varchar(20)
language plpgsql
as $$
declare
  prefijo varchar(5);
  anio varchar(4);
  secuencia integer;
begin
  case p_rol
    when 'ADMINISTRADOR' then prefijo := 'ADM';
    when 'FACILITADOR' then prefijo := 'FAC';
    when 'ESTUDIANTE' then prefijo := 'AD';
  end case;

  anio := to_char(current_date, 'YYYY');

  select coalesce(max(cast(substring(identificador from '[0-9]+$') as integer)), 0) + 1
  into secuencia
  from usuarios
  where identificador like prefijo || '-' || anio || '-%';

  return prefijo || '-' || anio || '-' || lpad(secuencia::text, 3, '0');
end;
$$;

create or replace function set_usuario_identificador()
returns trigger
language plpgsql
as $$
begin
  if new.identificador is null or length(trim(new.identificador)) = 0 then
    new.identificador := generar_identificador(new.rol);
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_set_usuario_identificador
before insert or update on usuarios
for each row execute function set_usuario_identificador();

create or replace function registrar_auditoria()
returns trigger
language plpgsql
as $$
begin
  insert into auditoria (usuario_id, identificador, accion, detalles)
  values (
    coalesce(new.registrado_por, new.created_by, new.calificado_por),
    (
      select identificador
      from usuarios
      where id = coalesce(new.registrado_por, new.created_by, new.calificado_por)
    ),
    tg_table_name || ' - ' || tg_op,
    to_jsonb(new)
  );
  return new;
end;
$$;

create or replace function verificar_certificado_publico(codigo_input text)
returns table (
  codigo text,
  fecha_emision date,
  estudiante_nombre text,
  estudiante_apellido text,
  cohorte_nombre text,
  programa_codigo text,
  programa_nombre text
)
language sql
security definer
set search_path = public
as $$
  select
    c.codigo::text,
    c.fecha_emision,
    u.nombre::text,
    u.apellido::text,
    co.nombre::text,
    p.codigo::text,
    p.nombre::text
  from certificados c
  join usuarios u on u.id = c.estudiante_id
  join cohortes co on co.id = c.cohorte_id
  join programas p on p.id = co.programa_id
  where upper(c.codigo) = upper(trim(codigo_input))
  limit 1;
$$;

create or replace function registrar_contacto_web(
  nombre_input text,
  email_input text,
  programa_codigo_input text,
  mensaje_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into auditoria (accion, detalles)
  values (
    'CONTACTO_WEB',
    jsonb_build_object(
      'nombre', trim(nombre_input),
      'email', lower(trim(email_input)),
      'programa_codigo', trim(programa_codigo_input),
      'mensaje', trim(mensaje_input),
      'origen', 'landing_avanza_digital'
    )
  );
end;
$$;

-- 6.2) FUNCIÓN DE LOGIN SIMPLIFICADA (Texto Plano)
create or replace function public.login_usuario_simple(p_email text, p_password text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  _user record;
begin
  select *
  into _user
  from public.usuarios
  where email = p_email
    and password_hash = p_password
    and activo = true
  limit 1;

  return to_jsonb(_user);
end;
$$;

-- 7) RLS Y PERMISOS PARA LA LANDING/API
-- Habilitamos RLS solo en lo necesario para la landing
alter table programas enable row level security;
alter table configuracion enable row level security;
alter table auditoria enable row level security;

create policy programas_public_select
on programas for select
to anon, authenticated
using (activo = true);

create policy configuracion_public_select
on configuracion for select
to anon, authenticated
using (clave in ('nombre_institucional', 'eslogan', 'telefono', 'email', 'modalidad', 'plataforma_clases'));

create policy usuarios_select_own
on usuarios for select
to authenticated
using (auth.uid() = id);

create policy usuarios_update_own
on usuarios for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy auditoria_contacto_insert
on auditoria for insert
to anon, authenticated
with check (accion = 'CONTACTO_WEB');

grant usage on schema public to anon, authenticated;
grant select on table programas to anon, authenticated;
grant select on table configuracion to anon, authenticated;
grant select, update on table usuarios to anon, authenticated;
grant insert, select on table auditoria to anon, authenticated;
grant execute on function verificar_certificado_publico, registrar_contacto_web, login_usuario_simple to anon, authenticated;

-- 8) DATOS INICIALES
insert into programas (codigo, nombre, descripcion, duracion_semanas, precio, activo) values
  ('AD-101', 'Inteligencia Artificial Aplicada', 'Aprende a implementar soluciones de IA en entornos reales. Desde fundamentos hasta aplicaciones prácticas con herramientas modernas.', 12, 1000.00, true),
  ('AD-201', 'Digitación y Ofimática Profesional', 'Domina las herramientas ofimáticas esenciales y técnicas avanzadas de digitación para el entorno empresarial moderno.', 8, 1000.00, true),
  ('AD-301', 'Computación y Soporte Técnico', 'Fórmate como técnico en soporte de sistemas informáticos. Aprende diagnóstico, mantenimiento y resolución de problemas técnicos.', 10, 1000.00, true);

insert into configuracion (clave, valor) values
  ('nombre_institucional', 'Avanza Digital'),
  ('eslogan', 'Aprende. Aplica. Avanza.'),
  ('telefono', '+18293242341'),
  ('email', 'aprendedigital@outlook.com'),
  ('modalidad', '100% Virtual'),
  ('plataforma_clases', 'Google Meet');

-- 9) USUARIO ADMINISTRADOR (Texto Plano)
insert into usuarios (email, password_hash, nombre, apellido, rol, activo, cambio_password_obligatorio)
values ('admin@avanza.do', 'Admin123456', 'Admin', 'Avanza', 'ADMINISTRADOR', true, false);
