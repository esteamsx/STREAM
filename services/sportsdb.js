const FETCH_TIMEOUT_MS = 15000;
const SPORTSDB_KEY = process.env.THESPORTSDB_KEY || "123";
const BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Sports service responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the sports service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function searchSportsTeam(name) {
  const data = await fetchJson(`${BASE}/searchteams.php?t=${encodeURIComponent(name)}`);
  const team = data.teams && data.teams[0];
  if (!team) throw Object.assign(new Error("Could not find a team matching that name."), { status: 404 });

  return {
    name: team.strTeam,
    sport: team.strSport,
    league: team.strLeague,
    country: team.strCountry,
    stadium: team.strStadium,
    founded: team.intFormedYear || null,
    description: team.strDescriptionEN ? team.strDescriptionEN.slice(0, 500) : null,
    badge: team.strTeamBadge || null,
    jersey: team.strTeamJersey || null,
    website: team.strWebsite || null,
  };
}
