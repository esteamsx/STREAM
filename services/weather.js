const FETCH_TIMEOUT_MS = 15000;

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw Object.assign(new Error(`Weather service responded ${res.status}.`), { status: 502 });
    return await res.json();
  } catch (err) {
    if (err.status) throw err;
    throw Object.assign(new Error("Could not reach the weather service right now."), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
}

export async function getWeatherForLocation(location) {
  const geo = await fetchJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
  );
  const place = geo.results && geo.results[0];
  if (!place) throw Object.assign(new Error("Could not find that location."), { status: 404 });

  const forecast = await fetchJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true&temperature_unit=celsius&windspeed_unit=kmh`
  );
  const current = forecast.current_weather;
  if (!current) throw Object.assign(new Error("No current weather data for that location."), { status: 502 });

  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    temperature_c: current.temperature,
    windspeed_kmh: current.windspeed,
    condition: WEATHER_CODES[current.weathercode] || "Unknown",
    observed_at: current.time,
  };
}
