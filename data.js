(function () {
  "use strict";

  const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
  const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

  const STORAGE_KEY = "traveloop.v1.dataset";
  const SESSION_KEY = "traveloop.v1.session";
  const VERIFIED_EMAILS_KEY = "traveloop.v1.verifiedEmails";
  const PENDING_EMAIL_KEY = "traveloop.v1.pendingEmailVerification";

  const sqlSchema = `
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Traveler',
  photo text,
  email text,
  role text not null default 'traveler',
  language text not null default 'English',
  saved_destinations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists trips (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  description text,
  cover_image text,
  budget numeric not null default 0,
  public_slug text unique,
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists trip_stops (
  id text primary key default gen_random_uuid()::text,
  trip_id text not null references trips(id) on delete cascade,
  city text not null,
  country text not null,
  region text,
  start_date date not null,
  end_date date not null,
  cost_index numeric not null default 0,
  popularity numeric not null default 0,
  position integer not null default 0
);

create table if not exists activities (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  city text not null,
  country text,
  type text not null,
  cost numeric not null default 0,
  duration numeric not null default 1,
  image text,
  description text
);

create table if not exists trip_activities (
  id text primary key default gen_random_uuid()::text,
  trip_id text not null references trips(id) on delete cascade,
  stop_id text references trip_stops(id) on delete cascade,
  activity_id text,
  name text not null,
  type text not null,
  cost numeric not null default 0,
  duration numeric not null default 1,
  time text,
  image text,
  description text
);

create table if not exists expense_items (
  id text primary key default gen_random_uuid()::text,
  trip_id text not null references trips(id) on delete cascade,
  category text not null,
  label text not null,
  amount numeric not null default 0,
  expense_date date
);

create table if not exists packing_items (
  id text primary key default gen_random_uuid()::text,
  trip_id text not null references trips(id) on delete cascade,
  category text not null,
  text text not null,
  packed boolean not null default false
);

create table if not exists trip_notes (
  id text primary key default gen_random_uuid()::text,
  trip_id text not null references trips(id) on delete cascade,
  stop_id text references trip_stops(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
`;

  const cityCatalog = [
    {
      id: "city-paris",
      city: "Paris",
      country: "France",
      region: "Europe",
      costIndex: 78,
      popularity: 96,
      image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80",
      summary: "Classic museums, river walks, pastries, design stores, and late-night neighborhoods."
    },
    {
      id: "city-tokyo",
      city: "Tokyo",
      country: "Japan",
      region: "Asia",
      costIndex: 72,
      popularity: 98,
      image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=900&q=80",
      summary: "Layered food streets, temples, neon districts, parks, and clean city movement."
    },
    {
      id: "city-rome",
      city: "Rome",
      country: "Italy",
      region: "Europe",
      costIndex: 65,
      popularity: 91,
      image: "https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=900&q=80",
      summary: "Ancient landmarks, piazzas, espresso stops, slow meals, and golden evening walks."
    },
    {
      id: "city-bali",
      city: "Bali",
      country: "Indonesia",
      region: "Asia",
      costIndex: 42,
      popularity: 88,
      image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=900&q=80",
      summary: "Beaches, temples, rice fields, wellness stays, surf towns, and scenic day trips."
    },
    {
      id: "city-new-york",
      city: "New York",
      country: "United States",
      region: "North America",
      costIndex: 88,
      popularity: 94,
      image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=900&q=80",
      summary: "Museums, skyline views, food neighborhoods, theater, parks, and fast city energy."
    },
    {
      id: "city-cape-town",
      city: "Cape Town",
      country: "South Africa",
      region: "Africa",
      costIndex: 49,
      popularity: 84,
      image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=900&q=80",
      summary: "Coastal drives, mountain views, markets, gardens, beaches, and wine country."
    },
    {
      id: "city-jaipur",
      city: "Jaipur",
      country: "India",
      region: "Asia",
      costIndex: 34,
      popularity: 82,
      image: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=80",
      summary: "Palaces, forts, markets, textiles, rooftop meals, and colorful heritage streets."
    },
    {
      id: "city-sydney",
      city: "Sydney",
      country: "Australia",
      region: "Oceania",
      costIndex: 80,
      popularity: 89,
      image: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=900&q=80",
      summary: "Harbor walks, beaches, design districts, seafood, ferry rides, and coastal hikes."
    }
  ];

  const activityCatalog = [
    {
      id: "act-louvre",
      city: "Paris",
      country: "France",
      name: "Louvre highlights walk",
      type: "Sightseeing",
      cost: 48,
      duration: 3,
      image: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=900&q=80",
      description: "A focused museum visit with space for the Tuileries afterward."
    },
    {
      id: "act-seine",
      city: "Paris",
      country: "France",
      name: "Seine evening cruise",
      type: "Culture",
      cost: 36,
      duration: 2,
      image: "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=900&q=80",
      description: "A relaxed first-night orientation through the heart of Paris."
    },
    {
      id: "act-shibuya",
      city: "Tokyo",
      country: "Japan",
      name: "Shibuya food crawl",
      type: "Food",
      cost: 62,
      duration: 3,
      image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=900&q=80",
      description: "Street food, small bars, ramen, and city lights in one route."
    },
    {
      id: "act-asakusa",
      city: "Tokyo",
      country: "Japan",
      name: "Asakusa temple morning",
      type: "Culture",
      cost: 18,
      duration: 2,
      image: "https://images.unsplash.com/photo-1526481280693-3bfa7568e0f3?auto=format&fit=crop&w=900&q=80",
      description: "A low-cost cultural morning with market lanes and riverside views."
    },
    {
      id: "act-colosseum",
      city: "Rome",
      country: "Italy",
      name: "Colosseum and Forum tour",
      type: "Sightseeing",
      cost: 54,
      duration: 3,
      image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80",
      description: "Ancient Rome in a structured block with time for photos and gelato."
    },
    {
      id: "act-trastevere",
      city: "Rome",
      country: "Italy",
      name: "Trastevere dinner walk",
      type: "Food",
      cost: 44,
      duration: 3,
      image: "https://images.unsplash.com/photo-1525874684015-58379d421a52?auto=format&fit=crop&w=900&q=80",
      description: "A food-first evening through old lanes and neighborhood trattorias."
    },
    {
      id: "act-ubud",
      city: "Bali",
      country: "Indonesia",
      name: "Ubud rice terrace ride",
      type: "Adventure",
      cost: 31,
      duration: 4,
      image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=80",
      description: "Scenic stops around temples, terraces, cafes, and quiet village roads."
    },
    {
      id: "act-brooklyn",
      city: "New York",
      country: "United States",
      name: "Brooklyn bridge and Dumbo",
      type: "Sightseeing",
      cost: 12,
      duration: 2,
      image: "https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=900&q=80",
      description: "A classic walk with skyline viewpoints and easy cafe breaks."
    },
    {
      id: "act-table-mountain",
      city: "Cape Town",
      country: "South Africa",
      name: "Table Mountain cableway",
      type: "Adventure",
      cost: 28,
      duration: 3,
      image: "https://images.unsplash.com/photo-1580060839134-75a5edca2e99?auto=format&fit=crop&w=900&q=80",
      description: "Views, hiking options, and weather-aware planning for a signature day."
    },
    {
      id: "act-jaipur-fort",
      city: "Jaipur",
      country: "India",
      name: "Amber Fort heritage route",
      type: "Culture",
      cost: 19,
      duration: 4,
      image: "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&w=900&q=80",
      description: "A focused fort visit with photo stops and market time."
    },
    {
      id: "act-sydney-harbor",
      city: "Sydney",
      country: "Australia",
      name: "Harbor ferry loop",
      type: "Sightseeing",
      cost: 22,
      duration: 3,
      image: "https://images.unsplash.com/photo-1523428096881-5bd79d043006?auto=format&fit=crop&w=900&q=80",
      description: "A ferry-based route linking harbor icons and relaxed waterside stops."
    }
  ];

  cityCatalog.push(
    {
      id: "city-delhi",
      city: "Delhi",
      country: "India",
      region: "Asia",
      costIndex: 44,
      popularity: 94,
      image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=900&q=80",
      summary: "Historic forts, markets, museums, food lanes, metro access, and gateway routes across North India."
    },
    {
      id: "city-mumbai",
      city: "Mumbai",
      country: "India",
      region: "Asia",
      costIndex: 58,
      popularity: 93,
      image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=900&q=80",
      summary: "Sea drives, colonial landmarks, Bollywood energy, street food, galleries, and fast coastal movement."
    },
    {
      id: "city-bengaluru",
      city: "Bengaluru",
      country: "India",
      region: "Asia",
      costIndex: 51,
      popularity: 87,
      image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=900&q=80",
      summary: "Gardens, cafes, breweries, tech districts, art spaces, and easy weekend links to hill towns."
    },
    {
      id: "city-chennai",
      city: "Chennai",
      country: "India",
      region: "Asia",
      costIndex: 43,
      popularity: 82,
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80",
      summary: "Marina Beach, temples, music culture, South Indian food, museums, and heritage neighborhoods."
    },
    {
      id: "city-kolkata",
      city: "Kolkata",
      country: "India",
      region: "Asia",
      costIndex: 38,
      popularity: 85,
      image: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=900&q=80",
      summary: "Colonial architecture, riverfront walks, book streets, sweets, art, trams, and festival energy."
    },
    {
      id: "city-hyderabad",
      city: "Hyderabad",
      country: "India",
      region: "Asia",
      costIndex: 42,
      popularity: 86,
      image: "https://images.unsplash.com/photo-1609852569455-944b7f8a4a7d?auto=format&fit=crop&w=900&q=80",
      summary: "Charminar, biryani trails, old-city markets, lakes, palaces, and modern food districts."
    },
    {
      id: "city-pune",
      city: "Pune",
      country: "India",
      region: "Asia",
      costIndex: 45,
      popularity: 80,
      image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=900&q=80",
      summary: "Forts, student cafes, heritage walks, music venues, and short drives to Lonavala and hill routes."
    },
    {
      id: "city-ahmedabad",
      city: "Ahmedabad",
      country: "India",
      region: "Asia",
      costIndex: 39,
      popularity: 79,
      image: "https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=900&q=80",
      summary: "Pol houses, stepwells, textiles, riverfront paths, museums, and Gujarati food circuits."
    },
    {
      id: "city-goa",
      city: "Goa",
      country: "India",
      region: "Asia",
      costIndex: 50,
      popularity: 92,
      image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
      summary: "Beaches, Portuguese quarters, seafood, forts, nightlife, kayaking, and slower coastal stays."
    },
    {
      id: "city-kochi",
      city: "Kochi",
      country: "India",
      region: "Asia",
      costIndex: 41,
      popularity: 83,
      image: "https://images.unsplash.com/photo-1590123732197-0e5618a98c80?auto=format&fit=crop&w=900&q=80",
      summary: "Fort Kochi lanes, backwater access, spice history, cafes, art biennale spaces, and seafood."
    },
    {
      id: "city-varanasi",
      city: "Varanasi",
      country: "India",
      region: "Asia",
      costIndex: 32,
      popularity: 90,
      image: "https://images.unsplash.com/photo-1561361058-c24cecae35ca?auto=format&fit=crop&w=900&q=80",
      summary: "Ghats, sunrise boat rides, temples, music, narrow lanes, silk markets, and spiritual rituals."
    },
    {
      id: "city-agra",
      city: "Agra",
      country: "India",
      region: "Asia",
      costIndex: 35,
      popularity: 91,
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
      summary: "Taj Mahal, Mughal gardens, forts, marble craft, and easy links to Delhi and Jaipur."
    },
    {
      id: "city-udaipur",
      city: "Udaipur",
      country: "India",
      region: "Asia",
      costIndex: 43,
      popularity: 86,
      image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=900&q=80",
      summary: "Lake palaces, rooftop dinners, old-city walks, boat rides, crafts, and romantic sunset viewpoints."
    },
    {
      id: "city-jodhpur",
      city: "Jodhpur",
      country: "India",
      region: "Asia",
      costIndex: 37,
      popularity: 82,
      image: "https://images.unsplash.com/photo-1595658658481-d53d3f999875?auto=format&fit=crop&w=900&q=80",
      summary: "Blue city lanes, Mehrangarh Fort, desert food, bazaars, stepwells, and heritage stays."
    },
    {
      id: "city-rishikesh",
      city: "Rishikesh",
      country: "India",
      region: "Asia",
      costIndex: 34,
      popularity: 84,
      image: "https://images.unsplash.com/photo-1591017403286-fd8493524e1e?auto=format&fit=crop&w=900&q=80",
      summary: "Ganga aarti, yoga retreats, rafting, cafes, suspension bridges, and Himalayan gateway trips."
    },
    {
      id: "city-amritsar",
      city: "Amritsar",
      country: "India",
      region: "Asia",
      costIndex: 34,
      popularity: 82,
      image: "https://images.unsplash.com/photo-1588096344356-9ecfb77208fb?auto=format&fit=crop&w=900&q=80",
      summary: "Golden Temple, Punjabi food, partition history, markets, and the Wagah border ceremony."
    },
    {
      id: "city-shimla",
      city: "Shimla",
      country: "India",
      region: "Asia",
      costIndex: 40,
      popularity: 78,
      image: "https://images.unsplash.com/photo-1626621331169-5f34be280ed9?auto=format&fit=crop&w=900&q=80",
      summary: "Hill station walks, colonial streets, toy-train routes, mountain viewpoints, and cafe breaks."
    },
    {
      id: "city-manali",
      city: "Manali",
      country: "India",
      region: "Asia",
      costIndex: 39,
      popularity: 84,
      image: "https://images.unsplash.com/photo-1626621331169-5f34be280ed9?auto=format&fit=crop&w=900&q=80",
      summary: "Valley stays, mountain cafes, adventure sports, temples, and routes toward Solang and Atal Tunnel."
    },
    {
      id: "city-darjeeling",
      city: "Darjeeling",
      country: "India",
      region: "Asia",
      costIndex: 36,
      popularity: 80,
      image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=900&q=80",
      summary: "Tea gardens, toy train, sunrise viewpoints, mountain walks, monasteries, and cool-weather stays."
    },
    {
      id: "city-mysuru",
      city: "Mysuru",
      country: "India",
      region: "Asia",
      costIndex: 34,
      popularity: 79,
      image: "https://images.unsplash.com/photo-1600112356915-089abb8fc71a?auto=format&fit=crop&w=900&q=80",
      summary: "Palace architecture, markets, sandalwood, yoga schools, and easy links to Coorg."
    },
    {
      id: "city-munnar",
      city: "Munnar",
      country: "India",
      region: "Asia",
      costIndex: 37,
      popularity: 81,
      image: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=900&q=80",
      summary: "Tea estates, misty hills, viewpoints, wildlife routes, and quiet resort stays."
    },
    {
      id: "city-hampi",
      city: "Hampi",
      country: "India",
      region: "Asia",
      costIndex: 31,
      popularity: 82,
      image: "https://images.unsplash.com/photo-1620766182966-c6eb5ed2b788?auto=format&fit=crop&w=900&q=80",
      summary: "Temple ruins, boulder landscapes, coracle rides, heritage walks, and sunset viewpoints."
    },
    {
      id: "city-leh",
      city: "Leh",
      country: "India",
      region: "Asia",
      costIndex: 49,
      popularity: 85,
      image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=900&q=80",
      summary: "High-altitude monasteries, mountain passes, lake routes, acclimatization days, and stark landscapes."
    },
    {
      id: "city-srinagar",
      city: "Srinagar",
      country: "India",
      region: "Asia",
      costIndex: 42,
      popularity: 83,
      image: "https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=900&q=80",
      summary: "Dal Lake, gardens, houseboats, mountain drives, markets, and Kashmir food experiences."
    },
    {
      id: "city-pondicherry",
      city: "Pondicherry",
      country: "India",
      region: "Asia",
      costIndex: 40,
      popularity: 79,
      image: "https://images.unsplash.com/photo-1590050752117-238cb0fb12b1?auto=format&fit=crop&w=900&q=80",
      summary: "French quarter streets, cafes, beaches, ashram visits, cycle routes, and coastal day trips."
    },
    {
      id: "city-lucknow",
      city: "Lucknow",
      country: "India",
      region: "Asia",
      costIndex: 35,
      popularity: 76,
      image: "https://images.unsplash.com/photo-1598190896090-9dc5c70361d5?auto=format&fit=crop&w=900&q=80",
      summary: "Nawabi architecture, kebab trails, chikankari markets, gardens, and heritage neighborhoods."
    },
    {
      id: "city-guwahati",
      city: "Guwahati",
      country: "India",
      region: "Asia",
      costIndex: 37,
      popularity: 74,
      image: "https://images.unsplash.com/photo-1572431447238-425af66a273b?auto=format&fit=crop&w=900&q=80",
      summary: "Brahmaputra river views, temples, Assamese food, markets, and gateway access to Northeast India."
    },
    {
      id: "city-shillong",
      city: "Shillong",
      country: "India",
      region: "Asia",
      costIndex: 39,
      popularity: 77,
      image: "https://images.unsplash.com/photo-1572431447238-425af66a273b?auto=format&fit=crop&w=900&q=80",
      summary: "Cloudy hills, waterfalls, cafes, music culture, lake walks, and drives toward Cherrapunji."
    },
    {
      id: "city-surat",
      city: "Surat",
      country: "India",
      region: "Asia",
      costIndex: 36,
      popularity: 72,
      image: "https://images.unsplash.com/photo-1599661046827-dacff0c0f09a?auto=format&fit=crop&w=900&q=80",
      summary: "Textiles, diamond markets, Gujarati food, riverfront time, and short coastal escapes."
    },
    {
      id: "city-madurai",
      city: "Madurai",
      country: "India",
      region: "Asia",
      costIndex: 32,
      popularity: 78,
      image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=900&q=80",
      summary: "Meenakshi temple, old markets, jasmine, South Indian food, and heritage streets."
    },
    {
      id: "city-london",
      city: "London",
      country: "United Kingdom",
      region: "Europe",
      costIndex: 86,
      popularity: 95,
      image: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80",
      summary: "Museums, markets, theatre, parks, neighborhoods, and strong public transport."
    },
    {
      id: "city-dubai",
      city: "Dubai",
      country: "United Arab Emirates",
      region: "Middle East",
      costIndex: 78,
      popularity: 92,
      image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=900&q=80",
      summary: "Architecture, malls, desert routes, beaches, food courts, and easy stopover planning."
    },
    {
      id: "city-singapore",
      city: "Singapore",
      country: "Singapore",
      region: "Asia",
      costIndex: 82,
      popularity: 91,
      image: "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=900&q=80",
      summary: "Hawker centers, gardens, waterfront walks, museums, shopping districts, and clean transit."
    },
    {
      id: "city-bangkok",
      city: "Bangkok",
      country: "Thailand",
      region: "Asia",
      costIndex: 45,
      popularity: 93,
      image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=900&q=80",
      summary: "Temples, street food, river ferries, markets, rooftop views, and budget-friendly stays."
    }
  );

  activityCatalog.push(
    {
      id: "act-delhi-food",
      city: "Delhi",
      country: "India",
      name: "Old Delhi food walk",
      type: "Food",
      cost: 24,
      duration: 3,
      image: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80",
      description: "A guided route through kebabs, chaats, sweets, spice lanes, and heritage streets."
    },
    {
      id: "act-mumbai-marine",
      city: "Mumbai",
      country: "India",
      name: "Marine Drive sunset walk",
      type: "Sightseeing",
      cost: 8,
      duration: 2,
      image: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=900&q=80",
      description: "A low-cost coastal walk linking Art Deco streets, snacks, and sea views."
    },
    {
      id: "act-jaipur-palace",
      city: "Jaipur",
      country: "India",
      name: "City Palace and bazaar trail",
      type: "Culture",
      cost: 22,
      duration: 4,
      image: "https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&w=900&q=80",
      description: "Palace rooms, textile markets, jewelry lanes, and a classic rooftop lunch."
    },
    {
      id: "act-varanasi-boat",
      city: "Varanasi",
      country: "India",
      name: "Sunrise Ganga boat ride",
      type: "Culture",
      cost: 18,
      duration: 2,
      image: "https://images.unsplash.com/photo-1561361058-c24cecae35ca?auto=format&fit=crop&w=900&q=80",
      description: "Early morning river views, ghats, rituals, and a calm start before the lanes wake up."
    },
    {
      id: "act-agra-taj",
      city: "Agra",
      country: "India",
      name: "Taj Mahal sunrise visit",
      type: "Sightseeing",
      cost: 27,
      duration: 3,
      image: "https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=900&q=80",
      description: "A timed monument visit with photo windows and nearby garden stops."
    },
    {
      id: "act-goa-beach",
      city: "Goa",
      country: "India",
      name: "North Goa beach and fort route",
      type: "Adventure",
      cost: 30,
      duration: 5,
      image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80",
      description: "A relaxed coastal loop across beaches, forts, cafes, and sunset viewpoints."
    },
    {
      id: "act-kochi-fort",
      city: "Kochi",
      country: "India",
      name: "Fort Kochi art and spice walk",
      type: "Culture",
      cost: 20,
      duration: 3,
      image: "https://images.unsplash.com/photo-1590123732197-0e5618a98c80?auto=format&fit=crop&w=900&q=80",
      description: "A heritage route with galleries, spice history, cafes, and harbor views."
    },
    {
      id: "act-rishikesh-rafting",
      city: "Rishikesh",
      country: "India",
      name: "Ganga rafting block",
      type: "Adventure",
      cost: 32,
      duration: 4,
      image: "https://images.unsplash.com/photo-1591017403286-fd8493524e1e?auto=format&fit=crop&w=900&q=80",
      description: "A half-day adventure slot with briefing, rafting, and recovery cafe time."
    },
    {
      id: "act-leh-monastery",
      city: "Leh",
      country: "India",
      name: "Monastery acclimatization day",
      type: "Culture",
      cost: 26,
      duration: 5,
      image: "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=900&q=80",
      description: "A gentle first-day route for altitude adjustment, viewpoints, and monastery visits."
    }
  );

  function uid(prefix) {
    if (window.crypto && crypto.randomUUID) {
      return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function makeInitialDataset() {
    return {
      profile: {
        id: "demo-user",
        name: "Aarav Traveler",
        email: "demo@traveloop.app",
        photo: "",
        role: "admin",
        language: "English",
        savedDestinations: ["Paris", "Tokyo", "Bali"]
      },
      trips: [
        {
          id: "trip-europe-loop",
          ownerId: "demo-user",
          name: "European Culture Loop",
          startDate: "2026-06-12",
          endDate: "2026-06-20",
          description: "A balanced route through museums, food streets, and relaxed city walks.",
          coverImage: "https://images.unsplash.com/photo-1473959383416-0123b1956f6a?auto=format&fit=crop&w=1400&q=80",
          budget: 2450,
          publicSlug: "european-culture-loop",
          isPublic: true,
          stops: [
            {
              id: "stop-paris",
              city: "Paris",
              country: "France",
              region: "Europe",
              startDate: "2026-06-12",
              endDate: "2026-06-15",
              costIndex: 78,
              popularity: 96,
              order: 1
            },
            {
              id: "stop-rome",
              city: "Rome",
              country: "Italy",
              region: "Europe",
              startDate: "2026-06-16",
              endDate: "2026-06-20",
              costIndex: 65,
              popularity: 91,
              order: 2
            }
          ],
          assignedActivities: [
            {
              id: "ta-louvre",
              stopId: "stop-paris",
              activityId: "act-louvre",
              name: "Louvre highlights walk",
              type: "Sightseeing",
              cost: 48,
              duration: 3,
              time: "10:00",
              image: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&w=900&q=80",
              description: "A focused museum visit with space for the Tuileries afterward."
            },
            {
              id: "ta-seine",
              stopId: "stop-paris",
              activityId: "act-seine",
              name: "Seine evening cruise",
              type: "Culture",
              cost: 36,
              duration: 2,
              time: "19:00",
              image: "https://images.unsplash.com/photo-1431274172761-fca41d930114?auto=format&fit=crop&w=900&q=80",
              description: "A relaxed first-night orientation through the heart of Paris."
            },
            {
              id: "ta-colosseum",
              stopId: "stop-rome",
              activityId: "act-colosseum",
              name: "Colosseum and Forum tour",
              type: "Sightseeing",
              cost: 54,
              duration: 3,
              time: "09:30",
              image: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=900&q=80",
              description: "Ancient Rome in a structured block with time for photos and gelato."
            }
          ],
          expenses: [
            { id: "exp-flight", category: "transport", label: "Flights and rail", amount: 780, date: "2026-06-12" },
            { id: "exp-stay", category: "stay", label: "Hotels", amount: 920, date: "2026-06-12" },
            { id: "exp-meals", category: "meals", label: "Meals estimate", amount: 430, date: "2026-06-12" },
            { id: "exp-activities", category: "activities", label: "Tours and tickets", amount: 310, date: "2026-06-12" }
          ],
          packing: [
            { id: "pack-passport", category: "Documents", text: "Passport and visa copies", packed: true },
            { id: "pack-adapter", category: "Electronics", text: "Universal adapter", packed: false },
            { id: "pack-shoes", category: "Clothing", text: "Comfortable walking shoes", packed: false }
          ],
          notes: [
            { id: "note-hotel", stopId: "stop-paris", body: "Paris hotel check-in opens at 3 PM. Keep luggage drop option ready.", createdAt: "2026-05-07T09:30:00.000Z" }
          ]
        },
        {
          id: "trip-asia-food",
          ownerId: "demo-user",
          name: "Asia Food and Temples",
          startDate: "2026-08-04",
          endDate: "2026-08-13",
          description: "A compact food-led itinerary through Tokyo and Bali with slower recovery days.",
          coverImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1400&q=80",
          budget: 1850,
          publicSlug: "asia-food-temples",
          isPublic: true,
          stops: [
            {
              id: "stop-tokyo",
              city: "Tokyo",
              country: "Japan",
              region: "Asia",
              startDate: "2026-08-04",
              endDate: "2026-08-08",
              costIndex: 72,
              popularity: 98,
              order: 1
            },
            {
              id: "stop-bali",
              city: "Bali",
              country: "Indonesia",
              region: "Asia",
              startDate: "2026-08-09",
              endDate: "2026-08-13",
              costIndex: 42,
              popularity: 88,
              order: 2
            }
          ],
          assignedActivities: [
            {
              id: "ta-shibuya",
              stopId: "stop-tokyo",
              activityId: "act-shibuya",
              name: "Shibuya food crawl",
              type: "Food",
              cost: 62,
              duration: 3,
              time: "18:30",
              image: "https://images.unsplash.com/photo-1513407030348-c983a97b98d8?auto=format&fit=crop&w=900&q=80",
              description: "Street food, small bars, ramen, and city lights in one route."
            },
            {
              id: "ta-ubud",
              stopId: "stop-bali",
              activityId: "act-ubud",
              name: "Ubud rice terrace ride",
              type: "Adventure",
              cost: 31,
              duration: 4,
              time: "08:00",
              image: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=900&q=80",
              description: "Scenic stops around temples, terraces, cafes, and quiet village roads."
            }
          ],
          expenses: [
            { id: "exp-asia-flight", category: "transport", label: "Flights", amount: 720, date: "2026-08-04" },
            { id: "exp-asia-stay", category: "stay", label: "Stays", amount: 580, date: "2026-08-04" },
            { id: "exp-asia-meals", category: "meals", label: "Food plan", amount: 330, date: "2026-08-04" },
            { id: "exp-asia-activities", category: "activities", label: "Activities", amount: 140, date: "2026-08-04" }
          ],
          packing: [
            { id: "pack-sunscreen", category: "Health", text: "Sunscreen and basic medicines", packed: false },
            { id: "pack-cash", category: "Documents", text: "Small cash and travel cards", packed: true }
          ],
          notes: []
        }
      ],
      cities: cityCatalog,
      activities: activityCatalog
    };
  }

  function hasSupabaseKeys() {
    return Boolean(
      SUPABASE_URL &&
      SUPABASE_ANON_KEY &&
      !SUPABASE_URL.includes("YOUR_") &&
      !SUPABASE_ANON_KEY.includes("YOUR_")
    );
  }

  function configured() {
    return Boolean(
      hasSupabaseKeys() &&
      window.supabase &&
      window.supabase.createClient
    );
  }

  function waitForSupabase(timeoutMs) {
    if (!hasSupabaseKeys()) return Promise.resolve(false);
    const started = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (configured()) {
          resolve(true);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          resolve(false);
          return;
        }
        window.setTimeout(tick, 100);
      };
      tick();
    });
  }

  let client = null;

  function getClient() {
    if (!configured()) return null;
    if (!client) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return client;
  }

  function mergeCatalog(existing, catalog) {
    const custom = Array.isArray(existing) ? existing : [];
    const catalogIds = new Set(catalog.map((item) => item.id));
    return catalog.concat(custom.filter((item) => item && !catalogIds.has(item.id)));
  }

  function readLocalDataset() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const initial = makeInitialDataset();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    try {
      const parsed = JSON.parse(stored);
      parsed.cities = mergeCatalog(parsed.cities, cityCatalog);
      parsed.activities = mergeCatalog(parsed.activities, activityCatalog);
      return parsed;
    } catch (error) {
      const initial = makeInitialDataset();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
  }

  function writeLocalDataset(dataset) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataset));
  }

  function readLocalSession() {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }

  function writeLocalSession(user) {
    if (!user) {
      localStorage.removeItem(SESSION_KEY);
      return;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  function validateEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return { valid: false, email: normalized, message: "Email is required." };
    if (normalized.length > 254) return { valid: false, email: normalized, message: "Email is too long." };
    if ((normalized.match(/@/g) || []).length !== 1) return { valid: false, email: normalized, message: "Email must contain one @ symbol." };
    const [local, domain] = normalized.split("@");
    if (!local || !domain) return { valid: false, email: normalized, message: "Email must include a name and domain." };
    if (local.length > 64) return { valid: false, email: normalized, message: "Email name is too long." };
    if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) {
      return { valid: false, email: normalized, message: "Email name has invalid dots." };
    }
    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) {
      return { valid: false, email: normalized, message: "Email name has unsupported characters." };
    }
    if (!domain.includes(".")) return { valid: false, email: normalized, message: "Email domain must include a dot." };
    const labels = domain.split(".");
    if (labels.some((label) => !label || label.startsWith("-") || label.endsWith("-") || !/^[a-z0-9-]+$/i.test(label))) {
      return { valid: false, email: normalized, message: "Email domain is not valid." };
    }
    const tld = labels[labels.length - 1];
    if (!/^[a-z]{2,}$/i.test(tld)) return { valid: false, email: normalized, message: "Email top-level domain is not valid." };
    return { valid: true, email: normalized, message: "Email format is valid." };
  }

  function readVerifiedEmails() {
    try {
      return JSON.parse(localStorage.getItem(VERIFIED_EMAILS_KEY) || "[]");
    } catch (error) {
      return [];
    }
  }

  function markEmailVerified(email) {
    const normalized = normalizeEmail(email);
    const verified = new Set(readVerifiedEmails());
    verified.add(normalized);
    localStorage.setItem(VERIFIED_EMAILS_KEY, JSON.stringify(Array.from(verified)));
  }

  function isEmailVerified(email) {
    const normalized = normalizeEmail(email);
    return normalized === "demo@traveloop.app" || readVerifiedEmails().includes(normalized);
  }

  function createDemoVerification(email) {
    const normalized = normalizeEmail(email);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    localStorage.setItem(PENDING_EMAIL_KEY, JSON.stringify({
      email: normalized,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    }));
    return code;
  }

  function readPendingVerification() {
    try {
      return JSON.parse(localStorage.getItem(PENDING_EMAIL_KEY) || "null");
    } catch (error) {
      return null;
    }
  }

  function normalizeRows(rows) {
    const trips = (rows.trips || []).map((trip) => ({
      id: trip.id,
      ownerId: trip.owner_id,
      name: trip.name,
      startDate: trip.start_date,
      endDate: trip.end_date,
      description: trip.description || "",
      coverImage: trip.cover_image || "",
      budget: Number(trip.budget || 0),
      publicSlug: trip.public_slug || "",
      isPublic: Boolean(trip.is_public),
      stops: (rows.stops || [])
        .filter((stop) => stop.trip_id === trip.id)
        .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
        .map((stop) => ({
          id: stop.id,
          city: stop.city,
          country: stop.country,
          region: stop.region || "",
          startDate: stop.start_date,
          endDate: stop.end_date,
          costIndex: Number(stop.cost_index || 0),
          popularity: Number(stop.popularity || 0),
          order: Number(stop.position || 0)
        })),
      assignedActivities: (rows.tripActivities || [])
        .filter((activity) => activity.trip_id === trip.id)
        .map((activity) => ({
          id: activity.id,
          stopId: activity.stop_id,
          activityId: activity.activity_id,
          name: activity.name,
          type: activity.type,
          cost: Number(activity.cost || 0),
          duration: Number(activity.duration || 1),
          time: activity.time || "",
          image: activity.image || "",
          description: activity.description || ""
        })),
      expenses: (rows.expenses || [])
        .filter((expense) => expense.trip_id === trip.id)
        .map((expense) => ({
          id: expense.id,
          category: expense.category,
          label: expense.label,
          amount: Number(expense.amount || 0),
          date: expense.expense_date || ""
        })),
      packing: (rows.packing || [])
        .filter((item) => item.trip_id === trip.id)
        .map((item) => ({
          id: item.id,
          category: item.category,
          text: item.text,
          packed: Boolean(item.packed)
        })),
      notes: (rows.notes || [])
        .filter((note) => note.trip_id === trip.id)
        .map((note) => ({
          id: note.id,
          stopId: note.stop_id || "",
          body: note.body,
          createdAt: note.created_at
        }))
    }));

    return {
      profile: rows.profile || makeInitialDataset().profile,
      trips,
      cities: cityCatalog,
      activities: rows.activities && rows.activities.length ? rows.activities.map((activity) => ({
        id: activity.id,
        city: activity.city,
        country: activity.country || "",
        name: activity.name,
        type: activity.type,
        cost: Number(activity.cost || 0),
        duration: Number(activity.duration || 1),
        image: activity.image || "",
        description: activity.description || ""
      })) : activityCatalog
    };
  }

  function tripRows(dataset, userId) {
    const trips = dataset.trips || [];
    return {
      trips: trips.map((trip) => ({
        id: trip.id,
        owner_id: userId,
        name: trip.name,
        start_date: trip.startDate,
        end_date: trip.endDate,
        description: trip.description,
        cover_image: trip.coverImage,
        budget: Number(trip.budget || 0),
        public_slug: trip.publicSlug,
        is_public: Boolean(trip.isPublic)
      })),
      stops: trips.flatMap((trip) => (trip.stops || []).map((stop, index) => ({
        id: stop.id,
        trip_id: trip.id,
        city: stop.city,
        country: stop.country,
        region: stop.region,
        start_date: stop.startDate,
        end_date: stop.endDate,
        cost_index: Number(stop.costIndex || 0),
        popularity: Number(stop.popularity || 0),
        position: Number(stop.order || index + 1)
      }))),
      tripActivities: trips.flatMap((trip) => (trip.assignedActivities || []).map((activity) => ({
        id: activity.id,
        trip_id: trip.id,
        stop_id: activity.stopId,
        activity_id: activity.activityId || null,
        name: activity.name,
        type: activity.type,
        cost: Number(activity.cost || 0),
        duration: Number(activity.duration || 1),
        time: activity.time,
        image: activity.image,
        description: activity.description
      }))),
      expenses: trips.flatMap((trip) => (trip.expenses || []).map((expense) => ({
        id: expense.id,
        trip_id: trip.id,
        category: expense.category,
        label: expense.label,
        amount: Number(expense.amount || 0),
        expense_date: expense.date || null
      }))),
      packing: trips.flatMap((trip) => (trip.packing || []).map((item) => ({
        id: item.id,
        trip_id: trip.id,
        category: item.category,
        text: item.text,
        packed: Boolean(item.packed)
      }))),
      notes: trips.flatMap((trip) => (trip.notes || []).map((note) => ({
        id: note.id,
        trip_id: trip.id,
        stop_id: note.stopId || null,
        body: note.body,
        created_at: note.createdAt
      })))
    };
  }

  async function getSession() {
    const sb = getClient();
    if (sb) {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      if (data.session && data.session.user) {
        return {
          id: data.session.user.id,
          email: data.session.user.email,
          name: data.session.user.user_metadata && data.session.user.user_metadata.name || "Traveler"
        };
      }
      return null;
    }
    return readLocalSession();
  }

  async function signIn(email, password) {
    const validation = validateEmail(email);
    if (!validation.valid) throw new Error(validation.message);
    const sb = getClient();
    if (sb) {
      const { data, error } = await sb.auth.signInWithPassword({ email: validation.email, password });
      if (error) throw error;
      return {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata && data.user.user_metadata.name || "Traveler"
      };
    }
    if (!password || password.length < 6) {
      throw new Error("Use a valid email and a password with at least 6 characters.");
    }
    if (!isEmailVerified(validation.email)) {
      throw new Error("Email is not verified yet. Create an account and enter the verification code first.");
    }
    const user = { id: "demo-user", email: validation.email, name: validation.email.split("@")[0] || "Traveler" };
    writeLocalSession(user);
    return user;
  }

  async function signUp(email, password) {
    const validation = validateEmail(email);
    if (!validation.valid) throw new Error(validation.message);
    if (!password || password.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }
    const sb = getClient();
    if (sb) {
      const { data, error } = await sb.auth.signUp({
        email: validation.email,
        password,
        options: {
          emailRedirectTo: window.location.href.split("#")[0],
          data: { name: validation.email.split("@")[0] || "Traveler" }
        }
      });
      if (error) throw error;
      if (!data.session) {
        return {
          pendingVerification: true,
          provider: "supabase",
          email: validation.email,
          message: "Supabase sent a confirmation link to your inbox. Click the link, then return and refresh verification."
        };
      }
      return {
        id: data.user && data.user.id || "pending-user",
        email: validation.email,
        name: validation.email.split("@")[0] || "Traveler"
      };
    }
    const code = createDemoVerification(validation.email);
    return {
      pendingVerification: true,
      provider: "demo",
      email: validation.email,
      demoCode: code,
      message: `Demo verification code: ${code}`
    };
  }

  async function resetPassword(email) {
    const validation = validateEmail(email);
    if (!validation.valid) throw new Error(validation.message);
    const sb = getClient();
    if (sb) {
      const { error } = await sb.auth.resetPasswordForEmail(validation.email);
      if (error) throw error;
    }
    return true;
  }

  async function resendVerification(email) {
    const validation = validateEmail(email);
    if (!validation.valid) throw new Error(validation.message);
    const sb = getClient();
    if (sb && sb.auth.resend) {
      const { error } = await sb.auth.resend({
        type: "signup",
        email: validation.email,
        options: { emailRedirectTo: window.location.href.split("#")[0] }
      });
      if (error) throw error;
      return {
        provider: "supabase",
        email: validation.email,
        message: "A new Supabase confirmation email has been sent."
      };
    }
    const code = createDemoVerification(validation.email);
    return {
      provider: "demo",
      email: validation.email,
      demoCode: code,
      message: `New demo verification code: ${code}`
    };
  }

  async function verifyEmailCode(email, code) {
    const validation = validateEmail(email);
    if (!validation.valid) throw new Error(validation.message);
    const token = String(code || "").trim();
    const sb = getClient();
    if (sb && sb.auth.verifyOtp) {
      if (!token) {
        throw new Error("Click the Supabase email confirmation link, or enter an OTP if your email template sends one.");
      }
      const { data, error } = await sb.auth.verifyOtp({
        email: validation.email,
        token,
        type: "signup"
      });
      if (error) throw error;
      if (data.session && data.user) {
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata && data.user.user_metadata.name || "Traveler"
        };
      }
      return null;
    }
    const pending = readPendingVerification();
    if (!pending || pending.email !== validation.email) {
      throw new Error("No pending verification exists for this email.");
    }
    if (Date.now() > pending.expiresAt) {
      throw new Error("Verification code expired. Request a new code.");
    }
    if (pending.code !== token) {
      throw new Error("Verification code is not correct.");
    }
    markEmailVerified(validation.email);
    localStorage.removeItem(PENDING_EMAIL_KEY);
    const user = { id: "demo-user", email: validation.email, name: validation.email.split("@")[0] || "Traveler" };
    writeLocalSession(user);
    return user;
  }

  async function signOut() {
    const sb = getClient();
    if (sb) {
      await sb.auth.signOut();
    }
    writeLocalSession(null);
  }

  async function loadDataset(user) {
    const sb = getClient();
    if (!sb || !user) {
      const local = readLocalDataset();
      if (user && local.profile) {
        local.profile.email = user.email || local.profile.email;
        local.profile.name = user.name || local.profile.name;
      }
      return local;
    }

    const [
      profileResult,
      tripsResult,
      activityCatalogResult
    ] = await Promise.all([
      sb.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      sb.from("trips").select("*").eq("owner_id", user.id).order("start_date"),
      sb.from("activities").select("*")
    ]);

    const failures = [
      profileResult,
      tripsResult,
      activityCatalogResult
    ].filter((result) => result.error);
    if (failures.length) {
      throw failures[0].error;
    }

    const tripIds = (tripsResult.data || []).map((trip) => trip.id);
    let stopsResult = { data: [] };
    let tripActivitiesResult = { data: [] };
    let expensesResult = { data: [] };
    let packingResult = { data: [] };
    let notesResult = { data: [] };

    if (tripIds.length) {
      [
        stopsResult,
        tripActivitiesResult,
        expensesResult,
        packingResult,
        notesResult
      ] = await Promise.all([
        sb.from("trip_stops").select("*").in("trip_id", tripIds),
        sb.from("trip_activities").select("*").in("trip_id", tripIds),
        sb.from("expense_items").select("*").in("trip_id", tripIds),
        sb.from("packing_items").select("*").in("trip_id", tripIds),
        sb.from("trip_notes").select("*").in("trip_id", tripIds).order("created_at", { ascending: false })
      ]);

      const tripDataFailures = [
        stopsResult,
        tripActivitiesResult,
        expensesResult,
        packingResult,
        notesResult
      ].filter((result) => result.error);
      if (tripDataFailures.length) {
        throw tripDataFailures[0].error;
      }
    }

    const profile = profileResult.data || {
      id: user.id,
      name: user.name || "Traveler",
      email: user.email,
      role: "traveler",
      language: "English",
      saved_destinations: []
    };

    return normalizeRows({
      profile: {
        id: profile.id,
        name: profile.name,
        photo: profile.photo || "",
        email: profile.email || user.email,
        role: profile.role || "traveler",
        language: profile.language || "English",
        savedDestinations: profile.saved_destinations || []
      },
      trips: tripsResult.data || [],
      stops: stopsResult.data || [],
      activities: activityCatalogResult.data || [],
      tripActivities: tripActivitiesResult.data || [],
      expenses: expensesResult.data || [],
      packing: packingResult.data || [],
      notes: notesResult.data || []
    });
  }

  async function saveDataset(dataset, user) {
    const sb = getClient();
    if (!sb || !user) {
      writeLocalDataset(dataset);
      return dataset;
    }

    const profile = dataset.profile || {};
    const profileResult = await sb.from("profiles").upsert({
      id: user.id,
      name: profile.name || "Traveler",
      email: user.email,
      photo: profile.photo || "",
      role: profile.role || "traveler",
      language: profile.language || "English",
      saved_destinations: profile.savedDestinations || []
    });
    if (profileResult.error) throw profileResult.error;

    const rows = tripRows(dataset, user.id);
    const deleteResult = await sb.from("trips").delete().eq("owner_id", user.id);
    if (deleteResult.error) throw deleteResult.error;

    if (rows.trips.length) {
      const result = await sb.from("trips").insert(rows.trips);
      if (result.error) throw result.error;
    }
    if (rows.stops.length) {
      const result = await sb.from("trip_stops").insert(rows.stops);
      if (result.error) throw result.error;
    }
    if (rows.tripActivities.length) {
      const result = await sb.from("trip_activities").insert(rows.tripActivities);
      if (result.error) throw result.error;
    }
    if (rows.expenses.length) {
      const result = await sb.from("expense_items").insert(rows.expenses);
      if (result.error) throw result.error;
    }
    if (rows.packing.length) {
      const result = await sb.from("packing_items").insert(rows.packing);
      if (result.error) throw result.error;
    }
    if (rows.notes.length) {
      const result = await sb.from("trip_notes").insert(rows.notes);
      if (result.error) throw result.error;
    }
    return dataset;
  }

  function googleSearchUrl(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function googleDirectionsUrl(stops) {
    const ordered = (stops || []).slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    if (!ordered.length) return "https://www.google.com/maps";
    if (ordered.length === 1) return googleSearchUrl(`${ordered[0].city}, ${ordered[0].country}`);
    const origin = `${ordered[0].city}, ${ordered[0].country}`;
    const destination = `${ordered[ordered.length - 1].city}, ${ordered[ordered.length - 1].country}`;
    const waypoints = ordered.slice(1, -1).map((stop) => `${stop.city}, ${stop.country}`).join("|");
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;
    if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`;
    return url;
  }

  window.TraveloopData = {
    config: {
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      sqlSchema,
      hasSupabaseKeys,
      isSupabaseConfigured: configured,
      waitForSupabase
    },
    uid,
    clone,
    makeInitialDataset,
    auth: {
      validateEmail,
      getSession,
      signIn,
      signUp,
      signOut,
      resetPassword,
      resendVerification,
      verifyEmailCode
    },
    dataset: {
      load: loadDataset,
      save: saveDataset,
      local: readLocalDataset,
      resetLocal: function () {
        const initial = makeInitialDataset();
        writeLocalDataset(initial);
        return initial;
      }
    },
    maps: {
      search: googleSearchUrl,
      directions: googleDirectionsUrl
    }
  };
})();
