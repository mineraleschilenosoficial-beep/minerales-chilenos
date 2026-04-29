-- Trusted manual corrections for key records.
-- Apply with: psql "$DATABASE_URL" -f scripts/sql/manual_overrides.sql

-- Escondida (major operation)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Escondida',
  'escondida',
  -24.6975,
  -69.30785,
  0.03,
  'Minera Escondida Ltda.',
  'https://www.bhp.com/es/what-we-do/global-locations/chile/escondida',
  '1990',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/mapa-minero/minera-escondida/',
  'Verified with BHP and Consejo Minero',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'escondida'
    AND ABS(COALESCE(target_latitude, 0) - (-24.6975)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.30785)) < 0.000001
);

-- Chuquicamata (Codelco division)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Chuquicamata',
  'chuquicamata',
  -22.28922,
  -68.90784,
  0.03,
  'Codelco',
  'https://www.codelco.com',
  '1915',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/socios/codelco/',
  'Verified with Consejo Minero Codelco profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'chuquicamata'
    AND ABS(COALESCE(target_latitude, 0) - (-22.28922)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-68.90784)) < 0.000001
);

-- El Teniente (Codelco division)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'El Teniente',
  'el teniente',
  -34.08914,
  -70.33783,
  0.03,
  'Codelco',
  'https://www.codelco.com',
  '1905',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/mapa-minero/el-teniente/',
  'Verified with Consejo Minero El Teniente profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'el teniente'
    AND ABS(COALESCE(target_latitude, 0) - (-34.08914)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-70.33783)) < 0.000001
);

-- Collahuasi (major operation)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Collahuasi',
  'collahuasi',
  -20.96424,
  -68.71618,
  0.03,
  'Cia. Minera Dona Ines de Collahuasi',
  'https://www.collahuasi.cl',
  '1999',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/mapa-minero/compania-minera-dona-ines-de-collahuasi/',
  'Verified with Consejo Minero Collahuasi profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'collahuasi'
    AND ABS(COALESCE(target_latitude, 0) - (-20.96424)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-68.71618)) < 0.000001
);

-- Candelaria (district)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Candelaria',
  'candelaria',
  -26.66692,
  -70.0037,
  0.03,
  'Lundin Mining',
  'https://www.lundinmining.com',
  '1995',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/mapa-minero/distrito-candelaria/',
  'Verified with Consejo Minero Candelaria profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'candelaria'
    AND ABS(COALESCE(target_latitude, 0) - (-26.66692)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-70.0037)) < 0.000001
);

-- Quebrada Blanca
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Quebrada Blanca',
  'quebrada blanca',
  -20.99924,
  -68.81952,
  0.03,
  'Cia. Minera Quebrada Blanca',
  'https://www.teck.com/operations-es/chile-es/proyectos-es/quebrada-blanca-fase-2/',
  '2023',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/mapa-minero/quebrada-blanca/',
  'Verified with Consejo Minero and Teck QB profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'quebrada blanca'
    AND ABS(COALESCE(target_latitude, 0) - (-20.99924)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-68.81952)) < 0.000001
);

-- Sierra Gorda
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Sierra Gorda',
  'sierra gorda',
  -22.93086,
  -69.03284,
  0.03,
  'Sierra Gorda SCM',
  'https://www.sgscm.cl/en/',
  '2014',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/mapa-minero/sierra-gorda/',
  'Verified with Consejo Minero Sierra Gorda profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'sierra gorda'
    AND ABS(COALESCE(target_latitude, 0) - (-22.93086)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.03284)) < 0.000001
);

-- Zaldivar
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Zaldivar',
  'zaldivar',
  -24.21418,
  -69.06618,
  0.03,
  'Cia. Minera Zaldivar',
  'https://web.minerazaldivar.cl/',
  '1995',
  'manual-trusted',
  0.95,
  'https://consejominero.cl/nosotros/mapa-minero/zaldivar/',
  'Verified with Consejo Minero Zaldivar profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'zaldivar'
    AND ABS(COALESCE(target_latitude, 0) - (-24.21418)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.06618)) < 0.000001
);

-- Radomiro Tomic
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Radomiro Tomic',
  'radomiro tomic',
  -22.21535,
  -68.90011,
  0.03,
  'Codelco',
  'https://www.codelco.com/operaciones/radomiro-tomic',
  '1997',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/socios/codelco/',
  'Verified with Consejo Minero Codelco profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'radomiro tomic'
    AND ABS(COALESCE(target_latitude, 0) - (-22.21535)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-68.90011)) < 0.000001
);

-- Centinela
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Centinela',
  'centinela',
  -23.16086,
  -69.16785,
  0.03,
  'Minera Centinela',
  'https://web.mineracentinela.cl/',
  '2014',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/mapa-minero/centinela/',
  'Verified with Consejo Minero Centinela profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'centinela'
    AND ABS(COALESCE(target_latitude, 0) - (-23.16086)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.16785)) < 0.000001
);

-- Caserones
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Caserones',
  'caserones',
  -30.05579,
  -70.89954,
  0.03,
  'SCM Minera Lumina Copper Chile',
  'https://www.caserones.cl/',
  '2014',
  'manual-trusted',
  0.95,
  'https://consejominero.cl/nosotros/socios/caserones/',
  'Verified with Consejo Minero Caserones profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'caserones'
    AND ABS(COALESCE(target_latitude, 0) - (-30.05579)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-70.89954)) < 0.000001
);

-- El Abra
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'El Abra',
  'el abra',
  -21.92175,
  -68.83371,
  0.03,
  'Sociedad Contractual Minera El Abra',
  'https://www.elabra.cl/el-abra/',
  '1996',
  'manual-trusted',
  0.97,
  'https://consejominero.cl/nosotros/mapa-minero/el-abra/',
  'Verified with Consejo Minero El Abra profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'el abra'
    AND ABS(COALESCE(target_latitude, 0) - (-21.92175)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-68.83371)) < 0.000001
);

-- Los Bronces
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Los Bronces',
  'los bronces',
  -33.14887,
  -70.2881,
  0.03,
  'Anglo American Sur',
  'https://chile.angloamerican.com/acerca-de-nosotros/nuestras-operaciones-en-chile/los-bronces.aspx',
  '1867',
  'manual-trusted',
  0.93,
  'https://consejominero.cl/nosotros/mapa-minero/los-bronces/',
  'Company and ownership verified in Consejo Minero profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'los bronces'
    AND ABS(COALESCE(target_latitude, 0) - (-33.14887)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-70.2881)) < 0.000001
);

-- El Salvador
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'El Salvador',
  'el salvador',
  -26.24748,
  -69.56622,
  0.03,
  'Codelco',
  'https://www.codelco.com/operaciones/salvador/division-salvador',
  '1959',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/socios/codelco/',
  'Verified with Consejo Minero Codelco profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'el salvador'
    AND ABS(COALESCE(target_latitude, 0) - (-26.24748)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.56622)) < 0.000001
);

-- Cerro Colorado (Tarapaca)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Cerro Colorado',
  'cerro colorado',
  -20.0426,
  -69.2762,
  0.03,
  'Pampa Norte | BHP',
  'https://www.bhp.com/es/what-we-do/global-locations/chile',
  '1994',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/mapa-minero/cerro-colorado/',
  'Verified with Consejo Minero Cerro Colorado profile',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'cerro colorado'
    AND ABS(COALESCE(target_latitude, 0) - (-20.0426)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.2762)) < 0.000001
);

-- El Tesoro (legacy operation integrated into Minera Centinela)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'El Tesoro',
  'el tesoro',
  -22.94253,
  -69.07119,
  0.02,
  'Minera Centinela',
  'https://web.mineracentinela.cl/nosotros/quienes-somos/historia',
  '2001',
  'manual-trusted',
  0.95,
  'https://web.mineracentinela.cl/nosotros/quienes-somos/historia',
  'Centinela history states El Tesoro operations started in 2001',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'el tesoro'
    AND ABS(COALESCE(target_latitude, 0) - (-22.94253)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-69.07119)) < 0.000001
);

-- Andacollo Copper (Carmen de Andacollo operation)
INSERT INTO mine_overrides (
  target_name,
  target_name_normalized,
  target_latitude,
  target_longitude,
  match_radius_deg,
  mining_company,
  website,
  operation_since,
  data_origin,
  confidence_score,
  source_url,
  source_note,
  active,
  updated_at
)
SELECT
  'Andacollo Copper',
  'andacollo copper',
  -30.24416,
  -71.10124,
  0.02,
  'Teck Carmen de Andacollo',
  'https://www.teck.com/operations-es/chile-es/operaciones-es/carmen-de-andacollo-es/',
  '1996',
  'manual-trusted',
  0.96,
  'https://consejominero.cl/nosotros/socios/teck/',
  'Teck profile indicates Carmen de Andacollo operations started in 1996',
  TRUE,
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM mine_overrides
  WHERE target_name_normalized = 'andacollo copper'
    AND ABS(COALESCE(target_latitude, 0) - (-30.24416)) < 0.000001
    AND ABS(COALESCE(target_longitude, 0) - (-71.10124)) < 0.000001
);
