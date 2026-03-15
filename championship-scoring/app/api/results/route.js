export const runtime = 'edge';

function parseEventPage(html, url) {
  // Extract the pre-formatted text content from HyTek HTML
  // HyTek pages wrap everything in <pre> tags
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const text = preMatch ? preMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'") : html.replace(/<[^>]+>/g, '');

  const lines = text.split('\n');

  // Detect event header: "Event NN  ..."
  let eventNum = null;
  let eventName = null;
  let isRelay = false;
  let isTimeTrial = false;

  for (const line of lines) {
    const evMatch = line.match(/Event\s+(\d+)\s+(.+)/i);
    if (evMatch) {
      eventNum = parseInt(evMatch[1]);
      eventName = evMatch[2].trim();
      isRelay = /relay/i.test(eventName);
      isTimeTrial = /time\s*trial/i.test(eventName);
      break;
    }
  }

  if (!eventNum || isTimeTrial) return null;

  // Determine if this is a finals or prelims page from the URL and content
  const isPrelims = /P\d+\.htm/i.test(url) || lines.some(l => /^={5,}/.test(l.trim()) && !lines.some(l2 => /Finals\s+Points|Finals Points/i.test(l2)));
  const hasPoints = lines.some(l => /Finals\s+Points|Finals Points/i.test(l));

  if (!hasPoints) return null; // Skip prelims-only pages

  // Parse result lines
  // Individual: "  1 Name, First          JR School         1:23.45   1:22.67   20"
  // Relay: "  1 School Name          1:23.45   1:22.67   40"
  const results = [];
  let currentSection = null;

  for (const line of lines) {
    // Detect section headers
    if (/===.*Championship Final.*===/i.test(line) || /===.*A Final.*===/i.test(line)) {
      currentSection = 'A';
    } else if (/===.*Consolation Final.*===/i.test(line) || /===.*B Final.*===/i.test(line)) {
      currentSection = 'B';
    } else if (/===.*Bonus Final.*===/i.test(line) || /===.*C Final.*===/i.test(line)) {
      currentSection = 'C';
    } else if (/===.*Preliminaries.*===/i.test(line)) {
      currentSection = 'prelims';
    } else if (/===.*Time Trial.*===/i.test(line)) {
      currentSection = 'timetrial';
    }

    if (currentSection === 'prelims' || currentSection === 'timetrial') continue;

    // Match result lines: start with place number, end with points
    // Individual pattern: place, name, year, school, times, points
    // Relay pattern: place, school, times, points
    const resultMatch = line.match(/^\s*(\d{1,3})\s+(.+?)\s+(\d+)\s*$/);
    if (!resultMatch) continue;

    const place = parseInt(resultMatch[1]);
    const points = parseInt(resultMatch[3]);
    const middle = resultMatch[2].trim();

    if (place < 1 || place > 50 || points < 0 || points > 200) continue;

    // Extract school name from the middle section
    // For individual events, school is between the year code and the times
    // For relays, school is the first field
    let school = null;

    if (isRelay) {
      // Relay: "School Name         1:23.45   1:22.67"
      // School ends before the first time pattern
      const timeIdx = middle.search(/\d+:\d{2}\.\d{2}|\d{2}\.\d{2}/);
      if (timeIdx > 0) {
        school = middle.substring(0, timeIdx).trim();
      }
    } else {
      // Individual: "Name, First       JR School Name     1:23.45   1:22.67"
      // Year codes: FR, SO, JR, SR, 5Y
      const yearMatch = middle.match(/\s(FR|SO|JR|SR|5Y|GR)\s+/);
      if (yearMatch) {
        const afterYear = middle.substring(yearMatch.index + yearMatch[0].length);
        const timeIdx = afterYear.search(/\d+:\d{2}\.\d{2}|\d{2}\.\d{2}/);
        if (timeIdx > 0) {
          school = afterYear.substring(0, timeIdx).trim();
        }
      }
    }

    if (school && points >= 0) {
      results.push({ place, school, points, final: currentSection || 'A' });
    }
  }

  // Parse team rankings at bottom
  const rankings = [];
  const rankPattern = /(\d+)\.\s+(.+?)\s{2,}(\d+(?:\.\d+)?)/g;
  let rankMatch;
  const fullText = lines.join('\n');
  const rankSection = fullText.match(/Team Rankings.*?$([\s\S]*?)(?=\n\s*\n\s*\n|\s*$)/m);
  if (rankSection) {
    const rankText = rankSection[0];
    while ((rankMatch = rankPattern.exec(rankText)) !== null) {
      rankings.push({ rank: parseInt(rankMatch[1]), team: rankMatch[2].trim(), score: parseFloat(rankMatch[3]) });
    }
  }

  return {
    eventNum,
    eventName,
    isRelay,
    results,
    rankings,
    url,
  };
}

function parseIndexPage(html, baseUrl) {
  // HyTek index pages list events as links
  // Pattern: <a href="YYMMDDP001.htm">Event 1 ...</a> or similar
  const links = [];
  const linkPattern = /<a[^>]+href=["']([^"']+\.htm)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    // Only include finals pages (F###.htm), skip prelims (P###.htm) unless no finals exist
    if (/F\d+\.htm$/i.test(href) || /\d+\.htm$/i.test(href)) {
      const fullUrl = new URL(href, baseUrl).href;
      links.push({ url: fullUrl, text });
    }
  }
  return links;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const mode = searchParams.get('mode') || 'event'; // 'index' or 'event'

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Basic URL validation
  try {
    new URL(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const resp = await fetch(targetUrl, {
      headers: { 'User-Agent': 'ChampionshipScoring/1.0' },
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: `Failed to fetch: ${resp.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const html = await resp.text();

    if (mode === 'index') {
      const links = parseIndexPage(html, targetUrl);
      return new Response(JSON.stringify({ links }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      });
    } else {
      const parsed = parseEventPage(html, targetUrl);
      return new Response(JSON.stringify({ event: parsed }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: `Fetch error: ${err.message}` }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
