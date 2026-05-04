-- ============================================================
-- SYNC WhatsApp bonus to pts_acumulados + pts_ledger
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- STEP 1: Fix RLS on pts_ledger (CRITICAL - run first)
DROP POLICY IF EXISTS "anon all" ON pts_ledger;
DROP POLICY IF EXISTS "anon_all_access" ON pts_ledger;
DROP POLICY IF EXISTS "allow anon insert" ON pts_ledger;
DROP POLICY IF EXISTS "allow anon select" ON pts_ledger;

CREATE POLICY "anon_full_access" ON pts_ledger
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- STEP 2: For each player with pt_whatsapp > 0 but NOT yet in pts_ledger,
-- add the WA entry to pts_ledger
INSERT INTO pts_ledger (player_id, pts, source, note, week, created_at)
SELECT 
  p.id,
  p.pt_whatsapp,
  'whatsapp',
  CASE WHEN p.pt_whatsapp >= 50 THEN 'WhatsApp Fundador' ELSE 'WhatsApp Nuevo miembro' END,
  '2026-W18',
  NOW()
FROM players p
WHERE p.pt_whatsapp > 0
  AND p.active = true
  AND NOT EXISTS (
    SELECT 1 FROM pts_ledger pl 
    WHERE pl.player_id = p.id AND pl.source = 'whatsapp'
  );

-- STEP 3: For each player, ensure pts_acumulados includes pt_whatsapp
-- (only add the difference if it's missing)
UPDATE players p
SET pts_acumulados = pts_acumulados + p.pt_whatsapp
WHERE p.pt_whatsapp > 0
  AND p.active = true
  AND NOT EXISTS (
    SELECT 1 FROM pts_ledger pl
    WHERE pl.player_id = p.id AND pl.source = 'whatsapp'
    AND pl.created_at < NOW() - INTERVAL '1 minute' -- only old entries, not the ones we just inserted
  );

-- STEP 4: Retroactively add propaganda pts to ledger for all players
INSERT INTO pts_ledger (player_id, pts, source, note, week, created_at)
SELECT 
  ml.player_id,
  1,
  'propaganda',
  'Retroactivo — ' || COALESCE(ml.msg_title, 'mensaje'),
  '2026-W18',
  ml.created_at
FROM message_logs ml
WHERE NOT EXISTS (
  SELECT 1 FROM pts_ledger pl 
  WHERE pl.player_id = ml.player_id 
    AND pl.source = 'propaganda'
    AND abs(extract(epoch from pl.created_at - ml.created_at)) < 3600
);

-- STEP 5: Update pts_acumulados for propaganda if missing
UPDATE players p
SET pts_acumulados = pts_acumulados + sub.missing_pts
FROM (
  SELECT 
    ml.player_id,
    COUNT(*) as missing_pts
  FROM message_logs ml
  WHERE NOT EXISTS (
    SELECT 1 FROM pts_ledger pl 
    WHERE pl.player_id = ml.player_id 
      AND pl.source = 'propaganda'
      AND abs(extract(epoch from pl.created_at - ml.created_at)) < 3600
  )
  GROUP BY ml.player_id
) sub
WHERE p.id = sub.player_id;

-- STEP 6: Retroactively add PvP pts for all challengers
INSERT INTO pts_ledger (player_id, pts, source, note, week, created_at)
SELECT 
  b.challenger_id,
  CASE WHEN b.challenger_wins >= 2 THEN 2 ELSE 1 END,
  'pvp_registro',
  'vs ' || b.opponent_name || ' (retroactivo)',
  '2026-W19',
  b.created_at
FROM pvp_battles b
WHERE NOT EXISTS (
  SELECT 1 FROM pts_ledger pl 
  WHERE pl.player_id = b.challenger_id 
    AND pl.source = 'pvp_registro'
    AND pl.note LIKE '%' || b.opponent_name || '%'
);

-- STEP 7: Update pts_acumulados for PvP if missing
UPDATE players p
SET pts_acumulados = pts_acumulados + sub.missing_pts
FROM (
  SELECT 
    b.challenger_id as player_id,
    SUM(CASE WHEN b.challenger_wins >= 2 THEN 2 ELSE 1 END) as missing_pts
  FROM pvp_battles b
  WHERE NOT EXISTS (
    SELECT 1 FROM pts_ledger pl 
    WHERE pl.player_id = b.challenger_id 
      AND pl.source = 'pvp_registro'
      AND pl.note LIKE '%' || b.opponent_name || '%'
  )
  GROUP BY b.challenger_id
) sub
WHERE p.id = sub.player_id;

-- STEP 8: Verify results
SELECT 
  p.name,
  p.pts_acumulados,
  p.pt_whatsapp,
  COALESCE(SUM(pl.pts), 0) as ledger_total,
  p.pts_acumulados - COALESCE(SUM(pl.pts), 0) as war_pts_in_cols
FROM players p
LEFT JOIN pts_ledger pl ON pl.player_id = p.id
WHERE p.active = true
GROUP BY p.id, p.name, p.pts_acumulados, p.pt_whatsapp
ORDER BY p.name;
