const SNAPSHOT_TABLE = 'schedule_snapshots';
const SNAPSHOT_TTL_MS = 72 * 60 * 60 * 1000;

interface PersistedSnapshotRow {
  payload: any;
  refreshed_at: string;
}

export interface PersistedScheduleSnapshot {
  data: any;
  refreshedAt: number;
}

interface SaveScheduleSnapshotArgs {
  cacheKey: string;
  hub: string;
  dir: string;
  ts: number;
  data: any;
}

let warnedMissingConfig = false;
let warnedInitFailure = false;
let supabaseClientPromise: Promise<any | null> | null = null;

function getSupabaseConfig(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    if (!warnedMissingConfig) {
      console.warn('Schedule snapshots disabled: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
      warnedMissingConfig = true;
    }
    return null;
  }
  return { url, key };
}

async function getSupabaseAdmin(): Promise<any | null> {
  const config = getSupabaseConfig();
  if (!config) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) => createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false }
      }))
      .catch((error: any) => {
        if (!warnedInitFailure) {
          console.error('Failed to initialize Supabase for schedule snapshots:', error?.message || error);
          warnedInitFailure = true;
        }
        return null;
      });
  }
  return supabaseClientPromise;
}

export async function loadScheduleSnapshot(cacheKey: string): Promise<PersistedScheduleSnapshot | null> {
  const supabase = await getSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from(SNAPSHOT_TABLE)
      .select('payload, refreshed_at')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .limit(1);

    if (error) {
      console.error(`Schedule snapshot read failed for ${cacheKey}:`, error.message);
      return null;
    }

    const row = (data as PersistedSnapshotRow[] | null)?.[0];
    if (!row?.payload) return null;

    const refreshedAt = Date.parse(row.refreshed_at);
    return {
      data: row.payload,
      refreshedAt: Number.isFinite(refreshedAt) ? refreshedAt : Date.now(),
    };
  } catch (error: any) {
    console.error(`Schedule snapshot read threw for ${cacheKey}:`, error?.message || error);
    return null;
  }
}

export async function saveScheduleSnapshot({ cacheKey, hub, dir, ts, data }: SaveScheduleSnapshotArgs): Promise<void> {
  if (!data || data.partial) return;

  const supabase = await getSupabaseAdmin();
  if (!supabase) return;

  const nowIso = new Date().toISOString();
  const expiresAtIso = new Date(Math.max(Date.now() + SNAPSHOT_TTL_MS, (ts * 1000) + SNAPSHOT_TTL_MS)).toISOString();

  try {
    const { error } = await supabase
      .from(SNAPSHOT_TABLE)
      .upsert({
        cache_key: cacheKey,
        hub: hub.toUpperCase(),
        direction: dir,
        day_ts: ts,
        payload: data,
        total: Number(data.total || 0),
        source: String(data?.meta?.source || 'unknown'),
        refreshed_at: nowIso,
        expires_at: expiresAtIso,
        updated_at: nowIso,
      }, {
        onConflict: 'cache_key'
      });

    if (error) {
      console.error(`Schedule snapshot write failed for ${cacheKey}:`, error.message);
    }
  } catch (error: any) {
    console.error(`Schedule snapshot write threw for ${cacheKey}:`, error?.message || error);
  }
}
