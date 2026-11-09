// 축구 소식 모으기: 공개 뉴스 목록(RSS)에서 제목·출처·시간·링크만 가져와 news.json으로 저장해요.
// 기사 본문은 가져오지 않아요(저작권). 누르면 언론사 원문으로 가요. GitHub Actions가 매시간 돌려요.
import fs from 'fs';
const Q = {
  dom: ['K리그', '축구 국가대표', 'K리그2'],
  intl: ['손흥민 OR 이강인 OR 김민재 OR 황희찬', '프리미어리그', '챔피언스리그 OR 라리가 OR 분데스리가'],
};
const url = q => 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + ' when:3d') + '&hl=ko&gl=KR&ceid=KR:ko';
const dec = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>')); return m ? dec(m[1]) : ''; };
async function feed(q) {
  const r = await fetch(url(q), { headers: { 'user-agent': 'fcbro-news/1.0 (+https://gustkd1-star.github.io/fc/)' } });
  if (!r.ok) throw new Error(q + ' ' + r.status);
  const x = await r.text();
  return [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => { const it = m[1]; const s = tag(it, 'source'); let t = tag(it, 'title'); if (s && t.endsWith(' - ' + s)) t = t.slice(0, -(s.length + 3));
    return { t, s, u: tag(it, 'link'), at: new Date(tag(it, 'pubDate')).toISOString() }; }).filter(a => a.t && a.u && !isNaN(Date.parse(a.at)));
}
const out = { updated: new Date().toISOString() };
const old = (() => { try { return JSON.parse(fs.readFileSync(process.argv[2] || 'news.json', 'utf8')); } catch { return {}; } })();
for (const k of Object.keys(Q)) {
  let all = [];
  for (const q of Q[k]) { try { all = all.concat(await feed(q)); } catch (e) { console.error('skip', e.message); } }
  const seen = new Set(); const key = t => t.replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 18);
  all = all.sort((a, b) => b.at.localeCompare(a.at)).filter(a => { const kk = key(a.t); if (seen.has(kk)) return false; seen.add(kk); return true; }).slice(0, 40);
  out[k] = all.length ? all : (old[k] || []);
}
fs.writeFileSync(process.argv[2] || 'news.json', JSON.stringify(out));
console.log('국내', out.dom.length, '해외', out.intl.length);
