/**
 * Hub data for all 9 United Airlines hub pages.
 * Two design variants: 'full' (domestic hubs) and 'compact' (NRT, GUM).
 */

export const hubOrder = ['ord', 'den', 'iah', 'ewr', 'sfo', 'iad', 'lax', 'nrt', 'gum'];

export const hubNavLabels = {
  ord: 'ORD · Chicago',
  den: 'DEN · Denver',
  iah: 'IAH · Houston',
  ewr: 'EWR · Newark',
  sfo: 'SFO · San Francisco',
  iad: 'IAD · Washington',
  lax: 'LAX · Los Angeles',
  nrt: 'NRT · Tokyo',
  gum: 'GUM · Guam',
};

export const hubs = {

// ─── ORD ────────────────────────────────────────────────────────────────
ord: {
  iata: 'ORD',
  variant: 'full',
  title: 'United Airlines ORD Hub Status — Chicago O\'Hare Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Chicago O\'Hare (ORD). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s largest hub — updated every 30 seconds.',
  keywords: 'United Airlines ORD delays, United Chicago O\'Hare hub status, United Airlines ORD on-time, United ORD cancellations today, United Airlines Chicago delays, ORD flight status, United hub Chicago, United Airlines O\'Hare departures',
  ogTitle: 'United Airlines ORD Hub — Live Chicago O\'Hare Status',
  ogDescription: 'Real-time United Airlines operations at Chicago O\'Hare. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines ORD Hub Status',
  twitterTitle: 'United Airlines ORD Hub — Live Chicago O\'Hare Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s largest hub. Updated every 30 seconds.',
  breadcrumbName: 'ORD — Chicago O\'Hare',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at ORD today?',
      answer: 'The Blue Board tracks every United Airlines flight at Chicago O\'Hare in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What terminal is United Airlines at O\'Hare?',
      answer: 'United Airlines operates primarily out of Terminal 1 (Concourses B and C) at Chicago O\'Hare International Airport. United Club lounges are located in both concourses. United Express regional flights also depart from Terminal 2 (Concourse E and F).',
    },
    {
      question: 'How many United flights depart from ORD daily?',
      answer: 'United Airlines operates approximately 750 daily departures from Chicago O\'Hare, making it United\'s largest hub by flight volume. ORD connects to over 200 domestic and international destinations.',
    },
    {
      question: 'Which United planes at ORD have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. ORD-based narrowbody aircraft (737 MAX, A321neo) are among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at ORD for United?',
      answer: 'Chicago O\'Hare is susceptible to weather-related delays year-round — thunderstorms and wind shear in summer, snow and ice in winter. ORD\'s parallel runway configuration can reduce capacity in low-visibility conditions. Ground delay programs (GDPs) and ground stops issued by the FAA are common during severe weather, and ripple effects from East Coast congestion (especially EWR and JFK) frequently impact ORD operations.',
    },
  ],
  airportSchema: {
    name: 'Chicago O\'Hare International Airport',
    iataCode: 'ORD',
    addressLocality: 'Chicago',
    addressRegion: 'IL',
    addressCountry: 'US',
    latitude: 41.9742,
    longitude: -87.9073,
    url: 'https://www.flychicago.com/ohare',
  },
  headerTitle: 'United Airlines at <span class="iata">ORD</span> — Chicago O\'Hare',
  subtitle: 'United\'s largest hub · ~750 daily departures · Terminal 1 (B & C) · Terminal 2 (Express)',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at ORD in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=ord" style="margin:0">🗺️ Live ORD Map</a>
      <a class="cta" href="/?tab=schedule&hub=ord" style="margin:0">📋 ORD Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=ord" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>Chicago O'Hare International Airport is <strong>United Airlines' largest hub</strong> and the backbone of its domestic network. With approximately 750 daily departures, ORD connects to over 200 destinations across the United States, Canada, Europe, Asia, and Latin America.</p>
    <p>United operates primarily from <strong>Terminal 1</strong>, occupying Concourses B and C, with United Club lounges in both concourses (Concourse B mezzanine near B6, Concourse C near C16) and a <strong>United Polaris lounge</strong> on Concourse B near gate B6 for premium international travelers. United Express regional partners (Air Wisconsin, GoJet, Mesa, Republic, SkyWest) operate from Terminal 2, Concourses E and F.</p>

    <div class="highlight-box">
      <strong>ORD by the numbers:</strong> ~750 daily departures · 200+ destinations · 2 terminals · 8 runways (most in the world) · Chicago hub since 1927 (originally Midway); O'Hare operations began ~1955 · United's global headquarters
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <span id="construction"></span><strong>⚠️ Construction Alert:</strong> The <a href="https://www.flychicago.com/ohare21" target="_blank" rel="noopener noreferrer">O'Hare 21 Global Terminal</a> project is actively under construction, replacing Terminal 2 with a unified check-in facility (est. completion ~2028-2030). Terminal 5 satellite concourse expansion is also underway. Expect construction impacts on ground transportation and terminal access.
    </div>

    <h3>Key Routes from ORD</h3>
    <ul>
      <li><strong>Domestic:</strong> SFO, LAX, DEN, EWR, IAD, IAH — all major United hub connections</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, CDG, MUC, FCO, DUB, ZRH</li>
      <li><strong>Pacific:</strong> NRT, HND, ICN, DEL — nonstop widebody service</li>
      <li><strong>Latin America:</strong> CUN, GDL, SJD, PTY</li>
      <li><strong>Pacific:</strong> NRT, HND, ICN, PVG (seasonal adjustments apply)</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at ORD</h2>
    <p>O'Hare is one of the most delay-prone airports in the United States due to its geography and traffic volume. Understanding typical disruption patterns helps set expectations:</p>

    <h3>Summer (Jun–Aug)</h3>
    <p>Thunderstorms and convective weather are the primary driver of delays. Ground delay programs (GDPs) and ground stops can cascade across the network. Afternoon and evening departures are most affected.</p>

    <h3>Winter (Dec–Feb)</h3>
    <p>Snow, ice, and low-visibility conditions reduce runway capacity. De-icing operations add 15–30 minutes to departure times. ORD's parallel runway configuration is particularly sensitive to crosswinds during winter storms.</p>

    <h3>Year-Round</h3>
    <p>East Coast congestion — especially at Newark (EWR) and JFK — frequently ripples westward, causing inbound delays at ORD. Late-evening flights are often affected by cumulative delays from earlier in the day.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Morning departures (before 10 AM) consistently have the best on-time performance at ORD. If you have flexibility, book early.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at ORD</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. ORD-based narrowbody aircraft, including 737 MAX 8, 737 MAX 9, and A321neo, are among the first aircraft types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at ORD today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=ord">open ORD on The Blue Board</a> to see every flight in real time.</p>

    <h3>What terminal is United at O'Hare?</h3>
    <p>United mainline flights operate from Terminal 1 (Concourses B and C). United Express regional flights use Terminal 2 (Concourses E and F). Both terminals have United Club lounges and are connected airside via the underground tunnel.</p>

    <h3>How many United flights depart from ORD daily?</h3>
    <p>Approximately 750 daily departures, making ORD United's busiest hub by flight volume — ahead of Denver (DEN) and Houston (IAH).</p>

    <h3>Which United planes at ORD have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── DEN ────────────────────────────────────────────────────────────────
den: {
  iata: 'DEN',
  variant: 'full',
  title: 'United Airlines DEN Hub Status — Denver International Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Denver International (DEN). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s second-largest hub — updated every 30 seconds.',
  keywords: 'United Airlines DEN delays, United Denver hub status, United Airlines DEN on-time, United DEN cancellations today, United Airlines Denver delays, DEN flight status, United hub Denver, United Airlines Denver departures',
  ogTitle: 'United Airlines DEN Hub — Live Denver International Status',
  ogDescription: 'Real-time United Airlines operations at Denver International. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines DEN Hub Status',
  twitterTitle: 'United Airlines DEN Hub — Live Denver International Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s second-largest hub. Updated every 30 seconds.',
  breadcrumbName: 'DEN — Denver',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at DEN today?',
      answer: 'The Blue Board tracks every United Airlines flight at Denver International in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What concourse is United Airlines at Denver?',
      answer: 'United Airlines operates primarily from Concourse B at Denver International Airport, which is the largest concourse at DEN. United Club lounges are located on Concourse B at gates B32 and B44. United Express regional flights also depart from Concourse B.',
    },
    {
      question: 'How many United flights depart from DEN daily?',
      answer: 'United Airlines operates approximately 540 daily departures from Denver International, making it United\'s second-largest hub after Chicago O\'Hare. DEN connects to over 170 domestic and international destinations.',
    },
    {
      question: 'Which United planes at DEN have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. DEN-based narrowbody aircraft (737 MAX, A321neo) are among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at DEN for United?',
      answer: 'Denver International is highly susceptible to winter blizzards and spring snowstorms that can shut down operations for hours. Summer afternoon thunderstorms along the Front Range are another major delay driver. DEN\'s location 25 miles from downtown via Peña Boulevard means ground transportation disruptions during storms can compound airside delays.',
    },
  ],
  airportSchema: {
    name: 'Denver International Airport',
    iataCode: 'DEN',
    addressLocality: 'Denver',
    addressRegion: 'CO',
    addressCountry: 'US',
    latitude: 39.8561,
    longitude: -104.6737,
    url: 'https://www.flydenver.com',
  },
  headerTitle: 'United Airlines at <span class="iata">DEN</span> — Denver International',
  subtitle: 'United\'s second-largest hub · ~540 daily departures · Concourse B',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at DEN in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=den" style="margin:0">🗺️ Live DEN Map</a>
      <a class="cta" href="/?tab=schedule&hub=den" style="margin:0">📋 DEN Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=den" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>Denver International Airport is <strong>United Airlines' second-largest hub</strong> and a critical connecting point for its domestic and mountain west network. With approximately 540 daily departures, DEN connects to over 170 destinations across the United States, Canada, Europe, and Latin America.</p>
    <p>United operates primarily from <strong>Concourse B</strong>, the largest of DEN's three concourses, with United Club lounges at gates B32 and B44. Opened in 1995, DEN is one of the newest major airports in the U.S. and sits 25 miles northeast of downtown Denver via Peña Boulevard.</p>

    <div class="highlight-box">
      <strong>DEN by the numbers:</strong> ~540 daily departures · 170+ destinations · Concourse B · Opened 1995 · 25 miles from downtown via Peña Blvd · 6 runways (longest: 16,000 ft)
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <span id="construction"></span><strong>⚠️ Construction Alert:</strong> The <a href="https://www.flydenver.com/great_hall" target="_blank" rel="noopener noreferrer">Great Hall Renovation</a> at the Jeppesen Terminal continues (budget: $2.1B+). Expect construction impacts in the main terminal including check-in areas and security. Concourse B gate expansion (B-West and B-East) was completed in October 2024.
    </div>

    <h3>Key Routes from DEN</h3>
    <ul>
      <li><strong>Domestic:</strong> ORD, SFO, LAX, EWR, IAH, IAD — all major United hub connections plus extensive mountain west coverage</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, MUC (seasonal)</li>
      <li><strong>Latin America:</strong> CUN, SJD, PVR, LIR</li>
      <li><strong>Mountain West:</strong> Extensive regional network to ski destinations including EGE, HDN, MTJ, JAC, SUN</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at DEN</h2>
    <p>Denver International's Front Range location makes it vulnerable to dramatic and fast-moving weather systems. Understanding typical disruption patterns helps set expectations:</p>

    <h3>Winter (Nov–Mar)</h3>
    <p>Blizzards are the defining delay event at DEN. Major snowstorms can strand thousands of passengers and shut down operations for 12–24 hours. Denver's position on the plains means storms arrive fast with little warning. De-icing operations are extensive, and runway clearing after heavy snow takes time across DEN's six runways.</p>

    <h3>Summer (Jun–Aug)</h3>
    <p>Afternoon thunderstorms along the Front Range build almost daily, producing lightning, hail, and microbursts. These typically develop between 2–7 PM and can trigger ground stops. Morning flights have significantly better on-time performance.</p>

    <h3>Spring (Mar–May)</h3>
    <p>Late-season snowstorms are common and often the heaviest of the year. March and April blizzards regularly disrupt DEN operations. Wind events can also reduce runway capacity.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Morning departures (before 11 AM) consistently have the best on-time performance at DEN. Summer thunderstorms and winter storms both tend to peak in the afternoon and evening.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at DEN</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. DEN-based narrowbody aircraft, including 737 MAX 8, 737 MAX 9, and A321neo, are among the first aircraft types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at DEN today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=den">open DEN on The Blue Board</a> to see every flight in real time.</p>

    <h3>What concourse is United at Denver?</h3>
    <p>United mainline and United Express flights operate from Concourse B, DEN's largest concourse. United Club lounges are located at gates B32 and B44. All concourses are connected to the main terminal via an underground train.</p>

    <h3>How many United flights depart from DEN daily?</h3>
    <p>Approximately 540 daily departures, making DEN United's second-busiest hub after Chicago O'Hare (ORD).</p>

    <h3>Which United planes at DEN have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── IAH ────────────────────────────────────────────────────────────────
iah: {
  iata: 'IAH',
  variant: 'full',
  title: 'United Airlines IAH Hub Status — Houston Intercontinental Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at George Bush Intercontinental Houston (IAH). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s Latin America gateway — updated every 30 seconds.',
  keywords: 'United Airlines IAH delays, United Houston hub status, United Airlines IAH on-time, United IAH cancellations today, United Airlines Houston delays, IAH flight status, United hub Houston, United Airlines Houston departures',
  ogTitle: 'United Airlines IAH Hub — Live Houston Intercontinental Status',
  ogDescription: 'Real-time United Airlines operations at Houston Intercontinental. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines IAH Hub Status',
  twitterTitle: 'United Airlines IAH Hub — Live Houston Intercontinental Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Latin America gateway. Updated every 30 seconds.',
  breadcrumbName: 'IAH — Houston',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at IAH today?',
      answer: 'The Blue Board tracks every United Airlines flight at Houston Intercontinental in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What terminal is United Airlines at Houston IAH?',
      answer: 'United Airlines operates from Terminal C (domestic) and Terminal E (international) at George Bush Intercontinental Airport. United Club lounges are located in both terminals. The Subway people mover connects all terminals. United Express regional flights also depart from Terminal C.',
    },
    {
      question: 'How many United flights depart from IAH daily?',
      answer: 'United Airlines operates approximately 400 daily departures from Houston Intercontinental, making it United\'s primary gateway to Latin America and one of the largest hubs by geographic footprint.',
    },
    {
      question: 'Which United planes at IAH have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. IAH sees both narrowbody and widebody aircraft, with 737 MAX and A321neo among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at IAH for United?',
      answer: 'Houston\'s subtropical climate makes thunderstorms the dominant delay driver, particularly during summer months (May–September). Tropical systems and hurricanes can disrupt operations for days. IAH\'s five runways provide capacity, but convective weather along the Gulf Coast frequently triggers ground delay programs and ground stops.',
    },
  ],
  airportSchema: {
    name: 'George Bush Intercontinental Airport',
    iataCode: 'IAH',
    addressLocality: 'Houston',
    addressRegion: 'TX',
    addressCountry: 'US',
    latitude: 29.9902,
    longitude: -95.3368,
    url: 'https://www.fly2houston.com/iah',
  },
  headerTitle: 'United Airlines at <span class="iata">IAH</span> — Houston Intercontinental',
  subtitle: 'United\'s Latin America gateway · ~400 daily departures · Terminals C & E',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at IAH in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=iah" style="margin:0">🗺️ Live IAH Map</a>
      <a class="cta" href="/?tab=schedule&hub=iah" style="margin:0">📋 IAH Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=iah" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>George Bush Intercontinental Airport is <strong>United Airlines' primary gateway to Latin America</strong> and one of its largest hubs by geographic footprint. With approximately 400 daily departures, IAH connects to over 170 destinations across the Americas, Europe, and beyond.</p>
    <p>United operates from <strong>Terminals B and C</strong> (domestic) and <strong>Terminal E</strong> (international), connected by the Subway automated people mover (formerly TerminaLink). United Club lounges are located in both terminals, including the United Polaris lounge in Terminal E for premium international travelers. United Express regional partners operate from Terminal C.</p>

    <div class="highlight-box">
      <strong>IAH by the numbers:</strong> ~400 daily departures · 170+ destinations · Terminals C & E · 5 runways · United's #1 Latin America hub · Largest hub campus by area (11,000+ acres)
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <span id="construction"></span><strong>⚠️ Construction Alert:</strong> The <strong>Mickey Leland International Terminal</strong> development will expand IAH's international capacity beyond Terminal E. Terminal B/C modernization with gate area improvements and connector upgrades is ongoing. Check <a href="https://www.fly2houston.com/iah" target="_blank" rel="noopener noreferrer">Houston Airports</a> for the latest.
    </div>

    <h3>Key Routes from IAH</h3>
    <ul>
      <li><strong>Domestic:</strong> ORD, DEN, SFO, LAX, EWR, IAD — all major United hub connections plus extensive Texas/Gulf Coast network</li>
      <li><strong>Latin America:</strong> MEX, GDL, CUN, BOG, LIM, GRU, EZE, SCL, PTY, SJO, SAL, GUA — the most extensive Latin American network of any U.S. carrier</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, AMS</li>
      <li><strong>Pacific:</strong> NRT, SYD (via LAX connection)</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at IAH</h2>
    <p>Houston's Gulf Coast location means weather is the dominant factor in IAH delays. Understanding seasonal patterns helps set expectations:</p>

    <h3>Summer (May–Sep)</h3>
    <p>Intense afternoon thunderstorms are nearly daily occurrences in Houston. Convective cells build quickly, producing heavy rain, lightning, and occasional hail. Ground stops and ground delay programs are common between 2–8 PM. The extended summer storm season (May through September) is IAH's most challenging period.</p>

    <h3>Hurricane Season (Jun–Nov)</h3>
    <p>Tropical storms and hurricanes in the Gulf of Mexico can shut down IAH operations for days. Even distant tropical systems can produce sustained rain bands and wind that reduce capacity. Hurricane preparations may trigger preemptive cancellations 24–48 hours before landfall.</p>

    <h3>Winter (Dec–Feb)</h3>
    <p>Rare ice storms and freezing rain events can paralyze operations, as IAH has limited de-icing infrastructure compared to northern hubs. Fog is also common in winter mornings along the Gulf Coast.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Morning departures (before 11 AM) have the best on-time performance at IAH. Summer thunderstorms build in the afternoon, so early flights consistently outperform evening departures.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at IAH</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. IAH-based narrowbody and widebody aircraft, including 737 MAX 8, 737 MAX 9, and A321neo, are among the first aircraft types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at IAH today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=iah">open IAH on The Blue Board</a> to see every flight in real time.</p>

    <h3>What terminal is United at Houston?</h3>
    <p>United domestic flights operate from Terminal C and international flights from Terminal E. Both terminals have United Club lounges. The Subway people mover connects all terminals.</p>

    <h3>How many United flights depart from IAH daily?</h3>
    <p>Approximately 400 daily departures, making IAH United's primary Latin American gateway and one of its largest hubs by geographic footprint.</p>

    <h3>Which United planes at IAH have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── EWR ────────────────────────────────────────────────────────────────
ewr: {
  iata: 'EWR',
  variant: 'full',
  title: 'United Airlines EWR Hub Status — Newark Liberty Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Newark Liberty (EWR). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s most delay-prone hub — updated every 30 seconds.',
  keywords: 'United Airlines EWR delays, United Newark hub status, United Airlines EWR on-time, United EWR cancellations today, United Airlines Newark delays, EWR flight status, United hub Newark, United Airlines Newark departures',
  ogTitle: 'United Airlines EWR Hub — Live Newark Liberty Status',
  ogDescription: 'Real-time United Airlines operations at Newark Liberty. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines EWR Hub Status',
  twitterTitle: 'United Airlines EWR Hub — Live Newark Liberty Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s East Coast gateway. Updated every 30 seconds.',
  breadcrumbName: 'EWR — Newark',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at EWR today?',
      answer: 'The Blue Board tracks every United Airlines flight at Newark Liberty in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What terminal is United Airlines at Newark?',
      answer: 'United Airlines operates primarily from Terminal C at Newark Liberty International Airport, with additional flights from the new Terminal A which opened in 2023. United Club lounges are located in Terminal C. Terminal C is United\'s dedicated terminal with over 70 gates.',
    },
    {
      question: 'How many United flights depart from EWR daily?',
      answer: 'United Airlines operates approximately 400 daily departures from Newark Liberty, making it United\'s primary East Coast hub. EWR is the only United hub in the New York metropolitan area and a major transatlantic gateway.',
    },
    {
      question: 'Which United planes at EWR have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. EWR sees a mix of narrowbody and widebody aircraft, with Starlink rolling out across 737 MAX and A321neo first.',
    },
    {
      question: 'What causes the most delays at EWR for United?',
      answer: 'Newark Liberty is consistently the most delay-prone major airport in the United States. Its close proximity to JFK and LaGuardia creates shared airspace congestion. Three intersecting runways limit capacity, and any weather — thunderstorms, fog, wind, snow — immediately triggers ground delay programs. EWR delays ripple across United\'s entire network.',
    },
  ],
  airportSchema: {
    name: 'Newark Liberty International Airport',
    iataCode: 'EWR',
    addressLocality: 'Newark',
    addressRegion: 'NJ',
    addressCountry: 'US',
    latitude: 40.6895,
    longitude: -74.1745,
    url: 'https://www.newarkairport.com',
  },
  headerTitle: 'United Airlines at <span class="iata">EWR</span> — Newark Liberty',
  subtitle: 'United\'s East Coast gateway · ~400 daily departures · Terminal C · New Terminal A',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at EWR in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=ewr" style="margin:0">🗺️ Live EWR Map</a>
      <a class="cta" href="/?tab=schedule&hub=ewr" style="margin:0">📋 EWR Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=ewr" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>Newark Liberty International Airport is <strong>United Airlines' primary East Coast hub</strong> and its most important transatlantic gateway. With approximately 400 daily departures, EWR connects to over 180 destinations and is the only United hub in the New York metropolitan area.</p>
    <p>United operates primarily from <strong>Terminal C</strong>, a dedicated United terminal with over 70 gates and multiple United Club lounges (C74 area, C120 area) and a <strong>United Polaris lounge</strong> near gate C120 for premium international travelers. A United Club is also located in the new Terminal A. The new <strong>Terminal A</strong>, which opened in 2023, also hosts United flights with modern facilities. United Express regional partners operate from both terminals.</p>

    <div class="highlight-box">
      <strong>EWR by the numbers:</strong> ~400 daily departures · 180+ destinations · Terminal C (70+ gates) · New Terminal A (2023) · United's #1 transatlantic hub · Most premium-heavy routes in the network
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <strong>⚠️ Terminal Update:</strong> The new <strong>Terminal A</strong> opened January 2023, replacing the former Terminal A with 33 modern gates. United operates select flights from Terminal A in addition to its main Terminal C operations. Rolling renovations in Terminal C are ongoing with gate area improvements and new lounge spaces.
    </div>

    <h3>Key Routes from EWR</h3>
    <ul>
      <li><strong>Domestic:</strong> ORD, SFO, LAX, DEN, IAH, IAD — all major United hub connections plus Florida, California shuttle routes</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, CDG, MUC, FCO, ZRH, LIS, BCN, DUB, EDI, TLV — the most extensive transatlantic schedule in United's network</li>
      <li><strong>Latin America:</strong> BOG, GRU, EZE, SCL, LIM, CUN, SJU</li>
      <li><strong>Long-haul:</strong> NRT, HND, DEL, BOM, SIN (via select widebody service)</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at EWR</h2>
    <p>Newark Liberty is consistently ranked as <strong>the most delay-prone major airport in the United States</strong>. Its constrained airspace, aging infrastructure, and weather exposure create persistent operational challenges:</p>

    <h3>Airspace Congestion (Year-Round)</h3>
    <p>EWR shares the New York TRACON airspace with JFK and LaGuardia, creating a three-airport bottleneck. Even in clear weather, arrival rates are constrained. Ground delay programs (GDPs) are issued more frequently at EWR than any other U.S. airport.</p>

    <h3>Summer (Jun–Aug)</h3>
    <p>Thunderstorms along the Eastern Seaboard trigger cascading ground stops across all three NYC-area airports simultaneously. Convective weather over the Appalachians can reroute inbound traffic, adding delays even when EWR itself is clear.</p>

    <h3>Winter (Dec–Feb)</h3>
    <p>Nor'easters, ice storms, and heavy snow can shut down EWR for extended periods. Wind shifts between runway configurations reduce capacity. De-icing queues at Terminal C can add 30–60 minutes to departure times.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Early morning departures (before 9 AM) have the best on-time rates at EWR. Delays compound throughout the day, and evening flights are frequently 1–2 hours late. If connecting through EWR, build in extra time.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at EWR</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. EWR sees both narrowbody and widebody aircraft, with 737 MAX 8, 737 MAX 9, and A321neo among the first types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at EWR today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=ewr">open EWR on The Blue Board</a> to see every flight in real time.</p>

    <h3>What terminal is United at Newark?</h3>
    <p>United mainline flights operate primarily from Terminal C, with additional service from the new Terminal A (opened 2023). United Club lounges are located in Terminal C. AirTrain connects all terminals.</p>

    <h3>How many United flights depart from EWR daily?</h3>
    <p>Approximately 400 daily departures, making EWR United's primary East Coast hub and its most important transatlantic gateway.</p>

    <h3>Which United planes at EWR have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── SFO ────────────────────────────────────────────────────────────────
sfo: {
  iata: 'SFO',
  variant: 'full',
  title: 'United Airlines SFO Hub Status — San Francisco Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at San Francisco International (SFO). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s Asia-Pacific gateway — updated every 30 seconds.',
  keywords: 'United Airlines SFO delays, United San Francisco hub status, United Airlines SFO on-time, United SFO cancellations today, United Airlines San Francisco delays, SFO flight status, United hub San Francisco, United Airlines SFO departures',
  ogTitle: 'United Airlines SFO Hub — Live San Francisco International Status',
  ogDescription: 'Real-time United Airlines operations at San Francisco International. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines SFO Hub Status',
  twitterTitle: 'United Airlines SFO Hub — Live San Francisco International Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Asia-Pacific gateway. Updated every 30 seconds.',
  breadcrumbName: 'SFO — San Francisco',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at SFO today?',
      answer: 'The Blue Board tracks every United Airlines flight at San Francisco International in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What terminal is United Airlines at SFO?',
      answer: 'United Airlines domestic flights operate from Terminal 3 at San Francisco International Airport. United international flights use the International Terminal (Terminal G). United Club lounges are located in Terminal 3 (Boarding Area E near gate E4, Boarding Area F near gate F11) and the International Terminal Boarding Area G. United Express regional flights depart from Terminal 3.',
    },
    {
      question: 'How many United flights depart from SFO daily?',
      answer: 'United Airlines operates approximately 300 daily departures from San Francisco International, making it United\'s primary Asia-Pacific gateway. SFO is located in the heart of Silicon Valley and serves as a critical hub for tech corridor travel.',
    },
    {
      question: 'Which United planes at SFO have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. SFO sees both narrowbody and widebody aircraft, with 737 MAX and A321neo among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at SFO for United?',
      answer: 'Fog is the signature delay driver at SFO. Marine layer fog from the Pacific regularly reduces visibility, forcing SFO to switch from parallel approaches to single-runway operations — cutting arrival capacity in half. Summer fog season (June–August) is paradoxically SFO\'s worst period for delays. SFO\'s closely-spaced parallel runways require visual separation in good weather but can only handle one stream of traffic in low visibility.',
    },
  ],
  airportSchema: {
    name: 'San Francisco International Airport',
    iataCode: 'SFO',
    addressLocality: 'San Francisco',
    addressRegion: 'CA',
    addressCountry: 'US',
    latitude: 37.6213,
    longitude: -122.3790,
    url: 'https://www.flysfo.com',
  },
  headerTitle: 'United Airlines at <span class="iata">SFO</span> — San Francisco International',
  subtitle: 'United\'s Asia-Pacific gateway · ~300 daily departures · Terminal 3 · International Terminal G',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at SFO in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=sfo" style="margin:0">🗺️ Live SFO Map</a>
      <a class="cta" href="/?tab=schedule&hub=sfo" style="margin:0">📋 SFO Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=sfo" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>San Francisco International Airport is <strong>United Airlines' primary Asia-Pacific gateway</strong> and a critical hub for the tech corridor connecting Silicon Valley to the world. With approximately 300 daily departures, SFO connects to over 130 destinations domestically and internationally.</p>
    <p>United domestic flights operate from <strong>Terminal 3</strong>, while international flights use the <strong>International Terminal (Terminal G)</strong>. United Club lounges are located in Terminal 3 (Boarding Area E near gate E4, Boarding Area F near gate F11) and the International Terminal Boarding Area G, including a United Polaris lounge for premium international travelers. United Express regional partners operate from Terminal 3.</p>

    <div class="highlight-box">
      <strong>SFO by the numbers:</strong> ~300 daily departures · 130+ destinations · Terminal 3 + International Terminal G · United's #1 Asia-Pacific hub · Heart of Silicon Valley · Polaris lounge on-site
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-green)">
      <span id="construction"></span><strong>✅ Terminal Update:</strong> Harvey Milk Terminal 1 renovation is complete (serves Southwest, JetBlue, and others). United's Terminal 3 facilities continue to see incremental improvements. SFO AirTrain connects all terminals and the BART station for downtown access.
    </div>

    <h3>Key Routes from SFO</h3>
    <ul>
      <li><strong>Domestic:</strong> ORD, DEN, LAX, EWR, IAH, IAD — all major United hub connections plus extensive West Coast network</li>
      <li><strong>Asia-Pacific:</strong> NRT, HND, ICN, PVG, PEK, SIN, SYD, TPE, BOM, DEL — the most extensive transpacific schedule in United's network</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, CDG, MUC, ZRH, DUB</li>
      <li><strong>Latin America:</strong> CUN, GDL, PVR</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at SFO</h2>
    <p>San Francisco International has a unique delay profile driven primarily by fog and runway configuration. Understanding these patterns is essential for SFO travelers:</p>

    <h3>Fog Season (Jun–Aug)</h3>
    <p>Paradoxically, summer is SFO's worst season for delays. Marine layer fog rolls in from the Pacific, reducing visibility and forcing SFO to switch from dual parallel approaches to single-runway operations. This cuts arrival capacity roughly in half and triggers ground delay programs that ripple across the network. Fog is typically worst in the morning and evening.</p>

    <h3>Winter (Nov–Feb)</h3>
    <p>Pacific storm systems bring rain and low ceilings. While less impactful than fog, sustained rain events reduce approach rates and can cause moderate delays. Atmospheric rivers can produce extended periods of reduced operations.</p>

    <h3>Runway Configuration</h3>
    <p>SFO's closely-spaced parallel runways (28L/28R) are only 750 feet apart — too close for simultaneous independent approaches in instrument conditions. This is the structural reason fog has such an outsized impact on SFO operations compared to other airports.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Midday departures (10 AM–2 PM) often have the best on-time performance at SFO, as morning fog typically burns off by late morning. Early morning and late evening flights are most fog-affected.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at SFO</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. SFO-based narrowbody and widebody aircraft, including 737 MAX 8, 737 MAX 9, and A321neo, are among the first aircraft types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at SFO today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=sfo">open SFO on The Blue Board</a> to see every flight in real time.</p>

    <h3>What terminal is United at SFO?</h3>
    <p>United domestic flights operate from Terminal 3. International flights use the International Terminal (Terminal G). United Club lounges are in both terminals, and a Polaris lounge serves premium international travelers.</p>

    <h3>How many United flights depart from SFO daily?</h3>
    <p>Approximately 300 daily departures, making SFO United's primary Asia-Pacific gateway and a key West Coast hub.</p>

    <h3>Which United planes at SFO have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── IAD ────────────────────────────────────────────────────────────────
iad: {
  iata: 'IAD',
  variant: 'full',
  title: 'United Airlines IAD Hub Status — Washington Dulles Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Washington Dulles (IAD). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s Washington D.C. hub — updated every 30 seconds.',
  keywords: 'United Airlines IAD delays, United Washington Dulles hub status, United Airlines IAD on-time, United IAD cancellations today, United Airlines Dulles delays, IAD flight status, United hub Washington, United Airlines Dulles departures',
  ogTitle: 'United Airlines IAD Hub — Live Washington Dulles Status',
  ogDescription: 'Real-time United Airlines operations at Washington Dulles. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines IAD Hub Status',
  twitterTitle: 'United Airlines IAD Hub — Live Washington Dulles Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Washington D.C. hub. Updated every 30 seconds.',
  breadcrumbName: 'IAD — Washington Dulles',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at IAD today?',
      answer: 'The Blue Board tracks every United Airlines flight at Washington Dulles in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What concourse is United Airlines at Dulles?',
      answer: 'United Airlines operates primarily from Concourses C and D at Washington Dulles International Airport. Concourse C handles domestic flights and Concourse D serves international departures. United Club lounges are located in both concourses. The AeroTrain connects all concourses to the main terminal.',
    },
    {
      question: 'How many United flights depart from IAD daily?',
      answer: 'United Airlines operates approximately 250 daily departures from Washington Dulles, making it United\'s Washington D.C. hub and a significant transatlantic gateway. IAD serves the nation\'s capital and the Dulles technology corridor.',
    },
    {
      question: 'Which United planes at IAD have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. IAD sees both narrowbody and widebody aircraft, with 737 MAX and A321neo among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at IAD for United?',
      answer: 'Washington Dulles experiences delays from summer thunderstorms along the Eastern Seaboard, winter snow and ice events, and low-visibility fog. IAD\'s location in Northern Virginia means it shares weather patterns with the broader D.C. metro area. Ground delay programs issued for the New York TRACON also frequently affect IAD departures heading northbound.',
    },
  ],
  airportSchema: {
    name: 'Washington Dulles International Airport',
    iataCode: 'IAD',
    addressLocality: 'Dulles',
    addressRegion: 'VA',
    addressCountry: 'US',
    latitude: 38.9531,
    longitude: -77.4565,
    url: 'https://www.flydulles.com',
  },
  headerTitle: 'United Airlines at <span class="iata">IAD</span> — Washington Dulles',
  subtitle: 'United\'s Washington D.C. hub · ~250 daily departures · Concourses C & D',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at IAD in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=iad" style="margin:0">🗺️ Live IAD Map</a>
      <a class="cta" href="/?tab=schedule&hub=iad" style="margin:0">📋 IAD Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=iad" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>Washington Dulles International Airport is <strong>United Airlines' Washington D.C. hub</strong> and a significant transatlantic gateway serving the nation's capital. With approximately 250 daily departures, IAD connects to over 120 destinations and serves the government, military, and diplomatic communities.</p>
    <p>United operates from <strong>Concourse C</strong> (domestic) and <strong>Concourse D</strong> (international), connected by the AeroTrain automated people mover. United Club lounges are in both concourses, and a <strong>United Polaris lounge</strong> on Concourse D near gate D30 serves premium international travelers. Designed by Eero Saarinen and opened in 1962, Dulles was famous for its mobile lounges — vehicle-based passenger transport — which have largely been replaced by the AeroTrain. United Express regional partners operate from Concourse C.</p>

    <div class="highlight-box">
      <strong>IAD by the numbers:</strong> ~250 daily departures · 120+ destinations · Concourses C & D · Opened 1962 (Saarinen design) · Silver Line Metro connection · Government/diplomatic hub
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <span id="construction"></span><strong>⚠️ Construction Alert:</strong> Construction of new <strong>Concourse E</strong> (14 gates) is planned to replace temporary facilities and expand international capacity. The <strong>Silver Line Metro</strong> (Phase 2, opened Nov 2022) now connects Dulles directly to downtown DC — a major improvement for ground access.
    </div>

    <h3>Key Routes from IAD</h3>
    <ul>
      <li><strong>Domestic:</strong> ORD, DEN, SFO, LAX, IAH, EWR — all major United hub connections plus extensive East Coast network</li>
      <li><strong>Transatlantic:</strong> LHR, FRA, CDG, MUC, ZRH, AMS, BRU, LIS — strong European network serving diplomatic and business travel</li>
      <li><strong>Middle East/Africa:</strong> ADD, ACC, DOH (codeshare connections)</li>
      <li><strong>Latin America:</strong> CUN, SJU, BOG, PTY</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at IAD</h2>
    <p>Washington Dulles experiences a mix of weather and airspace-related delays common to the mid-Atlantic region. Understanding these patterns helps set expectations:</p>

    <h3>Summer (Jun–Aug)</h3>
    <p>Thunderstorms along the Eastern Seaboard are the primary delay driver. Afternoon convective weather can trigger ground delay programs and ground stops. The D.C. metro area frequently experiences severe weather that impacts IAD, DCA, and BWI simultaneously.</p>

    <h3>Winter (Dec–Feb)</h3>
    <p>Snow, ice, and nor'easters impact IAD operations. While the D.C. area receives moderate snowfall compared to northern cities, even modest accumulations can cause significant disruption due to limited de-icing capacity and regional ground transportation impacts.</p>

    <h3>Airspace Congestion</h3>
    <p>IAD shares the Washington TRACON airspace with Reagan National (DCA) and is affected by flow control measures for the Northeast corridor. Ground delay programs at New York-area airports frequently impact northbound departures from IAD.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Morning departures (before 10 AM) consistently have the best on-time performance at IAD. Afternoon thunderstorms in summer and cascading delays from the Northeast corridor affect later flights.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at IAD</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. IAD-based narrowbody and widebody aircraft, including 737 MAX 8, 737 MAX 9, and A321neo, are among the first aircraft types receiving Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at IAD today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=iad">open IAD on The Blue Board</a> to see every flight in real time.</p>

    <h3>What concourse is United at Dulles?</h3>
    <p>United domestic flights operate from Concourse C and international flights from Concourse D. United Club lounges are in both concourses, and a <strong>United Polaris lounge</strong> on Concourse D near gate D30 serves premium international travelers. The AeroTrain connects all concourses to the main terminal.</p>

    <h3>How many United flights depart from IAD daily?</h3>
    <p>Approximately 250 daily departures, making IAD United's Washington D.C. hub and a key transatlantic gateway.</p>

    <h3>Which United planes at IAD have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── LAX ────────────────────────────────────────────────────────────────
lax: {
  iata: 'LAX',
  variant: 'full',
  title: 'United Airlines LAX Status — Los Angeles Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Los Angeles International (LAX). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s Pacific gateway hub — updated every 30 seconds.',
  keywords: 'United Airlines LAX delays, United Los Angeles status, United Airlines LAX on-time, United LAX cancellations today, United Airlines Los Angeles delays, LAX flight status, United LAX, United Airlines LAX departures',
  ogTitle: 'United Airlines LAX — Live Los Angeles International Status',
  ogDescription: 'Real-time United Airlines operations at Los Angeles International. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines LAX Hub Status',
  twitterTitle: 'United Airlines LAX — Live Los Angeles International Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Pacific gateway. Updated every 30 seconds.',
  breadcrumbName: 'LAX — Los Angeles',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at LAX today?',
      answer: 'The Blue Board tracks every United Airlines flight at Los Angeles International in real time. Check the live status panel above for current delay counts, cancellations, and on-time performance. The dashboard updates every 30 seconds with data from Flightradar24 and FAA sources.',
    },
    {
      question: 'What terminal is United Airlines at LAX?',
      answer: 'United Airlines operates from Terminals 7 and 8 at Los Angeles International Airport. Terminal 7 handles most domestic flights, while Terminal 8 serves additional domestic and some international departures. United Club lounges are located in both terminals. United Express regional flights also depart from Terminals 7 and 8.',
    },
    {
      question: 'How many United flights depart from LAX daily?',
      answer: 'United Airlines operates approximately 200 daily departures from Los Angeles International. While LAX is a hub and Pacific gateway, it is a key Pacific gateway and connects to destinations across the U.S., Asia, Australia, and the Pacific Islands.',
    },
    {
      question: 'Which United planes at LAX have Starlink WiFi?',
      answer: 'United is rolling out Starlink satellite WiFi across its fleet. The Blue Board\'s Fleet tab tracks which aircraft have been equipped — search by tail number or check WiFi status on any tracked flight. LAX sees a mix of narrowbody and widebody United aircraft, with 737 MAX and A321neo among the first to receive Starlink.',
    },
    {
      question: 'What causes the most delays at LAX for United?',
      answer: 'LAX delays are most commonly caused by morning marine layer fog (May Gray / June Gloom) that can reduce visibility and require instrument approaches, reducing runway throughput. LAX\'s complex airspace shared with nearby airports (BUR, SNA, LGB, ONT) creates congestion. Late-night construction on taxiways and runways can also cause delays during early morning hours.',
    },
  ],
  airportSchema: {
    name: 'Los Angeles International Airport',
    iataCode: 'LAX',
    addressLocality: 'Los Angeles',
    addressRegion: 'CA',
    addressCountry: 'US',
    latitude: 33.9425,
    longitude: -118.4081,
    url: 'https://www.flylax.com',
  },
  headerTitle: 'United Airlines at <span class="iata">LAX</span> — Los Angeles International',
  subtitle: 'United\'s Pacific gateway hub · ~200 daily departures · Terminals 7 & 8',
  jumpNav: [
    { href: '#overview', label: 'Overview' },
    { href: '#delay-patterns', label: 'Delay Patterns' },
    { href: '#starlink', label: 'Starlink WiFi' },
    { href: '#construction', label: 'Construction' },
    { href: '#faq', label: 'FAQ' },
    { href: '#all-hubs', label: 'All Hubs' },
  ],
  contentHtml: `
  <!-- Dive Deep -->
  <div class="section">
    <h2>Dive Deep at The Blue Board</h2>
    <p><strong>The Blue Board</strong> is the only real-time operations dashboard built specifically for United Airlines passengers. Live flight tracking, delay alerts, Starlink WiFi status, and IRROPS monitoring, updated in real-time.</p>
    <p>This page gives you the overview — but the real action is on the dashboard. Track every United flight at LAX in real time, set up flight watch alerts, check equipment swaps, and monitor weather radar overlaid on the live map.</p>
    <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px">
      <a class="cta" href="/?hub=lax" style="margin:0">🗺️ Live LAX Map</a>
      <a class="cta" href="/?tab=schedule&hub=lax" style="margin:0">📋 LAX Schedules</a>
      <a class="cta" href="/?tab=fleet&filter=starlink" style="margin:0">📡 Starlink Fleet</a>
      <a class="cta" href="/?tab=irrops&hub=lax" style="margin:0">⚠️ IRROPS Monitor</a>
    </div>
  </div>

  <!-- Hub Overview -->
  <div class="section">
    <h2 id="overview">Hub Overview</h2>
    <p>Los Angeles International Airport is <strong>a key Pacific gateway for United Airlines</strong> and a major focus city on the West Coast. With approximately 200 daily departures, LAX connects to destinations across the U.S., Asia, Australia, and the Pacific Islands. LAX is critical for United's transcontinental and transpacific operations.</p>
    <p>United operates from <strong>Terminals 7 and 8</strong>, located on the south side of the LAX horseshoe. Terminal 7 handles the majority of domestic flights, while Terminal 8 serves additional domestic routes and some international departures. United Club lounges are available in both terminals (Terminal 7 near gate 71, Terminal 8 near gate 80s), plus a <strong>United Polaris lounge</strong> in Terminal 7 near gate 71A for premium international travelers. United Express partners operate from the same terminals.</p>

    <div class="highlight-box">
      <strong>LAX by the numbers:</strong> ~200 daily departures · Terminals 7 & 8 · Pacific gateway hub · Key Pacific gateway · Widebody-heavy route mix · Polaris service to Asia & Australia
    </div>


    <div class="highlight-box" style="border-left-color:var(--ua-yellow)">
      <span id="construction"></span><strong>⚠️ Construction Alert:</strong> The <a href="https://www.flylax.com/lax-people-mover" target="_blank" rel="noopener noreferrer">LAX Automated People Mover (APM)</a> elevated train is under construction with a target 2026 opening, connecting terminals to Metro K Line and the consolidated rental car facility. Expect ongoing construction impacts on ground transportation.
    </div>

    <h3>Key Routes from LAX</h3>
    <ul>
      <li><strong>Domestic:</strong> SFO, ORD, DEN, EWR, IAH, IAD — all major United hub connections plus extensive West Coast network</li>
      <li><strong>Transpacific:</strong> NRT, HND, SYD, MEL, PVG, TPE — United's largest Pacific gateway</li>
      <li><strong>Transatlantic:</strong> LHR (year-round widebody service)</li>
      <li><strong>Latin America:</strong> CUN, GDL, PVR, SJD, MEX</li>
      <li><strong>Hawaii:</strong> HNL, OGG, LIH, KOA — multiple daily frequencies</li>
    </ul>
  </div>

  <!-- Delay Patterns -->
  <div class="section">
    <h2 id="delay-patterns">Delay Patterns at LAX</h2>
    <p>LAX benefits from Southern California's generally mild weather but faces unique operational challenges from its complex airspace and marine layer conditions:</p>

    <h3>Marine Layer (May–Jun)</h3>
    <p>"May Gray" and "June Gloom" bring persistent morning fog and low clouds that can reduce visibility below IFR minimums. When marine layer is thick, LAX switches to instrument approaches which reduce throughput from 4 runways to 2, causing cascading delays. Conditions typically burn off by midday.</p>

    <h3>Santa Ana Winds (Oct–Jan)</h3>
    <p>Hot, dry Santa Ana winds can force runway configuration changes and create turbulent approach conditions. While not a major delay driver, they occasionally require go-arounds and diversions, especially for regional jets.</p>

    <h3>Year-Round: Airspace Congestion</h3>
    <p>LAX shares the LA Basin airspace with Burbank (BUR), Long Beach (LGB), Orange County (SNA), and Ontario (ONT). This creates one of the most complex approach corridors in the U.S. Late arrivals from East Coast airports — especially weather-delayed EWR and JFK flights — ripple into LAX evening operations.</p>

    <div class="highlight-box">
      <strong>Tip:</strong> Afternoon departures from LAX typically have the best on-time performance. Morning marine layer affects early flights in May–June, and East Coast ripple effects hit evening departures year-round.
    </div>
  </div>

  <!-- Starlink -->
  <div class="section">
    <h2 id="starlink">Starlink WiFi at LAX</h2>
    <p>United Airlines is actively equipping its fleet with <strong>Starlink satellite internet</strong> — the fastest WiFi ever offered on a commercial airline. LAX sees a diverse mix of United aircraft including widebodies (777, 787 Dreamliner) on Pacific routes and narrowbodies (737 MAX, A321neo) on domestic flights, with the narrowbody fleet among the first to receive Starlink installations.</p>
    <p>Use <a href="/?tab=fleet&filter=starlink">The Blue Board's Fleet tab</a> to check if your specific aircraft has Starlink. You can search by tail number, flight number, or aircraft type.</p>

    <div class="highlight-box">
      <strong>How to check:</strong> Look up your flight on The Blue Board → check the aircraft details panel → look for "Starlink" in the WiFi field. Equipped aircraft show <span style="color:var(--ua-green)">● Starlink</span>.
    </div>
  </div>

  <!-- FAQ (visible, matches schema) -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at LAX today?</h3>
    <p>Check the live status panel at the top of this page for current on-time performance, delay counts, and cancellations. For flight-level detail, <a href="/?hub=lax">open LAX on The Blue Board</a> to see every flight in real time.</p>

    <h3>What terminal is United at LAX?</h3>
    <p>United Airlines operates from Terminals 7 and 8 on the south side of the LAX horseshoe. Both terminals have United Club lounges. Terminals 7 and 8 are connected airside, so you can move between them without re-clearing security.</p>

    <h3>How many United flights depart from LAX daily?</h3>
    <p>Approximately 200 daily departures. LAX is United's key Pacific gateway with widebody service to Asia, Australia, and extensive Hawaii frequencies.</p>

    <h3>Which United planes at LAX have Starlink WiFi?</h3>
    <p>Starlink is being installed on narrowbody aircraft first (737 MAX, A321neo). Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── NRT (compact variant) ─────────────────────────────────────────────
nrt: {
  iata: 'NRT',
  variant: 'compact',
  title: 'United Airlines NRT Hub Status — Tokyo Narita Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Narita International Airport (NRT). Real-time delays, cancellations, on-time performance, Starlink WiFi aircraft, and departure schedules. United\'s primary Japan gateway — updated every 30 seconds.',
  keywords: 'United Airlines NRT delays, United Tokyo Narita hub status, United Airlines NRT on-time, United NRT cancellations today, United Airlines Tokyo Narita delays, NRT flight status, United hub Tokyo Narita, United Airlines NRT departures',
  ogTitle: 'United Airlines NRT Hub — Live Tokyo Narita Status',
  ogDescription: 'Real-time United Airlines operations at Narita International. Delays, cancellations, on-time %, Starlink WiFi fleet, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines NRT Hub Status',
  twitterTitle: 'United Airlines NRT Hub — Live Tokyo Narita Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Japan gateway. Updated every 30 seconds.',
  breadcrumbName: 'NRT — Tokyo Narita',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at NRT today?',
      answer: 'Check The Blue Board for real-time United delay status at Tokyo Narita International Airport. The dashboard shows current on-time performance, cancellations, and ground stops updated every 30 seconds.',
    },
    {
      question: 'What terminal is United Airlines at NRT?',
      answer: 'United Airlines operates from Terminal 1 at Narita International Airport. The United Club lounge is located in the satellite building of Terminal 1.',
    },
    {
      question: 'How many United flights operate from NRT daily?',
      answer: 'United Airlines operates approximately 15-20 daily flights from Tokyo Narita, connecting to major US hubs including SFO, LAX, IAH, ORD, EWR, DEN, and IAD. NRT serves as United\'s primary Japan gateway for transpacific service.',
    },
    {
      question: 'Which United planes at NRT have Starlink WiFi?',
      answer: 'Starlink WiFi is being installed across United\'s widebody fleet. Check the Fleet tab on The Blue Board for specific tail numbers and aircraft with Starlink on NRT routes.',
    },
  ],
  airportSchema: {
    name: 'Narita International Airport',
    iataCode: 'NRT',
    icaoCode: 'RJAA',
    addressLocality: 'Narita',
    addressRegion: 'Chiba',
    addressCountry: 'JP',
    latitude: 35.7720,
    longitude: 140.3929,
    url: 'https://www.narita-airport.jp/en/',
  },
  contentHtml: `
  <h1>✈️ United Airlines at Tokyo Narita (NRT)</h1>
  <div class="subtitle">Live hub status · Updated every 30 seconds · <a href="/">Open Full Dashboard →</a></div>

  <div class="live-bar" style="flex-direction:column;align-items:stretch;gap:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="live-dot"></div>
        <span style="font-size:11px;font-weight:600">LIVE</span>
        <span style="font-size:24px;font-weight:700;color:var(--ua-accent)" id="active">—</span>
        <span style="font-size:11px;color:var(--ua-muted)">active United flights at NRT</span>
      </div>
      <div style="font-size:10px;color:var(--ua-muted)" id="updated-time">Loading...</div>
    </div>
    <div style="font-size:10px;color:var(--ua-muted);border-top:1px solid var(--ua-border);padding-top:8px">ICAO: RJAA · Timezone: JST (UTC+9) · United's primary Japan gateway for transpacific service · Terminal 1</div>
    <a href="/?hub=nrt" style="font-size:11px;color:var(--ua-accent);text-decoration:none;font-weight:600">Open NRT on The Blue Board →</a>
  </div>

  <div class="scroll-hint" id="scrollHint">↓ Scroll for hub details, routes, and FAQ ↓</div>

  <nav class="jump-nav">
    <a href="#overview">Overview</a>
    <a href="#routes">Key Routes</a>
    <a href="#operations">Operations</a>
    <a href="#faq">FAQ</a>
    <a href="#all-hubs">All Hubs</a>
  </nav>

  <!-- Overview -->
  <div class="section">
    <h2 id="overview">NRT Hub Overview</h2>
    <p>Tokyo Narita International Airport is <strong>United Airlines' primary Japan hub</strong> and a critical gateway for transpacific service. United operates approximately 15-20 daily flights connecting NRT to major US hubs including SFO, LAX, IAH, ORD, EWR, DEN, and IAD.</p>
    <p>NRT is one of United's most important international stations, handling a significant portion of the carrier's Asia-Pacific capacity. The airport serves as a connecting point for passengers traveling between North America and destinations across Japan and broader Asia.</p>

    <h3>Terminal & Lounges</h3>
    <ul>
      <li><strong>Terminal:</strong> Terminal 1 (South Wing)</li>
      <li><strong>United Club:</strong> Terminal 1 Satellite, airside</li>
      <li><strong>Polaris Lounge:</strong> Not available at NRT (use United Club)</li>
    </ul>
  </div>

  <!-- Key Routes -->
  <div class="section">
    <h2 id="routes">Key Routes from NRT</h2>
    <ul>
      <li><strong>US Mainland:</strong> SFO, LAX, IAH, ORD, EWR, DEN, IAD (seasonal variation)</li>
      <li><strong>Pacific:</strong> GUM (Guam connection)</li>
      <li><strong>Regional:</strong> Various Star Alliance partner connections throughout Asia</li>
    </ul>
    <p>Most NRT routes are operated by Boeing 777-300ER or 787 Dreamliner aircraft, many with Polaris business class.</p>
  </div>

  <!-- Operations -->
  <div class="section">
    <h2 id="operations">Operations Notes</h2>
    <p>NRT operations are subject to a nighttime curfew (typically 11 PM – 6 AM local time). Typhoon season (June–October) can cause significant disruptions. Winter weather is generally manageable but occasional snow events can impact operations.</p>
    <p>United's NRT schedules are timed for optimal connections to domestic Japanese rail services and partner airline flights across Asia.</p>
  </div>

  <!-- FAQ -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at NRT today?</h3>
    <p>Check <a href="/?tab=weather">the Delays & Weather tab</a> on The Blue Board for real-time NRT delay status, METAR conditions, and FAA advisories.</p>

    <h3>What terminal is United at NRT?</h3>
    <p>United Airlines operates from Terminal 1 at Narita International Airport. The United Club lounge is in the Terminal 1 satellite building.</p>

    <h3>How many United flights operate from NRT daily?</h3>
    <p>Approximately 15-20 daily departures, connecting NRT to United's major US hubs.</p>

    <h3>Which United planes at NRT have Starlink WiFi?</h3>
    <p>Starlink is being installed on widebody aircraft including 777 and 787 frames. Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for the latest count and specific tail numbers.</p>
  </div>`,
},

// ─── GUM (compact variant) ─────────────────────────────────────────────
gum: {
  iata: 'GUM',
  variant: 'compact',
  title: 'United Airlines GUM Hub Status — Guam Delays, On-Time Performance & Flight Tracker',
  description: 'Live United Airlines status at Antonio B. Won Pat International Airport, Guam (GUM). Real-time delays, cancellations, on-time performance, and departure schedules. United\'s Western Pacific hub — updated every 30 seconds.',
  keywords: 'United Airlines GUM delays, United Guam hub status, United Airlines GUM on-time, United GUM cancellations today, United Airlines Guam delays, GUM flight status, United hub Guam, United Airlines GUM departures, United Island Hopper',
  ogTitle: 'United Airlines GUM Hub — Live Guam Status',
  ogDescription: 'Real-time United Airlines operations at Guam International. Delays, cancellations, on-time %, and schedules.',
  ogImageAlt: 'The Blue Board — United Airlines GUM Hub Status',
  twitterTitle: 'United Airlines GUM Hub — Live Guam Status',
  twitterDescription: 'Real-time delays, cancellations, on-time performance at United\'s Western Pacific hub. Updated every 30 seconds.',
  breadcrumbName: 'GUM — Guam',
  faqSchema: [
    {
      question: 'Is United Airlines delayed at GUM today?',
      answer: 'Check The Blue Board for real-time United delay status at Guam International Airport. The dashboard shows current on-time performance, cancellations, and disruptions updated every 30 seconds.',
    },
    {
      question: 'What is the United Island Hopper?',
      answer: 'The United Island Hopper (UA154/UA155) is one of aviation\'s most unique routes — a multi-stop 737 flight connecting Guam to Honolulu via Chuuk, Pohnpei, Kosrae, Kwajalein, and Majuro across Micronesia. It\'s the lifeline air service for these remote Pacific islands.',
    },
    {
      question: 'How many United flights operate from GUM daily?',
      answer: 'United Airlines operates approximately 8-12 daily flights from Guam, including service to NRT (Tokyo Narita), HNL (Honolulu), MNL (Manila), and the famous Island Hopper route through Micronesia. Charter and repositioning flights (like ORD-GUM) also operate seasonally.',
    },
    {
      question: 'Which United planes at GUM have Starlink WiFi?',
      answer: 'Starlink WiFi availability on GUM routes depends on the specific aircraft assigned. Check the Fleet tab on The Blue Board for the latest Starlink-equipped tail numbers.',
    },
  ],
  airportSchema: {
    name: 'Antonio B. Won Pat International Airport',
    iataCode: 'GUM',
    icaoCode: 'PGUM',
    addressLocality: 'Tamuning',
    addressRegion: 'Guam',
    addressCountry: 'GU',
    latitude: 13.4834,
    longitude: 144.7960,
    url: 'https://www.guamairport.com/',
  },
  contentHtml: `
  <h1>✈️ United Airlines at Guam (GUM)</h1>
  <div class="subtitle">Live hub status · Updated every 30 seconds · <a href="/">Open Full Dashboard →</a></div>

  <div class="live-bar" style="flex-direction:column;align-items:stretch;gap:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <div class="live-dot"></div>
        <span style="font-size:11px;font-weight:600">LIVE</span>
        <span style="font-size:24px;font-weight:700;color:var(--ua-accent)" id="active">—</span>
        <span style="font-size:11px;color:var(--ua-muted)">active United flights at GUM</span>
      </div>
      <div style="font-size:10px;color:var(--ua-muted)" id="updated-time">Loading...</div>
    </div>
    <div style="font-size:10px;color:var(--ua-muted);border-top:1px solid var(--ua-border);padding-top:8px">ICAO: PGUM · Timezone: ChST (UTC+10) · United's Western Pacific hub · Home of the Island Hopper</div>
    <a href="/?hub=gum" style="font-size:11px;color:var(--ua-accent);text-decoration:none;font-weight:600">Open GUM on The Blue Board →</a>
  </div>

  <div class="scroll-hint" id="scrollHint">↓ Scroll for hub details, routes, and FAQ ↓</div>

  <nav class="jump-nav">
    <a href="#overview">Overview</a>
    <a href="#routes">Key Routes</a>
    <a href="#island-hopper">Island Hopper</a>
    <a href="#operations">Operations</a>
    <a href="#faq">FAQ</a>
    <a href="#all-hubs">All Hubs</a>
  </nav>

  <!-- Overview -->
  <div class="section">
    <h2 id="overview">GUM Hub Overview</h2>
    <p><strong>Antonio B. Won Pat International Airport</strong> on Guam is United Airlines' Western Pacific hub and one of the most unique stations in the airline's network. United is by far the dominant carrier at GUM, operating the vast majority of flights.</p>
    <p>Guam serves as a critical connecting point between the US mainland, Japan, the Philippines, and the Micronesian islands. United's presence here dates back decades and includes the legendary Island Hopper route.</p>
  </div>

  <!-- Key Routes -->
  <div class="section">
    <h2 id="routes">Key Routes from GUM</h2>
    <ul>
      <li><strong>Japan:</strong> NRT (Tokyo Narita) — primary connection to mainland</li>
      <li><strong>Hawaii:</strong> HNL (Honolulu) — via Island Hopper or direct</li>
      <li><strong>Philippines:</strong> MNL (Manila)</li>
      <li><strong>Micronesia:</strong> ROR (Palau), YAP, TKK (Chuuk), PNI (Pohnpei), KSA (Kosrae) — Island Hopper stops</li>
      <li><strong>Marshall Islands:</strong> KWA (Kwajalein), MAJ (Majuro) — Island Hopper stops</li>
      <li><strong>Charter/Seasonal:</strong> ORD and other CONUS points (repositioning flights)</li>
    </ul>
  </div>

  <!-- Island Hopper -->
  <div class="section">
    <h2 id="island-hopper">🏝️ The Island Hopper</h2>
    <p>The <strong>United Island Hopper</strong> (UA154 westbound / UA155 eastbound) is one of aviation's most legendary routes. A single 737 flies from Honolulu to Guam (or reverse) with up to 6 stops across the remote Pacific:</p>
    <ul>
      <li><strong>HNL</strong> → MAJ (Majuro) → KWA (Kwajalein) → KSA (Kosrae) → PNI (Pohnpei) → TKK (Chuuk) → <strong>GUM</strong></li>
    </ul>
    <p>For many of these islands, United is the <em>only</em> commercial air service connecting them to the outside world. The route is a lifeline for Micronesian communities and a bucket-list flight for aviation enthusiasts.</p>
  </div>

  <!-- Operations -->
  <div class="section">
    <h2 id="operations">Operations Notes</h2>
    <p>GUM operates in Chamorro Standard Time (ChST, UTC+10) with no daylight saving time. Typhoon season runs roughly June through November, with the peak in August–October. Tropical weather can cause significant disruptions.</p>
    <p>The airport has a single main terminal. United's operations are concentrated in the international arrivals/departures area.</p>
  </div>

  <!-- FAQ -->
  <div class="section">
    <h2 id="faq">Frequently Asked Questions</h2>

    <h3>Is United Airlines delayed at GUM today?</h3>
    <p>Check <a href="/?tab=weather">the Delays & Weather tab</a> on The Blue Board for real-time GUM status.</p>

    <h3>What is the United Island Hopper?</h3>
    <p>UA154/UA155 — a multi-stop 737 route connecting Honolulu to Guam via Majuro, Kwajalein, Kosrae, Pohnpei, and Chuuk. One of aviation's most unique flights.</p>

    <h3>How many United flights operate from GUM daily?</h3>
    <p>Approximately 8-12 daily flights, including NRT, HNL, MNL, and Island Hopper service through Micronesia.</p>

    <h3>Which United planes at GUM have Starlink WiFi?</h3>
    <p>Check <a href="/?tab=fleet&filter=starlink">the Fleet tab</a> for Starlink-equipped aircraft on GUM routes.</p>
  </div>`,
},

}; // end hubs
