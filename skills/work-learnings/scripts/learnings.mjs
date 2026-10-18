#!/usr/bin/env node
// work-learnings — 저장소 안 docs/learnings/ 에 사용자가 배울 교훈을 카테고리별로 기록. 규칙 정본은 ../rules.md.
// node 내장 모듈만 사용한다 (설치 없이 클론 즉시 동작해야 하므로).
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = (readText(path.join(SKILL_DIR, 'rules.md')) ?? '').match(/work-learnings v([\d.]+)/)?.[1] ?? '?';

// 기본 카테고리. 파일명 = id. 새 카테고리는 `category` 로 추가하고 근거를 색인에 남긴다.
const CATEGORIES = [
  ['ui-ux', '화면 배치·인터랙션·접근성·모바일 UX'],
  ['frontend', '프레임워크·상태·렌더링·브라우저 동작'],
  ['backend-api', 'API 설계·인증·에러 계약·서버 런타임'],
  ['data', 'DB·스키마·마이그레이션·쿼리'],
  ['testing', '테스트 전략·재현·회귀'],
  ['devops-ci', '빌드·배포·CI·인프라'],
  ['git', '브랜치·커밋·히스토리 다루기'],
  ['ai-collab', 'AI·에이전트와 일하는 방법'],
  ['architecture', '구조·경계·의존성'],
  ['performance', '측정·최적화'],
  ['security', '보안'],
];
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FIELDS = ['왜', '언제', '출처'];
const FIELD_RE = /^- (왜|언제|출처):\s*(.*)$/;
const TITLE_DASH_RE = /\s[—–]\s/;
const INDEX_MARK = '<!-- work-learnings index — 스크립트가 생성한다. 손으로 고치지 말고 `lint --fix` -->';
const EXTRA_HEADING = '## 추가 카테고리';
const EXTRA_ROW_RE = /^\| `([a-z0-9-]+)` \| (.*?) \| (.*?) \|$/;

// hints: 배움이 숨어 있기 쉬운 곳. 판정이 아니라 AI 가 읽어 볼 단서 목록이다.
// 커밋: 고친·되돌린·다시 짠 커밋. 문서·잡일 커밋은 "원인"·"우회" 같은 말이 들어 있어도 뺀다.
const HINT_COMMIT_RE = /^(?:fix|hotfix|revert|perf|refactor)\b|^Revert "|workaround|우회|되돌림|원인/i;
const HINT_COMMIT_SKIP_RE = /^(?:docs|chore|style|ci|build|test)\b/i;
// 주석: 주석 기호 바로 뒤의 표지(HACK·주의 …), 또는 주석 안 어디든 "왜" 를 적을 때 흔한 말(함정·조용히·깨진다).
const COMMENT_START = '(?:\\/\\/|\\/\\*|<!--|#|^\\s*\\*|^\\s*--)';
const HINT_COMMENT_RE = new RegExp(`${COMMENT_START}\\s*(?:@?(?:HACK|WORKAROUND|XXX|GOTCHA|CAVEAT)\\b|주의|우회|함정)|${COMMENT_START}.*(?:함정|조용히|깨진다|깨짐)`, 'i');
const HINT_SKIP_RE = /(^|\/)(?:\.claude\/skills|skills\/work-learnings|node_modules)\//;
// repo-tickets 의 완료 일감 (`<YYYYMMDD>_<우선순위>_<이름>.md` 또는 에픽 디렉터리)
const DONE_DIR = 'docs/tickets/done';
const DONE_ENTRY_RE = /^\d{8}_\d{3}_[a-z]+-[a-z0-9-]+(\.md)?$/;

// ---------- 공통 ----------

function readText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

function fail(msg) {
  console.error(`오류: ${msg}`);
  process.exit(1);
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) opt[key] = true;
      else { opt[key] = next; i++; }
    } else pos.push(a);
  }
  return { pos, opt };
}

function rel(ctx, p) {
  return path.relative(ctx.root, p) || '.';
}

function oneLine(opt, key) {
  const v = opt[key];
  if (typeof v === 'number') return String(v);
  if (typeof v !== 'string' || !v.trim()) fail(`--${key} 가 필요하다`);
  if (/\n/.test(v)) fail(`--${key} 는 한 줄로`);
  return v.trim();
}

// ---------- 유사 제목 ----------

// 조사·어미는 두 번까지 떼고 비교한다 ("형태로는" = "형태", "확인한다" = "확인"). 양쪽에 똑같이 적용되므로
// 과하게 떼어도("가로" → "가") 같은 낱말끼리는 여전히 같다. 띄어 쓴 조사("Enter 는")는 버린다.
const SUFFIXES = ['에서', '으로', '에게', '까지', '부터', '처럼', '보다', '한다', '하다', '했다', '하기', '하는', '하지',
  '해야', '된다', '되다', '이다', '는다', '은', '는', '이', '가', '을', '를', '에', '로', '의', '도', '와', '과', '만', '지'];
const STOPWORDS = new Set([...SUFFIXES, '중', '시', '때', '것', '수', '등', '및', '더', '후', '전', '안', '말고', '없이', '않는다',
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'is', 'be', 'with', 'when']);

export function normalize(title) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function tokens(title) {
  const out = new Set();
  for (let t of normalize(title).split(' ')) {
    for (let n = 0; n < 2 && /^[가-힣]{2,}$/.test(t); n++) {
      const s = SUFFIXES.find((x) => t.endsWith(x) && t.length > x.length);
      if (!s || STOPWORDS.has(t.slice(0, -s.length))) break; // "가로" 를 조사 "가" 로 만들어 버리지 않는다
      t = t.slice(0, -s.length);
    }
    if (t && !STOPWORDS.has(t)) out.add(t);
  }
  return out;
}

// 겹침 계수: 공통 토큰 / 짧은 쪽 토큰 수. 짧게 고쳐 쓴 제목도 잡도록 합집합이 아니라 짧은 쪽으로 나눈다.
export function similarity(a, b) {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const t of A) if (B.has(t)) shared++;
  return shared < 2 ? 0 : shared / Math.min(A.size, B.size);
}

export const isSimilar = (a, b) => similarity(a, b) >= 0.6;

// ---------- 로딩 ----------

// 색인의 "추가 카테고리" 표에서 [id, 범위, 근거] 를 읽는다.
function extraCategories(ctx) {
  const text = readText(path.join(ctx.dir, 'README.md')) ?? '';
  const at = text.indexOf(`\n${EXTRA_HEADING}\n`);
  if (at < 0) return [];
  const rows = [];
  for (const line of text.slice(at + EXTRA_HEADING.length + 2).split('\n')) {
    if (/^## /.test(line)) break;
    const m = line.match(EXTRA_ROW_RE);
    if (m) rows.push([m[1], m[2], m[3]]);
  }
  return rows;
}

function categories(ctx) {
  return [...CATEGORIES.map(([id, scope]) => ({ id, scope, reason: null })),
    ...extraCategories(ctx).map(([id, scope, reason]) => ({ id, scope, reason }))];
}

// 항목: { category, file, title, line, fields: { 왜: [..], 언제: [..], 출처: [..] } }. 코드 블록 안은 보지 않는다.
function parseItems(category, file, text) {
  const items = [];
  let fence = false;
  let cur = null;
  text.split('\n').forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) return;
    const h = line.match(/^## (.+?)\s*$/);
    if (h) {
      cur = { category, file, title: h[1], line: i + 1, fields: { 왜: [], 언제: [], 출처: [] } };
      items.push(cur);
      return;
    }
    const f = cur && line.match(FIELD_RE);
    if (f) cur.fields[f[1]].push(f[2].trim());
  });
  return items;
}

function load(ctx) {
  const cats = categories(ctx);
  const items = [];
  for (const c of cats) {
    const file = path.join(ctx.dir, `${c.id}.md`);
    const text = readText(file);
    if (text !== null) items.push(...parseItems(c.id, file, text));
  }
  return { cats, items };
}

function requireInit(ctx) {
  if (!fs.existsSync(path.join(ctx.dir, 'README.md'))) fail(`${rel(ctx, ctx.dir)}/README.md 가 없다 — 먼저 \`init\``);
}

// ---------- 색인 ----------

function renderIndex(ctx, cats, items) {
  const rules = path.join(SKILL_DIR, 'rules.md');
  const inside = !path.relative(ctx.root, rules).startsWith('..');
  const where = inside ? `[\`${path.relative(ctx.root, rules)}\`](${path.relative(ctx.dir, rules)})` : '`rules.md`';
  const count = (id) => items.filter((it) => it.category === id).length;
  const lines = [
    INDEX_MARK,
    '# learnings',
    '',
    '작업하며 배운, 다른 프로젝트에서도 통하는 교훈을 카테고리별로 모은다.',
    `기록 규칙은 work-learnings skill 의 ${where} 를 따른다. 이 폴더에 규칙을 따로 적지 않는다.`,
    '',
    '**읽는 법**: 항목 제목(`##`)이 곧 배운 것이다. 제목만 훑고, 필요한 것만 `왜`·`언제` 를 읽는다.',
    '',
  ];
  // 항목이 있는 카테고리만 표로. 나머지는 한 줄 — 표준 목록은 보이되 빈 행으로 시끄럽지 않게.
  const filled = cats.filter((c) => count(c.id));
  if (filled.length) {
    lines.push('| 카테고리 | 범위 | 항목 |', '|---|---|---|',
      ...filled.map((c) => `| [\`${c.id}\`](${c.id}.md) | ${c.scope} | ${count(c.id)} |`), '');
  }
  const empty = cats.filter((c) => !count(c.id));
  if (empty.length) lines.push(`아직 항목이 없는 카테고리: ${empty.map((c) => `\`${c.id}\``).join(' · ')}`, '');
  const extra = cats.filter((c) => c.reason);
  if (extra.length) {
    lines.push(EXTRA_HEADING, '', '기본 카테고리 어디에도 맞지 않는 항목이 3개 이상 쌓여 추가했다.', '',
      '| id | 범위 | 근거 |', '|---|---|---|', ...extra.map((c) => `| \`${c.id}\` | ${c.scope} | ${c.reason} |`), '');
  }
  return lines.join('\n');
}

function writeIndex(ctx, cats, items) {
  fs.writeFileSync(path.join(ctx.dir, 'README.md'), renderIndex(ctx, cats, items));
}

// ---------- 명령 ----------

function cmdInit(ctx) {
  fs.mkdirSync(ctx.dir, { recursive: true });
  const readme = path.join(ctx.dir, 'README.md');
  const text = readText(readme);
  if (text !== null && !text.startsWith(INDEX_MARK)) {
    fail(`${rel(ctx, readme)} 가 이미 있고 work-learnings 색인이 아니다 — 내용을 옮기거나 지운 뒤 다시 \`init\``);
  }
  const { cats, items } = load(ctx);
  writeIndex(ctx, cats, items);
  console.log(`${text === null ? '색인 생성' : '색인 갱신'}: ${rel(ctx, readme)}`);
}

// --stdin: 필드를 JSON 으로 받는다 — 백틱·`${…}` 를 셸 이스케이프 없이 넣을 수 있게.
function readStdinFields(opt) {
  let data;
  try { data = JSON.parse(fs.readFileSync(0, 'utf8')); } catch { fail('--stdin 은 JSON 객체 {"category","title","why","when","source","date"?}'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) fail('--stdin 은 JSON 객체');
  return { ...data, ...Object.fromEntries(Object.entries(opt).filter(([k]) => k !== 'stdin')) };
}

function cmdAdd(ctx, pos, rawOpt) {
  requireInit(ctx);
  const opt = rawOpt.stdin ? readStdinFields(rawOpt) : rawOpt;
  const { cats, items } = load(ctx);
  const category = oneLine(opt, 'category');
  if (!cats.some((c) => c.id === category)) fail(`모르는 카테고리: ${category} — ${cats.map((c) => c.id).join(', ')}`);
  const title = oneLine(opt, 'title');
  if (/[?？]$/.test(title)) fail('제목은 질문형이 아니라 배운 것을 한 줄 규칙으로');
  if (TITLE_DASH_RE.test(title)) fail("제목에 ' — ' 가 있다 — 제안의 '제목 — 왜' 에서 뒤쪽은 --why 로 (제목은 배운 것 하나)");
  const why = oneLine(opt, 'why');
  const when = oneLine(opt, 'when');
  const source = oneLine(opt, 'source');
  const date = typeof opt.date === 'string' ? opt.date : today();
  if (!DATE_RE.test(date)) fail('--date 는 YYYY-MM-DD');

  const same = items.find((it) => normalize(it.title) === normalize(title));
  if (same) fail(`같은 제목이 이미 있다: ${rel(ctx, same.file)}:${same.line} — 새로 쓰지 말고 그 항목을 갱신하라`);
  const near = items.filter((it) => isSimilar(it.title, title));
  if (near.length && !opt.force) {
    console.error('비슷한 항목이 있다 — 같은 교훈이면 새로 쓰지 말고 그 항목을 갱신하라 (다른 교훈이면 --force):');
    for (const it of near) console.error(`  ${rel(ctx, it.file)}:${it.line}  ${it.title}`);
    process.exit(1);
  }

  const file = path.join(ctx.dir, `${category}.md`);
  const scope = cats.find((c) => c.id === category).scope;
  let text = readText(file) ?? `# ${category}\n\n> ${scope}\n`;
  if (!text.endsWith('\n')) text += '\n';
  const line = text.split('\n').length + 1;
  text += `\n## ${title}\n\n- 왜: ${why}\n- 언제: ${when}\n- 출처: ${date}, ${source}\n`;
  fs.writeFileSync(file, text);
  writeIndex(ctx, cats, load(ctx).items);
  console.log(`기록: ${rel(ctx, file)}:${line}  ${title}`);
}

function cmdCategory(ctx, pos, opt) {
  requireInit(ctx);
  const [id] = pos;
  if (!id || !ID_RE.test(id)) fail('id 형식은 영문 소문자·숫자·하이픈 (예: mobile)');
  const scope = oneLine(opt, 'scope');
  const reason = oneLine(opt, 'reason');
  if (/\|/.test(scope + reason)) fail('--scope·--reason 에 | 는 쓸 수 없다');
  const { cats, items } = load(ctx);
  if (cats.some((c) => c.id === id)) fail(`이미 있는 카테고리: ${id}`);
  writeIndex(ctx, [...cats, { id, scope, reason }], items);
  console.log(`카테고리 추가: ${id} — 색인에 근거를 남겼다`);
}

function cmdList(ctx, pos) {
  requireInit(ctx);
  const { cats, items } = load(ctx);
  const [only] = pos;
  if (only && !cats.some((c) => c.id === only)) fail(`모르는 카테고리: ${only}`);
  for (const c of cats) {
    if (only && c.id !== only) continue;
    const mine = items.filter((it) => it.category === c.id);
    if (!mine.length && !only) continue;
    console.log(`\n${c.id} (${mine.length})`);
    for (const it of mine) console.log(`  - ${it.title}`);
  }
  if (!items.length) console.log('\n아직 기록이 없다.');
}

function cmdLint(ctx, pos, opt) {
  requireInit(ctx);
  const { cats, items } = load(ctx);
  const problems = [];
  const add = (level, where, msg) => problems.push({ level, where, msg });
  const at = (it) => `${rel(ctx, it.file)}:${it.line}`;

  const known = new Set(['README.md', ...cats.map((c) => `${c.id}.md`)]);
  for (const ent of fs.readdirSync(ctx.dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    const where = rel(ctx, path.join(ctx.dir, ent.name));
    if (ent.isDirectory()) add('warn', where, '하위 폴더는 보지 않는다 — 카테고리는 파일 하나');
    else if (!known.has(ent.name)) add('error', where, '모르는 카테고리 파일 — 기본 카테고리로 옮기거나 `category` 로 추가');
  }

  items.forEach((it, i) => {
    for (const f of FIELDS) if (!it.fields[f].some(Boolean)) add('error', at(it), `'${f}' 없음`);
    for (const s of it.fields.출처) {
      if (s && !DATE_RE.test(s.split(',')[0].trim())) add('error', at(it), `출처는 날짜로 시작한다 — '- 출처: YYYY-MM-DD, …' ('${s}')`);
    }
    if (/[?？]$/.test(it.title)) add('warn', at(it), '질문형 제목 — 배운 것을 한 줄 규칙으로');
    if (TITLE_DASH_RE.test(it.title)) add('warn', at(it), "제목에 ' — ' — 이유·조건은 '왜'·'언제' 로 옮기고 제목은 배운 것 하나로");
    for (const prev of items.slice(0, i)) {
      if (normalize(prev.title) === normalize(it.title)) add('error', at(it), `같은 제목: ${at(prev)} — 한 항목으로 합친다`);
      else if (isSimilar(prev.title, it.title)) add('warn', at(it), `비슷한 제목: ${at(prev)} '${prev.title}' — 같은 교훈이면 합친다`);
    }
  });

  const readme = path.join(ctx.dir, 'README.md');
  if (readText(readme) !== renderIndex(ctx, cats, items)) {
    if (opt.fix) {
      writeIndex(ctx, cats, items);
      console.log(`색인 갱신: ${rel(ctx, readme)}`);
    } else add('error', rel(ctx, readme), '색인이 항목과 다르다 — `lint --fix`');
  }

  const errors = problems.filter((p) => p.level === 'error');
  const warns = problems.filter((p) => p.level === 'warn');
  for (const p of [...errors, ...warns]) console.log(`${p.level === 'error' ? '✗' : '!'} ${p.where}  ${p.msg}`);
  console.log(`\nwork-learnings v${VERSION} lint (${rel(ctx, ctx.dir)}, 항목 ${items.length}개): 오류 ${errors.length}, 경고 ${warns.length}`);
  if (errors.length) process.exit(1);
}

function cmdHints(ctx, pos, opt) {
  const limit = opt.limit === undefined ? 30 : Number(opt.limit);
  if (!Number.isInteger(limit) || limit < 1) fail('--limit 은 1 이상의 정수');
  const git = (...args) => {
    try { return execFileSync('git', ['-C', ctx.root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 << 20 }); }
    catch { fail('git 저장소에서만 쓸 수 있다'); }
  };

  // 본문에 "왜" 가 적힌 커밋이 가장 좋은 단서다 — 본문 있는 것 먼저(최근 순), 본문 없는 것은 뒤로.
  const since = typeof opt.since === 'string' ? [`--since=${opt.since}`] : [];
  const commits = git('log', ...since, '--date=short', '--format=%x1e%h%x1f%ad%x1f%s%x1f%b').split('\x1e').slice(1)
    .map((rec) => {
      const [hash, date, subject, body = ''] = rec.split('\x1f');
      return { hash, date, subject, bodyLines: body.split('\n').filter((l) => l.trim() && !/^[\w-]+: .+@/.test(l)).length };
    })
    .filter((c) => HINT_COMMIT_RE.test(c.subject) && !HINT_COMMIT_SKIP_RE.test(c.subject));
  const picked = [...commits.filter((c) => c.bodyLines), ...commits.filter((c) => !c.bodyLines)].slice(0, limit);
  console.log(`\n고친·되돌린 커밋 (${picked.length}) — 본문 있는 것 먼저, \`git show <해시>\` 로 "왜" 를 읽는다`);
  for (const c of picked) console.log(`  ${c.hash}  ${c.date}  ${c.subject}${c.bodyLines ? `  (본문 ${c.bodyLines}줄)` : ''}`);

  const learnings = rel(ctx, ctx.dir);
  const comments = [];
  for (const f of git('ls-files').split('\n')) {
    if (comments.length >= limit) break;
    if (!f || HINT_SKIP_RE.test(f) || f.startsWith(`${learnings}/`)) continue;
    const abs = path.join(ctx.root, f);
    try { if (fs.statSync(abs).size > 1 << 20) continue; } catch { continue; }
    const text = readText(abs);
    if (!text || text.includes('\0')) continue;
    text.split('\n').forEach((line, i) => {
      if (comments.length < limit && HINT_COMMENT_RE.test(line)) comments.push(`${f}:${i + 1}  ${line.trim().slice(0, 160)}`);
    });
  }
  console.log(`\n주의·우회 주석 (${comments.length})`);
  for (const c of comments) console.log(`  ${c}`);

  // repo-tickets 를 함께 쓰면 완료 일감의 "원인"·진행 로그가 가장 진한 단서다.
  const doneDir = path.join(ctx.root, DONE_DIR);
  if (fs.existsSync(doneDir)) {
    const done = fs.readdirSync(doneDir, { withFileTypes: true })
      .filter((e) => DONE_ENTRY_RE.test(e.name) && e.isDirectory() !== e.name.endsWith('.md'))
      .map((e) => {
        const file = path.join(doneDir, e.name, ...(e.isDirectory() ? ['README.md'] : []));
        return { file, title: (readText(file) ?? '').match(/^# (.+)$/m)?.[1] ?? '' };
      })
      .sort((a, b) => path.relative(doneDir, b.file).localeCompare(path.relative(doneDir, a.file)))
      .slice(0, limit);
    console.log(`\n완료 일감 (${done.length}) — 최근 것부터, "원인"·진행 로그를 읽는다`);
    for (const t of done) console.log(`  ${rel(ctx, t.file)}  ${t.title}`);
  }

  console.log('\n이건 단서일 뿐이다 — 읽어 보고 "다른 프로젝트에서도 통하는" 것만 배울 거리로 제안한다 (rules.md).');
}

// ---------- 진입 ----------

const USAGE = `work-learnings v${VERSION} — docs/learnings/ 배움 기록 (규칙: ${path.join(SKILL_DIR, 'rules.md')})

  init
  add --category <id> --title "<배운 것 한 줄>" --why "<왜>" --when "<언제>" --source "<일감·커밋·작업>" [--date YYYY-MM-DD] [--force]
  add --stdin [--force]    (필드를 JSON 으로: {"category","title","why","when","source","date"?})
  list [<카테고리>]
  lint [--fix]
  category <id> --scope "<범위>" --reason "<근거>"
  hints [--limit N] [--since <날짜|"6 months ago">]

공통 옵션: --root <저장소 루트> (기본: 현재 디렉터리), --dir <learnings 폴더> (기본: docs/learnings)`;

function main() {
  const { pos, opt } = parseArgs(process.argv.slice(2));
  const [cmd, ...args] = pos;
  const root = path.resolve(typeof opt.root === 'string' ? opt.root : process.cwd());
  const ctx = { root, dir: path.resolve(root, typeof opt.dir === 'string' ? opt.dir : 'docs/learnings') };
  const COMMANDS = { init: cmdInit, add: cmdAdd, list: cmdList, lint: cmdLint, category: cmdCategory, hints: cmdHints };
  if (!cmd || cmd === 'help' || opt.help) console.log(USAGE);
  else if (!COMMANDS[cmd]) fail(`모르는 명령: ${cmd}\n\n${USAGE}`);
  else COMMANDS[cmd](ctx, args, opt);
}

// 테스트가 판정 함수를 import 할 때는 실행하지 않는다.
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main();
