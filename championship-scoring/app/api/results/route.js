export const runtime = 'edge';

function parseEventPage(html, url) {
  const preMatch = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const text = preMatch
    ? preMatch[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    : html.replace(/<[^>]+>/g, '');

  const lines = text.split('\n');

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

  const hasPoints = lines.some(l => /Finals\s+Points|Finals\s+Points/i.test(l));
  if (!hasPoints) return null;

  const results = [];
  let currentSection = null;

  for (const line of lines) {
    // Handle both formats:
    // "=== Championship Final ===" / "=== Consolation Final ===" / "=== Bonus Final ==="
    // "=== A - Final ===" / "=== B - Final ===" / "=== C - Final ==="
    if (/===.*(?:Championship Final|A\s*-?\s*Final).*===/i.test(line)) {
      currentSection = 'A';
    } else if (/===.*(?:Consolation Final|B\s*-?\s*Final).*===/i.test(line)) {
      currentSection = 'B';
    } else if (/===.*(?:Bonus Final|C\s*-?\s*Final).*===/i.test(line)) {
      currentSection = 'C';
    } else if (/===.*D\s*-?\s*Final.*===/i.test(line)) {
      currentSection = 'D';
    } else if (/===.*Preliminaries.*===/i.test(line)) {
      currentSection = 'prelims';
    } else if (/===.*Time Trial.*===/i.test(line)) {
      currentSection = 'timetrial';
    }

    if (currentSection === 'prelims' || currentSection === 'timetrial') continue;

    // Match result lines: place number at start, points at end
    // Points may be followed by qualifier letters like A, B, or record markers like *, #, !
    // Example: "  1 Kharun, Ilya       JR ASU       44.25    43.77#   32"
    // Example: "  1 Reyna, Alexa       JR ASU       4:19.20  4:09.22A 32"
    const resultMatch = line.match(/^\s*(\d{1,3})\s+(.+?)\s+(\d+)\s*$/);
    if (!resultMatch) continue;

    const place = parseInt(resultMatch[1]);
    const points = parseInt(resultMatch[3]);
    const middle = resultMatch[2].trim();

    if (place < 1 || place > 50 || points < 0 || points > 200) continue;

    let school = null;

    if (isRelay) {
      // Relay: "School Name         1:23.45   1:22.67"
      const timeIdx = middle.search(/\d+:\d{2}\.\d{2}|\d{2}\.\d{2}/);
      if (timeIdx > 0) {
        school = middle.substring(0, timeIdx).trim();
      }
    } else {
      // Individual: "Name, First       JR School Name     1:23.45   1:22.67"
      // Also handle GS (grad student) year code
      const yearMatch = middle.match(/\s(FR|SO|JR|SR|5Y|GR|GS)\s+/);
      if (yearMatch) {
        const afterYear = middle.substring(yearMatch.index + yearMatch[0].length);
        // Time pattern: 1:23.45 or 23.45 — possibly followed by qualifier letters
        const timeIdx = afterYear.search(/\d+:\d{2}\.\d{2}[A-Z*#!]*|\d{2}\.\d{2}[A-Z*#!]*/);
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
  const rankSection = fullText.match(/Team Rankings[\s\S]*$/m);
  if (rankSection) {
    const rankText = rankSection[0];
    while ((rankMatch = rankPattern.exec(rankText)) !== null) {
      rankings.push({ rank: parseInt(rankMatch[1]), team: rankMatch[2].trim(), score: parseFloat(rankMatch[3]) });
    }
  }

  return { eventNum, eventName, isRelay, results, rankings, url };
}

function parseIndexPage(html, baseUrl) {
  // HyTek uses framesets. The main page has frames pointing to evtindex.htm etc.
  // First check if this IS a frameset — if so, extract the frame src URLs
  const frameLinks = [];
  const framePattern = /<frame[^>]+src=["']([^"']+)["']/gi;
  let fm;
  while ((fm = framePattern.exec(html)) !== null) {
    frameLinks.push(fm[1]);
  }

  if (frameLinks.length > 0) {
    // This is a frameset page — return the frame URLs so the client can fetch the event index frame
    return { type: 'frameset', frames: frameLinks.map(f => new URL(f, baseUrl).href) };
  }

  // Not a frameset — parse event links directly
  const links = [];
  const linkPattern = /<a[^>]+href=["']([^"']+\.htm)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, '').trim();
    if (/F\d+\.htm$/i.test(href) || /\d+\.htm$/i.test(href)) {
      const fullUrl = new URL(href, baseUrl).href;
      links.push({ url: fullUrl, text });
    }
  }
  return { type: 'eventlist', links };
}

// Resolve swimmeetresults.tech URLs to their underlying HyTek source
function resolveUrl(url) {
  // swimmeetresults.tech wraps HyTek pages in a JS app
  // The underlying data is usually at a different domain
  // Users should paste the direct HyTek URL instead
  // But we can try common patterns
  return url;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const mode = searchParams.get('mode') || 'event';

  if (!targetUrl) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try { new URL(targetUrl); } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const resolved = resolveUrl(targetUrl);
    const resp = await fetch(resolved, {
      headers: { 'User-Agent': 'ChampionshipScoring/1.0' },
    });

    if (!resp.ok) {
      return Response.json({ error: `Failed to fetch: ${resp.status}. If using swimmeetresults.tech, try the direct HyTek URL instead (check the page source for the underlying results site).` }, { status: 502 });
    }

    const html = await resp.text();

    if (mode === 'index') {
      const result = parseIndexPage(html, resolved);

      if (result.type === 'frameset') {
        // Fetch each frame to find the event list
        let allLinks = [];
        for (const frameUrl of result.frames) {
          try {
            const frameResp = await fetch(frameUrl, { headers: { 'User-Agent': 'ChampionshipScoring/1.0' } });
            if (frameResp.ok) {
              const frameHtml = await frameResp.text();
              const frameResult = parseIndexPage(frameHtml, frameUrl);
              if (frameResult.type === 'eventlist' && frameResult.links.length > 0) {
                allLinks = allLinks.concat(frameResult.links);
              }
            }
          } catch (e) { /* skip failed frame fetches */ }
        }
        return Response.json({ links: allLinks, frames: result.frames }, {
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
        });
      }

      return Response.json({ links: result.links }, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      });
    } else {
      const parsed = parseEventPage(html, resolved);
      return Response.json({ event: parsed }, {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
      });
    }
  } catch (err) {
    return Response.json({ error: `Fetch error: ${err.message}` }, { status: 502 });
  }
}
