// map.js — Leaflet map + mock multi-source property listings
// Uses CartoDB Positron tiles (free, no API key) + Nominatim geocoding

/* ── Constants ───────────────────────────────────────── */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const NOMINATIM  = 'https://nominatim.openstreetmap.org/search';

// North Dallas / Collin County seed data
const NEIGHBORHOODS = [
  'Stonebridge Ranch', 'Craig Ranch', 'Watters Creek', 'Adriatica',
  'Westridge', 'Pecan Park', 'Tucker Hill', 'Fossil Creek',
  'Hardin Ranch', 'Painted Tree', 'Trinity Falls', 'Lakeside',
  'Creekside', 'Willows', 'Bridgewater', 'Worthington Estates',
  'The Reserve', 'Greens of Stonebridge', 'Seville', 'Newport Hills',
];

const STREETS = [
  'Legacy Dr', 'Preston Rd', 'Virginia Pkwy', 'Hardin Blvd', 'Custer Rd',
  'Stacy Rd', 'Eldorado Pkwy', 'Collin McKinney Pkwy', 'Alma Rd', 'Ridge Rd',
  'Hillside Dr', 'Creekview Dr', 'Meadow Brook Dr', 'Stonegate Dr', 'Lake Mist Dr',
  'Canyon Falls Dr', 'Cedar Crest Blvd', 'Prairie Creek Rd', 'Vineyard Blvd',
  'Fairways Dr', 'Heritage Way', 'Sunstone Dr', 'Clearwater Dr', 'Ironwood Ln',
  'Bluestone Dr', 'Maple Ridge Rd', 'Copper Canyon Rd', 'Oak Creek Blvd',
];

const CITIES = [
  { name: 'McKinney', state: 'TX', zip: '75071' },
  { name: 'Frisco',   state: 'TX', zip: '75034' },
  { name: 'Allen',    state: 'TX', zip: '75013' },
  { name: 'Plano',    state: 'TX', zip: '75093' },
  { name: 'Prosper',  state: 'TX', zip: '75078' },
  { name: 'Celina',   state: 'TX', zip: '75009' },
  { name: 'Little Elm', state: 'TX', zip: '75068' },
  { name: 'Lewisville', state: 'TX', zip: '75067' },
  { name: 'Murphy',   state: 'TX', zip: '75094' },
  { name: 'Wylie',    state: 'TX', zip: '75098' },
];

const SOURCES = ['zillow', 'realtor', 'redfin'];

// Curated Unsplash real estate photo IDs
const PHOTO_IDS = [
  '1568605114967-8130f3a36994',
  '1564013799919-ab600027ffc6',
  '1570129477492-45c003edd2be',
  '1580587771525-78b9dba3b914',
  '1512917774080-9991f1c4c750',
  '1576941089067-2de3c901d126',
  '1625602812206-5ec545ca1231',
  '1599427303058-f04cbcf4756f',
];

/* ── Seeded PRNG ─────────────────────────────────────── */
function seeded(seed) {
  let s = Math.sin(seed * 9301 + 49297) * 233280;
  return s - Math.floor(s);
}

/* ── Listing Generator ───────────────────────────────── */
let listingCounter = 0;

function generateListing(lat, lng, targetPrice, seed) {
  const r = seeded(seed);
  const priceVariance = 0.25;
  const price = Math.round(targetPrice * (1 - priceVariance + r * priceVariance * 2) / 1000) * 1000;

  const sqftBase = Math.round(price / 150);
  const sqft = Math.round(sqftBase * (0.85 + seeded(seed + 1) * 0.3) / 50) * 50;
  const beds = Math.min(6, Math.max(2, Math.round(sqft / 550)));
  const baths = Math.max(1, Math.round(beds * (0.6 + seeded(seed + 2) * 0.6)));

  const cityIdx = Math.floor(seeded(seed + 3) * CITIES.length);
  const city = CITIES[cityIdx];
  const streetNum = Math.floor(seeded(seed + 4) * 9000 + 1000);
  const streetIdx = Math.floor(seeded(seed + 5) * STREETS.length);
  const photoIdx = Math.floor(seeded(seed + 6) * PHOTO_IDS.length);
  const sourceIdx = Math.floor(seeded(seed + 7) * SOURCES.length);
  const neighborhoodIdx = Math.floor(seeded(seed + 8) * NEIGHBORHOODS.length);
  const yearBuilt = Math.floor(1995 + seeded(seed + 9) * 25);
  const daysOnMarket = Math.floor(seeded(seed + 10) * 45);

  // Slightly offset position within ~0.02 degrees
  const offsetLat = lat + (seeded(seed + 11) - 0.5) * 0.04;
  const offsetLng = lng + (seeded(seed + 12) - 0.5) * 0.04;

  return {
    id: `listing_${++listingCounter}_${Math.floor(seed)}`,
    price,
    address: `${streetNum} ${STREETS[streetIdx]}`,
    city: `${city.name}, ${city.state} ${city.zip}`,
    neighborhood: NEIGHBORHOODS[neighborhoodIdx],
    beds, baths, sqft,
    source: SOURCES[sourceIdx],
    photoId: PHOTO_IDS[photoIdx],
    yearBuilt,
    daysOnMarket,
    lat: offsetLat,
    lng: offsetLng,
  };
}

function generateListingsForArea(centerLat, centerLng, targetPrice, count = 25) {
  const listings = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.floor(centerLat * 1000) + Math.floor(centerLng * 1000) * 7 + i * 31;
    listings.push(generateListing(centerLat, centerLng, targetPrice, seed));
  }
  return listings;
}

/* ── Geocoding ────────────────────────────────────────── */
async function geocode(query) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: 1, countrycodes: 'us' });
  const res = await fetch(`${NOMINATIM}?${params}`, {
    headers: { 'User-Agent': 'HearthwiseApp/1.0 (dfw-mortgage-calculator)' },
  });
  const data = await res.json();
  if (data.length === 0) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display: data[0].display_name };
}

/* ── Map State ────────────────────────────────────────── */
let map = null;
let markers = new Map(); // id → marker
let activeListingId = null;
const activeSources = new Set(['zillow', 'realtor', 'redfin']);

/* ── Formatting ───────────────────────────────────────── */
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtNum = (n) => new Intl.NumberFormat('en-US').format(n);

/* ── Custom Div Icon ─────────────────────────────────── */
function createMarkerIcon(source, selected = false) {
  const label = source === 'zillow' ? 'Z' : source === 'realtor' ? 'R' : 'RF';
  return L.divIcon({
    html: `<div class="map-marker m-${source}${selected ? ' selected' : ''}">${label}</div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -18],
  });
}

/* ── Photo URL ────────────────────────────────────────── */
function photoUrl(id) {
  return `https://images.unsplash.com/photo-${id}?w=280&h=140&fit=crop&auto=format&q=70`;
}

function popupPhotoUrl(id) {
  return `https://images.unsplash.com/photo-${id}?w=260&h=130&fit=crop&auto=format&q=75`;
}

/* ── Popup HTML ───────────────────────────────────────── */
function buildPopupHtml(listing, monthlyPayment) {
  const badgeClass = `map-popup-source source-${listing.source}`;
  return `
    <div class="map-popup">
      <img class="map-popup-img" src="${popupPhotoUrl(listing.photoId)}" alt="${listing.address}" loading="lazy" />
      <div class="map-popup-body">
        <div class="map-popup-price">${fmt(listing.price)}</div>
        <div class="map-popup-address">${listing.address}<br/>${listing.city}</div>
        <div class="map-popup-stats">
          <span>🛏 ${listing.beds} bd</span>
          <span>🚿 ${listing.baths} ba</span>
          <span>📐 ${fmtNum(listing.sqft)} sf</span>
        </div>
        <div class="map-popup-monthly">Est. <strong>${fmt(monthlyPayment)}/mo</strong></div>
        <div class="${badgeClass}">${listing.source.charAt(0).toUpperCase() + listing.source.slice(1)}</div>
      </div>
    </div>`;
}

/* ── Listing Card HTML ───────────────────────────────── */
function buildListingCardHtml(listing, monthlyPayment) {
  return `
    <div class="listing-card" data-id="${listing.id}" tabindex="0">
      <img class="listing-img" src="${photoUrl(listing.photoId)}" alt="${listing.address}" loading="lazy" />
      <div class="listing-body">
        <span class="listing-source-badge source-${listing.source}">${listing.source}</span>
        <div class="listing-price">${fmt(listing.price)}</div>
        <div class="listing-address">${listing.address}, ${listing.city}</div>
        <div class="listing-stats">
          <span class="listing-stat">🛏 ${listing.beds}</span>
          <span class="listing-stat">🚿 ${listing.baths}</span>
          <span class="listing-stat">📐 ${fmtNum(listing.sqft)} sf</span>
          <span class="listing-stat">📅 ${listing.yearBuilt}</span>
        </div>
        <div class="listing-monthly">Est. <strong>${fmt(monthlyPayment)}/mo</strong> · ${listing.daysOnMarket}d on market</div>
      </div>
    </div>`;
}

/* ── Marker Click ─────────────────────────────────────── */
function selectListing(id) {
  // Deselect previous
  if (activeListingId && markers.has(activeListingId)) {
    const { marker, listing } = markers.get(activeListingId);
    marker.setIcon(createMarkerIcon(listing.source, false));
  }
  activeListingId = id;

  // Select new
  if (markers.has(id)) {
    const { marker, listing } = markers.get(id);
    marker.setIcon(createMarkerIcon(listing.source, true));
  }

  // Highlight sidebar card
  document.querySelectorAll('.listing-card').forEach(el => {
    el.classList.toggle('active', el.dataset.id === id);
    if (el.dataset.id === id) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

/* ── Update Listings on Map ──────────────────────────── */
export function updateMapListings(listings, calcFn) {
  if (!map) return;

  // Remove old markers
  markers.forEach(({ marker }) => marker.remove());
  markers.clear();
  activeListingId = null;

  // Filter by active sources
  const filtered = listings.filter(l => activeSources.has(l.source));

  // Update count
  const countEl = document.getElementById('listings-count');
  if (countEl) countEl.textContent = `Showing ${filtered.length} properties`;

  // Render sidebar
  const listEl = document.getElementById('listings-list');
  const emptyEl = document.getElementById('listings-empty');

  if (!filtered.length) {
    if (emptyEl) emptyEl.style.display = '';
    if (listEl) listEl.innerHTML = '';
    return;
  }

  if (emptyEl) emptyEl.style.display = 'none';

  listEl.innerHTML = filtered.map(l => {
    const monthly = calcFn(l.price);
    return buildListingCardHtml(l, monthly);
  }).join('');

  // Add markers + sidebar click handlers
  filtered.forEach(listing => {
    const monthly = calcFn(listing.price);
    const icon = createMarkerIcon(listing.source);
    const marker = L.marker([listing.lat, listing.lng], { icon })
      .addTo(map)
      .bindPopup(buildPopupHtml(listing, monthly), { maxWidth: 260, className: '' });

    marker.on('click', () => selectListing(listing.id));

    markers.set(listing.id, { marker, listing });
  });

  // Sidebar cards → fly to + select
  listEl.querySelectorAll('.listing-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      selectListing(id);
      if (markers.has(id)) {
        const { marker } = markers.get(id);
        map.flyTo(marker.getLatLng(), 15, { animate: true, duration: 0.8 });
        marker.openPopup();
      }
    });
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') card.click(); });
  });
}

/* ── Init Map ─────────────────────────────────────────── */
export function initMap(onMove) {
  const defaultCenter = [33.197, -96.615]; // McKinney, TX
  map = L.map('map', { center: defaultCenter, zoom: 12, zoomControl: true });

  L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19, subdomains: 'abcd' }).addTo(map);

  // Notify when map moves (debounced)
  let moveTimer;
  map.on('moveend', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(() => {
      const center = map.getCenter();
      onMove(center.lat, center.lng);
    }, 600);
  });

  return map;
}

/* ── Search Location ─────────────────────────────────── */
export async function searchAndLoad(query, targetPrice, radiusMiles, calcFn) {
  const loadingEl = document.getElementById('map-loading');
  if (loadingEl) loadingEl.hidden = false;

  try {
    const loc = await geocode(query);
    if (!loc) {
      alert('Location not found. Try a city name, ZIP code, or address.');
      return null;
    }

    map.flyTo([loc.lat, loc.lng], 13, { animate: true, duration: 1 });

    // Generate listings
    const listings = generateListingsForArea(loc.lat, loc.lng, targetPrice, 28);
    updateMapListings(listings, calcFn);

    return { lat: loc.lat, lng: loc.lng, listings };
  } finally {
    if (loadingEl) loadingEl.hidden = true;
  }
}

/* ── Load Listings for Map Center ────────────────────── */
export function loadListingsAtCenter(targetPrice, calcFn) {
  if (!map) return;
  const center = map.getCenter();

  const loadingEl = document.getElementById('map-loading');
  if (loadingEl) loadingEl.hidden = false;

  setTimeout(() => {
    const listings = generateListingsForArea(center.lat, center.lng, targetPrice, 24);
    updateMapListings(listings, calcFn);
    if (loadingEl) loadingEl.hidden = true;
  }, 300);
}

/* ── Toggle Source Filter ────────────────────────────── */
export function toggleSource(source, enabled) {
  if (enabled) activeSources.add(source);
  else activeSources.delete(source);
}

/* ── Get Active Sources ──────────────────────────────── */
export function getActiveSources() { return activeSources; }
