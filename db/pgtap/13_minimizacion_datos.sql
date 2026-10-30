-- HU-31: "capturar solo los datos indispensables … no almacenar
-- información sensible innecesaria (como diagnósticos médicos)".
--
-- La minimización es una propiedad del ESQUEMA, no de una pantalla: si
-- la columna no existe, ninguna versión futura de la interfaz puede
-- pedir el dato ni guardarlo "por si acaso". Esta prueba convierte el
-- criterio en una barrera estructural y falla el día en que alguien
-- agregue una columna de datos sensibles a las tablas de personas.
begin;
select plan(9);

-- 1-2) Trabajador: nombre y, si la empresa lo entrega, RUT. Nada más.
select set_eq(
  $$ select column_name::text from information_schema.columns
      where table_schema = 'public' and table_name = 'trabajador' $$,
  array['id', 'contrato_empresa_id', 'nombre', 'rut', 'cama_id',
        'anonimizado_at', 'created_at'],
  'trabajador debe tener EXACTAMENTE las columnas mínimas (HU-31): nada de salud, nacionalidad, foto ni contacto de emergencia'
);

select col_is_null(
  'public', 'trabajador', 'rut',
  'trabajador.rut debe ser opcional: "si la empresa lo entrega" (HU-31)'
);

-- 3) Turista: nombre obligatorio, y el sistema NO tiene dónde guardar un
-- RUT de huésped. "Turistas extranjeros: no se pide RUT" (CLAUDE.md) y
-- HU-01 lo pide solo para nacionales — hoy no se persiste en reserva.
select hasnt_column(
  'public', 'reserva', 'rut',
  'reserva no debe tener columna de RUT del huésped: el extranjero no lo entrega (HU-01/HU-31)'
);

-- 4-5) Descuadre: "solo se guarda el motivo genérico y no se permite
-- ingresar datos de salud". El motivo es un enum cerrado, no texto
-- libre: por construcción no cabe un diagnóstico.
select col_type_is(
  'public', 'justificacion_descuadre', 'motivo', 'motivo_descuadre',
  'justificacion_descuadre.motivo debe ser un enum cerrado, no texto libre donde escribir un diagnóstico (HU-31)'
);

select set_eq(
  $$ select unnest(enum_range(null::motivo_descuadre))::text $$,
  array['turno_extra', 'almuerzo_mina', 'corte_ruta',
        'ausencia_justificada', 'otro'],
  'los motivos de descuadre deben ser los 5 tipificados acordados en la reunión 2, sin ninguno clínico'
);

-- 6) La justificación tampoco debe tener un campo de observaciones
-- libres: sería la puerta de entrada obvia para "estaba con licencia".
select set_eq(
  $$ select column_name::text from information_schema.columns
      where table_schema = 'public' and table_name = 'justificacion_descuadre' $$,
  array['id', 'conciliacion_diaria_id', 'motivo', 'supervisor_nombre',
        'supervisor_anonimizado_at', 'registrado_por', 'created_at'],
  'justificacion_descuadre no debe tener campos de observación libre donde quepa un dato de salud (HU-31)'
);

-- 7) Barrido general: ninguna tabla de negocio debe tener una columna
-- cuyo nombre delate un dato sensible (salud, biometría, creencias,
-- afiliación). Es una red de seguridad para tablas futuras, no solo
-- para las de hoy.
select is_empty(
  $$ select c.table_name::text || '.' || c.column_name::text
       from information_schema.columns c
      where c.table_schema = 'public'
        and (
             c.column_name ~* '(salud|medic|diagnost|enfermedad|licencia_medica|discapacidad)'
          or c.column_name ~* '(biometric|huella|iris|facial)'
          or c.column_name ~* '(religion|creencia|etnia|sindicat|afiliacion|politic)'
          or c.column_name ~* '(orientacion_sexual|embarazo|genetic)'
        ) $$,
  'ninguna tabla debe tener columnas de datos sensibles (salud, biometría, creencias) — Ley 21.719 art. 2 letra g'
);

-- 8) Y tampoco contraseñas ni hashes en el esquema de aplicación: las
-- credenciales viven solo en auth.users, bajo GoTrue.
select is_empty(
  $$ select c.table_name::text || '.' || c.column_name::text
       from information_schema.columns c
      where c.table_schema = 'public'
        and c.column_name ~* '(password|contrasena|clave_acceso|encrypted_password|secret|token)' $$,
  'el esquema public no debe guardar contraseñas, hashes ni tokens: eso es responsabilidad de GoTrue (auth.users)'
);

-- 9) La bitácora de acceso a datos personales no debe convertirse ella
-- misma en un depósito de datos personales: guarda qué pasó, no a quién
-- se llamaba.
select set_eq(
  $$ select column_name::text from information_schema.columns
      where table_schema = 'public'
        and table_name = 'bitacora_acceso_datos_personales' $$,
  array['id', 'usuario_id', 'accion', 'detalle', 'fecha_hora'],
  'la bitácora debe limitarse a quién/qué/cuándo, sin copiar el dato personal afectado'
);

select * from finish();
rollback;
