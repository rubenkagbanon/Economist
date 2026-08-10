// ════════════════════════════════════════════════════════════
// supabase-config.js — connexion à la base de données Supabase
// ════════════════════════════════════════════════════════════
//
// ⚠️ Remplacez les deux valeurs ci-dessous par celles de VOTRE
// projet Supabase : Project Settings → API dans le tableau de
// bord (https://app.supabase.com).
//
// Ce ne sont pas des secrets à proprement parler : la clé "anon"
// est conçue pour être visible côté client. La vraie protection se fait via les policies
// RLS de la table — voir README.md, section Supabase.
//
const SUPABASE_URL      = "https://soimafxvczlxdqvybkut.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvaW1hZnh2Y3pseGRxdnlia3V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzU2NjUsImV4cCI6MjA5OTI1MTY2NX0.xBXgIKuRPk9GdeydSBMjR2Dp0kPJuhwBE8CfqU0dUaY";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window._sb = client;
document.dispatchEvent(new Event('db-ready'));
