// work-learnings 테스트 — node 내장 node:test 만 사용한다 (`node --test`).
// 유사 제목 판정은 휴리스틱이라, 잡아야 할 쌍(SIMILAR)·잡으면 안 되는 쌍(DISTINCT)을 먼저 적고 맞춘다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { similarity, isSimilar } from '../skills/work-learnings/scripts/learnings.mjs';

const SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../skills/work-learnings/scripts/learnings.mjs');
const L = 'docs/learnings';

function repo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'work-learnings-'));
  git(dir, 'init', '-q');
  commit(dir, 'init');
  return dir;
}

function git(dir, ...args) {
  return execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: dir, encoding: 'utf8' });
}

function commit(dir, msg) {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '--allow-empty', '-m', msg);
}

function run(dir, ...args) {
  const r = spawnSync('node', [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
  return { code: r.status, out: r.stdout + r.stderr };
}

function ok(dir, ...args) {
  const r = run(dir, ...args);
  assert.equal(r.code, 0, r.out);
  return r.out;
}

function write(dir, file, text) {
  fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  fs.writeFileSync(path.join(dir, file), text);
}

const read = (dir, file) => fs.readFileSync(path.join(dir, file), 'utf8');

const CHIPS = '모바일 칩 가로 스크롤은 오른쪽 여백 없이 화면 끝까지 넘긴다';
let seq = 0;
// 필수 필드를 다 채운 add (제목·추가 인자만 바꿔 쓴다)
const add = (dir, title, ...extra) => run(dir, 'add', '--category', 'ui-ux', '--slug', `item-${++seq}`, '--title', title,
  '--why', '왜', '--when', '언제', '--case', '사례', '--apply', '적용', '--source', '작업', ...extra);
const item = (over = {}) => ({ category: 'ui-ux', slug: `item-${++seq}`, title: `제목 ${seq}`, why: 'w', when: 'n', case: '사례', apply: '적용', source: 's', date: '2026-09-26', ...over });
function addStdin(dir, items, ...args) {
  const r = spawnSync('node', [SCRIPT, 'add', '--stdin', ...args], { cwd: dir, encoding: 'utf8', input: JSON.stringify(items) });
  return { code: r.status, out: r.stdout + r.stderr };
}
// 항목 파일 본문 (lint 시험용으로 손으로 쓴 것)
const itemText = ({ title, sources = ['2026-10-18, x'], why = 'a', when = 'b', cases = '사례', apply = '적용' }) =>
  [`# ${title}`, '', ...sources.map((x) => `- 출처: ${x}`), '', '## 요약', '', `- 왜: ${why}`, `- 언제: ${when}`, '',
    '## 사례', '', cases, '', '## 적용', '', apply, ''].join('\n');

// ---------- 유사 제목 판정 ----------

// 같은 교훈을 다르게 쓴 쌍 — 새로 쓰지 말고 기존 항목을 갱신해야 한다.
const SIMILAR = [
  [CHIPS, '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다'],
  [CHIPS, '칩 가로 스크롤은 화면 끝까지, 오른쪽 여백 없이'],
  ['IME 조합 중 Enter 는 keydown 에서 isComposing 을 확인한다', 'keydown 에서 Enter 처리 시 isComposing 확인'],
  ['`git rebase --onto` 로 브랜치 일부만 옮긴다', 'git rebase --onto 로 브랜치의 일부를 옮긴다'],
  ['.gitignore 의 디렉터리/ 형태는 하위 예외가 먹지 않는다', 'gitignore 에서 디렉터리/ 형태로는 하위 예외가 안 먹는다'],
  ['Flaky 테스트는 재시도 말고 원인을 고친다', 'flaky 테스트는 재시도하지 말고 원인을 고친다'],
];

// 단어 몇 개만 겹치는 다른 교훈.
const DISTINCT = [
  [CHIPS, '모바일 탭 바는 화면 하단에 고정한다'],
  [CHIPS, '가로 스크롤 영역에는 스크롤바를 숨기지 않는다'],
  ['테스트는 실패하는 예제부터 쓴다', '테스트 이름에 기대 동작을 쓴다'],
  ['IME 조합 중 Enter 는 keydown 에서 isComposing 을 확인한다', 'Escape 는 keydown 에서 모달을 닫는다'],
  ['git rebase 전에 브랜치를 백업한다', 'git merge 는 fast-forward 만 허용한다'],
  ['API 에러는 코드와 메시지를 분리해 돌려준다', 'API 응답 시간은 p95 로 측정한다'],
];

test('유사 제목: 잡아야 할 쌍', () => {
  const missed = SIMILAR.filter(([a, b]) => !isSimilar(a, b)).map(([a, b]) => `${a} | ${b} (${similarity(a, b).toFixed(2)})`);
  assert.deepEqual(missed, []);
});

test('유사 제목: 잡으면 안 되는 쌍', () => {
  const wrong = DISTINCT.filter(([a, b]) => isSimilar(a, b)).map(([a, b]) => `${a} | ${b} (${similarity(a, b).toFixed(2)})`);
  assert.deepEqual(wrong, []);
});

// ---------- 명령 ----------

test('init → add → list: 카테고리는 폴더, 항목 하나는 파일 하나', () => {
  const d = repo();
  assert.match(ok(d, 'init'), /색인 생성/);
  // 항목이 없는 카테고리는 절을 만들지 않고 한 줄로만
  assert.match(read(d, `${L}/README.md`), /아직 항목이 없는 카테고리: `ui-ux` · `frontend` · /);
  assert.doesNotMatch(read(d, `${L}/README.md`), /^## \[/m);

  ok(d, 'add', '--category', 'ui-ux', '--slug', 'mobile-chip-scroll-edge', '--title', CHIPS,
    '--why', '끝이 잘려 보여야 더 있다는 신호가 된다.', '--when', '모바일 가로 스크롤 목록',
    '--case', '필터 칩 목록에 오른쪽 패딩 16px 을 줬다.\n사용자 테스트에서 칩이 더 있는 줄 몰랐다.',
    '--apply', '가로 스크롤 목록을 디자인 리뷰할 때', '--source', '[[task-mobile-filter-chips]]', '--date', '2026-10-18');
  assert.equal(read(d, `${L}/ui-ux/mobile-chip-scroll-edge.md`), [
    `# ${CHIPS}`, '', '- 출처: 2026-10-18, [[task-mobile-filter-chips]]', '',
    '## 요약', '', '- 왜: 끝이 잘려 보여야 더 있다는 신호가 된다.', '- 언제: 모바일 가로 스크롤 목록', '',
    '## 사례', '', '필터 칩 목록에 오른쪽 패딩 16px 을 줬다.', '사용자 테스트에서 칩이 더 있는 줄 몰랐다.', '',
    '## 적용', '', '가로 스크롤 목록을 디자인 리뷰할 때', ''].join('\n'));
  const index = read(d, `${L}/README.md`);
  assert.match(index, /^## \[`ui-ux`\]\(ui-ux\/\) — 화면 배치.* \(1\)$/m);
  assert.ok(index.includes(`- [${CHIPS}](ui-ux/mobile-chip-scroll-edge.md)`));
  assert.match(index, /아직 항목이 없는 카테고리: `frontend` · /);

  assert.equal(add(d, '터치 영역은 44px 이상으로 잡는다').code, 0);
  assert.match(ok(d, 'list'), /ui-ux \(2\)\n {2}- 모바일 칩.* {2}ui-ux\/mobile-chip-scroll-edge\.md/);
  assert.match(ok(d, 'list', 'ui-ux'), /터치 영역/);
  assert.equal(run(d, 'list', 'nope').code, 1);
  assert.match(ok(d, 'lint'), /work-learnings v[\d.]+ lint .*: 오류 0, 경고 0/);
});

test('add: 비슷한 제목이면 멈추고 --force 로 강행, 같은 제목·슬러그는 거부', () => {
  const d = repo();
  ok(d, 'init');
  assert.equal(add(d, CHIPS, '--slug', 'chips').code, 0); // 뒤의 --slug 가 앞의 자동 슬러그를 덮는다
  const r = add(d, '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다');
  assert.equal(r.code, 1);
  assert.match(r.out, /비슷한 항목/);
  assert.match(r.out, /ui-ux\/chips\.md/);
  assert.equal(add(d, '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다', '--force').code, 0);
  const dup = add(d, `${CHIPS}.`, '--force');
  assert.equal(dup.code, 1);
  assert.match(dup.out, /같은 제목/);
  // 슬러그는 카테고리를 통틀어 하나
  const taken = run(d, 'add', '--category', 'frontend', '--slug', 'chips', '--title', '전혀 다른 교훈', '--why', 'w', '--when', 'n',
    '--case', 'c', '--apply', 'a', '--source', 's');
  assert.equal(taken.code, 1);
  assert.match(taken.out, /슬러그가 이미 있다/);
});

test('add --stdin: 여러 줄 사례·백틱·${…} 를 셸 이스케이프 없이', () => {
  const d = repo();
  ok(d, 'init');
  const it = item({ category: 'data', slug: 'correlated-subquery-qualify', title: '상관 서브쿼리의 외부 컬럼은 `테이블.컬럼` 으로 완전 수식한다',
    why: '`${table.col}` 은 수식 없이 렌더링돼 안쪽 테이블에 조용히 묶인다.', when: 'sql 템플릿 상관 서브쿼리',
    case: '집계가 늘 0 이었다.\n\n```ts\nsql`select count(*) from b where b.a_id = ${a.id}`\n```\n\n`a.id` 가 `id` 로 렌더링됐다.', source: 'abc1234' });
  const r = addStdin(d, it);
  assert.equal(r.code, 0, r.out);
  const body = read(d, `${L}/data/correlated-subquery-qualify.md`);
  assert.ok(body.includes(`## 사례\n\n${it.case}\n\n## 적용`), body);
  assert.ok(body.includes(`- 왜: ${it.why}\n`));
  assert.match(ok(d, 'lint'), /오류 0, 경고 0/); // 사례 안 코드 블록의 `#` 는 절이 아니다
  const r2 = spawnSync('node', [SCRIPT, 'add', '--stdin'], { cwd: d, encoding: 'utf8', input: '{"category":' });
  assert.match(r2.stderr, /JSON/);
});

test('add --stdin: 배열이면 여러 항목을 한 번에, 하나라도 걸리면 아무것도 안 쓴다', () => {
  const d = repo();
  ok(d, 'init');
  let r = addStdin(d, [item({ category: 'git', slug: 'ignore-leading-slash', title: 'ignore 패턴은 슬래시로 시작해야 루트에만 걸린다' }),
    item({ category: 'testing', slug: 'assert-filled-first', title: '비움을 단언하기 전에 채움을 단언한다' })]);
  assert.equal(r.code, 0, r.out);
  assert.ok(fs.existsSync(path.join(d, L, 'git/ignore-leading-slash.md')));
  assert.ok(fs.existsSync(path.join(d, L, 'testing/assert-filled-first.md')));

  r = addStdin(d, [item({ title: CHIPS }), item({ title: '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다' })]);
  assert.equal(r.code, 1);
  assert.match(r.out, /2번 .*비슷한 항목[\s\S]*이번 묶음 1번/);
  assert.ok(!fs.existsSync(path.join(d, L, 'ui-ux')));
  r = addStdin(d, [item(), item({ category: 'nope' })]);
  assert.match(r.out, /2번: 모르는 카테고리/);
  r = addStdin(d, [item({ slug: 'same' }), item({ slug: 'same' })]);
  assert.match(r.out, /2번 슬러그가 이미 있다: 이번 묶음 1번/);
  assert.ok(!fs.existsSync(path.join(d, L, 'ui-ux')));
});

test('add: 입력 검사', () => {
  const d = repo();
  ok(d, 'init');
  const base = ['--why', 'w', '--when', 'n', '--case', 'c', '--apply', 'a', '--source', 's'];
  assert.match(run(d, 'add', '--category', 'nope', '--slug', 'x', '--title', 't', ...base).out, /모르는 카테고리/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--slug', 'Bad_Slug', '--title', 't', ...base).out, /--slug 는 영문/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--title', 't', ...base).out, /--slug 가 필요하다/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--slug', 'x', '--title', 't', '--why', 'w', '--when', 'n', '--apply', 'a', '--source', 's').out, /--case 가 필요하다/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--slug', 'x', '--title', 't', '--why', 'w', '--when', 'n', '--case', 'c', '--source', 's').out, /--apply 가 필요하다/);
  assert.match(add(d, '칩은 끝까지 넘겨야 할까?').out, /질문형/);
  assert.match(add(d, 't', '--date', '2026/10/18').out, /YYYY-MM-DD/);
  assert.match(add(d, '자동 포커스는 마우스 기기에서만 — 안드로이드는 코드 focus() 에도 키보드를 올린다').out, /' — '/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--slug', 'x', '--title', 't', '--why', 'w', '--when', 'n', '--case', 'c', '--apply', 'a',
    '--source', '2026-09-30, 8bc3c37').out, /--date 로/);
});

test('lint: 오류와 경고', () => {
  const d = repo();
  ok(d, 'init');
  write(d, `${L}/ui-ux/missing-fields.md`, '# 필드가 빠진 항목\n\n## 요약\n\n- 왜: 이유\n');
  write(d, `${L}/ui-ux/no-date.md`, itemText({ title: '어제 한 일을 적어 둔다', sources: ['어제 작업'] }));
  write(d, `${L}/ui-ux/chips.md`, itemText({ title: CHIPS }));
  write(d, `${L}/ui-ux/chips-short.md`, itemText({ title: '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다' }));
  write(d, `${L}/ui-ux/question.md`, itemText({ title: '정말 그럴까?' }));
  write(d, `${L}/ui-ux/dash.md`, itemText({ title: '제목에 이유를 붙였다 — 이건 왜 필드로' }));
  write(d, `${L}/ui-ux/double-date.md`, itemText({ title: '출처에 날짜가 두 번 붙은 항목', sources: ['2026-10-18, 2026-09-30, 8bc3c37'] }));
  write(d, `${L}/ui-ux/empty-case.md`, itemText({ title: '사례가 비어 있는 항목', cases: '<!-- 채울 것 -->', apply: '' }));
  write(d, `${L}/ui-ux/code-block.md`, itemText({ title: '코드 블록 안의 제목은 절이 아니다', cases: '```md\n# 가짜 제목\n## 적용\n```' }));
  write(d, `${L}/ui-ux/Bad_Name.md`, itemText({ title: '파일 이름이 슬러그가 아닌 항목' }));
  write(d, `${L}/frontend/chips.md`, itemText({ title: `${CHIPS}.` }));
  write(d, `${L}/random/x.md`, itemText({ title: '모르는 카테고리' }));
  write(d, `${L}/stray.md`, '# 폴더 밖 항목\n');
  write(d, `${L}/testing.md`, '# testing\n\n## 옛 형식 항목\n');

  const r = run(d, 'lint');
  assert.equal(r.code, 1, r.out);
  const has = (re) => assert.match(r.out, re);
  has(/✗ docs\/learnings\/ui-ux\/missing-fields\.md:1 .*'- 출처:' 없음/);
  has(/✗ docs\/learnings\/ui-ux\/missing-fields\.md:1 .*'## 사례' 절 없음/);
  has(/✗ docs\/learnings\/ui-ux\/missing-fields\.md:1 .*'## 적용' 절 없음/);
  has(/✗ docs\/learnings\/ui-ux\/missing-fields\.md:3 .*'- 언제:' 없음/);
  has(/✗ docs\/learnings\/ui-ux\/no-date\.md:3 .*날짜로 시작/);
  // 카테고리 순(기본 목록 순)으로 읽으므로 뒤에 나온 frontend 쪽이 걸린다
  has(/✗ docs\/learnings\/frontend\/chips\.md:1 .*슬러그 중복: docs\/learnings\/ui-ux\/chips\.md/);
  has(/✗ docs\/learnings\/frontend\/chips\.md:1 .*같은 제목: docs\/learnings\/ui-ux\/chips\.md:1/);
  has(/! docs\/learnings\/ui-ux\/chips\.md:1 .*비슷한 제목: docs\/learnings\/ui-ux\/chips-short\.md:1/);
  has(/! docs\/learnings\/ui-ux\/question\.md:1 .*질문형/);
  has(/! docs\/learnings\/ui-ux\/dash\.md:1 .*' — '/);
  has(/! docs\/learnings\/ui-ux\/double-date\.md:3 .*날짜가 둘/);
  has(/! docs\/learnings\/ui-ux\/empty-case\.md:\d+ .*사례가 비어 있다/);
  has(/! docs\/learnings\/ui-ux\/empty-case\.md:\d+ .*적용이 비어 있다/);
  has(/✗ docs\/learnings\/ui-ux\/Bad_Name\.md .*영문 슬러그/);
  has(/✗ docs\/learnings\/random .*모르는 카테고리 폴더/);
  has(/✗ docs\/learnings\/stray\.md .*카테고리 폴더 안에/);
  has(/✗ docs\/learnings\/testing\.md .*옛 형식.*migrate/);
  has(/✗ docs\/learnings\/README\.md .*색인/);
  assert.doesNotMatch(r.out, /code-block\.md/);
});

test('lint --fix: 색인만 고친다', () => {
  const d = repo();
  ok(d, 'init');
  write(d, `${L}/testing/fail-first.md`, itemText({ title: '실패하는 테스트부터 쓴다' }));
  assert.match(run(d, 'lint').out, /색인/);
  assert.match(ok(d, 'lint', '--fix'), /색인 갱신/);
  assert.ok(read(d, `${L}/README.md`).includes('- [실패하는 테스트부터 쓴다](testing/fail-first.md)'));
  assert.match(ok(d, 'lint'), /오류 0, 경고 0/);
});

test('category: 추가 카테고리는 근거와 함께 색인에 남는다', () => {
  const d = repo();
  ok(d, 'init');
  assert.match(run(d, 'category', 'mobile', '--scope', '앱 플랫폼').out, /--reason/);
  assert.match(run(d, 'category', 'ui-ux', '--scope', 's', '--reason', 'r').out, /이미 있는/);
  assert.match(run(d, 'category', 'Mobile App', '--scope', 's', '--reason', 'r').out, /id 형식/);
  ok(d, 'category', 'mobile', '--scope', '앱 플랫폼·빌드·스토어', '--reason', '어디에도 안 맞는 항목 3개 (스토어 심사 등)');
  assert.match(read(d, `${L}/README.md`), /## 추가 카테고리[\s\S]*\| `mobile` \| 앱 플랫폼·빌드·스토어 \| 어디에도 안 맞는 항목 3개/);

  assert.equal(addStdin(d, item({ category: 'mobile', slug: 'store-review-account', title: '스토어 심사 전에 테스트 계정을 준비한다' })).code, 0);
  ok(d, 'lint', '--fix');
  assert.match(read(d, `${L}/README.md`), /^## \[`mobile`\]\(mobile\/\) — 앱 플랫폼·빌드·스토어 \(1\)$/m);
  assert.match(read(d, `${L}/README.md`), /## 추가 카테고리/); // 재생성해도 유지
  assert.match(ok(d, 'lint'), /오류 0, 경고 0/);
});

test('migrate: 옛 형식(카테고리 = 파일)을 카테고리 폴더 + 항목 파일로', () => {
  const d = repo();
  ok(d, 'init');
  write(d, `${L}/ui-ux.md`, [
    '# ui-ux', '', '> 범위', '',
    `## ${CHIPS}`, '', '- 왜: 신호가 된다', '- 언제: 가로 스크롤', '- 출처: 2026-09-26, a1b2c3d', '- 출처: 2026-10-01, 다른 작업', '',
    '## 터치 영역은 44px 이상으로 잡는다', '', '- 왜: 손가락', '- 언제: 버튼', '- 출처: 2026-09-27, b2c3d4e', '',
    '```css', '## 코드 안 제목은 항목이 아니다', '.btn { min-height: 44px; }', '```', '',
  ].join('\n'));
  write(d, `${L}/testing.md`, '# testing\n\n## 실패하는 테스트부터 쓴다\n\n- 왜: a\n- 언제: b\n- 출처: 2026-09-28, c\n');
  assert.match(run(d, 'lint').out, /옛 형식/);
  assert.match(add(d, '새 항목').out, /먼저 `migrate`/);

  // 인자 없이: 슬러그를 채울 JSON 만 출력하고 아무것도 바꾸지 않는다
  const plan = ok(d, 'migrate');
  const json = JSON.parse(plan.slice(plan.indexOf('[')));
  assert.deepEqual(json.map((x) => x.from), ['ui-ux.md:5', 'ui-ux.md:12', 'testing.md:3']);
  assert.ok(json.every((x) => x.slug === '' && x.title));
  assert.ok(fs.existsSync(path.join(d, L, 'ui-ux.md')));

  const slugs = ['mobile-chip-scroll-edge', 'touch-target-44px', 'fail-first'];
  const send = (list) => spawnSync('node', [SCRIPT, 'migrate', '--stdin'], { cwd: d, encoding: 'utf8', input: JSON.stringify(list) });
  let r = send(json.map((x, i) => ({ ...x, slug: i === 2 ? '' : slugs[i] })));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /testing\.md:3 .*슬러그가 없다/);
  assert.ok(fs.existsSync(path.join(d, L, 'ui-ux.md')));

  r = send(json.map((x, i) => ({ ...x, slug: slugs[i] })));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(!fs.existsSync(path.join(d, L, 'ui-ux.md')) && !fs.existsSync(path.join(d, L, 'testing.md')));
  const chips = read(d, `${L}/ui-ux/mobile-chip-scroll-edge.md`);
  assert.ok(chips.startsWith(`# ${CHIPS}\n\n- 출처: 2026-09-26, a1b2c3d\n- 출처: 2026-10-01, 다른 작업\n\n## 요약\n\n- 왜: 신호가 된다\n- 언제: 가로 스크롤\n\n## 사례\n\n<!--`), chips);
  // 필드 아닌 줄(예시 코드)은 사례로 옮긴다
  assert.match(read(d, `${L}/ui-ux/touch-target-44px.md`), /## 사례\n\n```css\n## 코드 안 제목은 항목이 아니다\n\.btn \{ min-height: 44px; \}\n```\n\n## 적용/);
  assert.ok(read(d, `${L}/README.md`).includes('- [실패하는 테스트부터 쓴다](testing/fail-first.md)'));

  const lint = ok(d, 'lint');
  assert.match(lint, /오류 0/);
  assert.match(lint, /mobile-chip-scroll-edge\.md:\d+ .*사례가 비어 있다/);
  assert.doesNotMatch(lint, /touch-target-44px\.md:\d+ .*사례가 비어 있다/);
  assert.match(ok(d, 'migrate'), /옮길 옛 형식 파일이 없다/);
});

test('hints: 배움이 숨어 있기 쉬운 커밋·주석·완료 일감을 나열한다', () => {
  const d = repo();
  write(d, 'src/a.ts', [
    'const x = 1;',
    '// HACK: Safari 는 100vh 에 주소창을 포함한다 — dvh 로 우회',
    '// 주의: 이 순서를 바꾸면 IME 입력이 끊긴다',
    'const todo = "WORKAROUND 라는 단어가 든 문자열이 아니라 주석만 본다";',
    '/* workaround: iOS 에서 click 이 두 번 온다 */',
  ].join('\n'));
  write(d, 'src/c.ts', [
    '// 캐시 키에 locale 을 안 넣으면 **조용히** 다른 언어가 나간다',
    '// 이 값을 바꾸면 마이그레이션이 깨진다',
    '// 함정 이라는 낱말이 주석 중간에 있어도 잡는다',
    'return x; // 그냥 반환한다',
  ].join('\n'));
  write(d, '.claude/skills/other/x.md', '// HACK: 설치본은 보지 않는다');
  write(d, `${L}/ui-ux.md`, '// HACK: 이미 기록한 곳도 보지 않는다');
  write(d, 'docs/tickets/done/20260901_100_bug-old.md', '---\ntype: bug\n---\n\n# 옛 버그\n');
  write(d, 'docs/tickets/done/20260930_200_bug-chip-cut.md', '---\ntype: bug\n---\n\n# 칩 끝이 잘리지 않음\n\n## 원인\n\n여백\n');
  write(d, 'docs/tickets/done/20260920_300_epic-big/README.md', '# 큰 에픽\n');
  write(d, 'docs/tickets/todo/400_task-later.md', '# 아직 안 한 일\n');
  // 주의 문서: 파일 이름, 또는 md 의 주의·함정 제목
  write(d, 'docs/CAVEATS.md', '# Caveats\n\n아무 내용\n');
  write(d, 'README.md', '# 앱\n\n## 주의할 점\n\n## 설치\n');
  write(d, 'docs/guide.md', '# 가이드\n\n### Gotchas\n\n<!-- 주의: md 주석은 주석으로 본다 -->\n');
  write(d, `${L}/README.md`, '## 주의 — learnings 색인은 보지 않는다\n');
  commit(d, 'feat: 화면 추가');
  commit(d, 'fix: 오타');
  git(d, 'commit', '-q', '--allow-empty', '-m', 'fix: 모바일에서 칩 끝이 잘리지 않던 문제', '-m', '오른쪽 여백 때문에 목록이 끝난 것처럼 보였다.\n잘린 끝이 신호다.');
  git(d, 'commit', '-q', '--allow-empty', '-m', 'refactor: 목록 상태 공유', '-m', '진행 중 요청을 무시하면 입력이 조용히 버려진다.');
  commit(d, 'docs: 원인 분석 문서 수정');
  commit(d, 'chore(deps): 우회 패치 제거');
  git(d, 'commit', '-q', '--allow-empty', '-m', 'ci: required check 는 집계 잡 하나에만 건다', '-m', '건너뛴 required 잡은 통과로 안 쳐져 머지가 막혔다.');
  commit(d, 'Revert "feat: 무한 스크롤"');
  // 바뀐 파일이 설정·문서뿐인 fix — 빼지 않고 표시만 (프로젝트 설정 변경일 때가 많다)
  write(d, 'package.json', '{"port": 8787}\n');
  write(d, 'wrangler.toml', 'port = 8787\n');
  git(d, 'add', '-A');
  git(d, 'commit', '-q', '-m', 'fix: 로컬 API 포트를 8787 로 통일', '-m', '포트가 두 군데서 달랐다.');
  write(d, 'src/b.ts', 'export const b = 1;\n');
  write(d, 'docs/b.md', 'b\n');
  git(d, 'add', '-A');
  git(d, 'commit', '-q', '-m', 'fix: 코드가 섞인 수정', '-m', '코드도 바뀌었다.');

  const out = ok(d, 'hints');
  // 본문("왜")이 있는 커밋이 먼저 — 본문 긴 순. 본문 없는 커밋은 따로, 뒤에
  assert.match(out, /본문 있는 커밋 \(5\)/);
  assert.match(out, /본문 없는 커밋 \(1\)/);
  assert.match(out, /Revert 1건 — 제목만으로는 판단할 근거가 없어 따로 셌다/);
  const at = (t) => { const i = out.indexOf(t); assert.ok(i >= 0, `${t}\n${out}`); return i; };
  assert.ok(at('fix: 모바일에서 칩 끝이') < at('refactor: 목록 상태 공유'), out);
  assert.ok(at('refactor: 목록 상태 공유') < at('본문 없는 커밋'), out);
  assert.ok(at('본문 없는 커밋') < at('fix: 오타'), out);
  assert.doesNotMatch(out, /Revert "feat: 무한 스크롤"/);
  // ci: 커밋도 단서다 — CI 함정이 배울 거리인 경우가 많다
  assert.match(out, /ci: required check 는 집계 잡 하나에만 건다/);
  assert.doesNotMatch(out, /feat: 화면 추가|docs: 원인 분석|chore\(deps\)/);
  assert.match(out, /fix: 로컬 API 포트를 8787 로 통일 {2}\(본문 1줄\) \(설정\)/);
  assert.match(out, /fix: 모바일에서 칩 끝이.*\(본문 2줄 · 이유 1\)/);
  assert.match(out, /fix: 코드가 섞인 수정 {2}\(본문 1줄\)\n/);

  assert.match(out, /src\/a\.ts:2 .*HACK: Safari/);
  assert.match(out, /src\/a\.ts:3 .*주의: 이 순서/);
  assert.match(out, /src\/a\.ts:5 .*workaround: iOS/);
  assert.match(out, /src\/c\.ts:1 .*조용히/);
  assert.match(out, /src\/c\.ts:2 .*깨진다/);
  assert.match(out, /src\/c\.ts:3 .*함정/);
  assert.doesNotMatch(out, /src\/a\.ts:4 |src\/c\.ts:4 /);
  assert.doesNotMatch(out, /설치본은|이미 기록한|learnings 색인/);
  assert.match(out, /docs\/guide\.md:5 .*<!-- 주의: md 주석/);

  assert.match(out, /주의 문서 \(3\)/);
  assert.match(out, /\n {2}docs\/CAVEATS\.md\n/);
  assert.match(out, /README\.md:3 {2}## 주의할 점/);
  assert.match(out, /docs\/guide\.md:3 {2}### Gotchas/);
  assert.doesNotMatch(out, /## 설치|README\.md:3 .*\n.*README\.md:3/); // md 제목은 주석 절에 중복으로 나오지 않는다

  // repo-tickets 를 함께 쓰면 완료 일감이 가장 진한 단서다 — 최근 것부터, 제목과 함께
  assert.match(out, /완료 일감 \(3\)/);
  assert.ok(out.indexOf('칩 끝이 잘리지 않음') < out.indexOf('큰 에픽') && out.indexOf('큰 에픽') < out.indexOf('옛 버그'), out);
  assert.match(out, /docs\/tickets\/done\/20260930_200_bug-chip-cut\.md {2}칩 끝이 잘리지 않음/);
  assert.doesNotMatch(out, /아직 안 한 일/);
  assert.match(out, /단서일 뿐/);

  const one = ok(d, 'hints', '--limit', '1');
  // 잘렸으면 (보인 수/전체)
  assert.match(one, /본문 있는 커밋 \(1\/5\)/);
  assert.match(one, /본문 없는 커밋 \(1\)/);
  assert.match(one, /완료 일감 \(1\/3\)/);
  assert.match(ok(d, 'hints', '--since', '2000-01-01'), /fix: 모바일/);
  // 로컬 날짜로 — toISOString 은 UTC 라서 KST 자정~09시에는 "내일" 이 오늘과 같아진다
  const t = new Date(Date.now() + 86400000);
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  assert.match(ok(d, 'hints', '--since', tomorrow), /본문 있는 커밋 \(0\)/);
});

test('hints: 커밋 본문의 잡음은 본문으로 치지 않고, 이유 표현이 많은 본문을 먼저', () => {
  const d = repo();
  const c = (...msgs) => git(d, 'commit', '-q', '--allow-empty', ...msgs.flatMap((m) => ['-m', m]));
  c('Revert "feat: 무한 스크롤"', 'This reverts commit 0123456789abcdef0123456789abcdef01234567.');
  c('hotfix: 설정 변경 (#336)', '* fix: a\n* chore: b\n* feat(ui): c\n- Revert "x"');
  c('fix: 트레일러만 있는 커밋', 'Co-Authored-By: Someone <a@b.c>\nSigned-off-by: X <x@y.z>\n(cherry picked from commit abcdef1)');
  c('refactor: 큰 변경', '한 줄\n두 줄\n세 줄\n네 줄\n다섯 줄');
  c('fix: 짧지만 이유가 있다', '키가 바뀌어서 읽기가 조용히 비었다 — 그래서 테스트가 아무것도 안 해도 통과했다.');
  git(d, 'checkout', '-q', '-b', 'side');
  c('fix: 브랜치 쪽 수정', '본문');
  git(d, 'checkout', '-q', '-');
  git(d, 'merge', '-q', '--no-ff', 'side', '-m', 'fix: 머지 커밋은 보지 않는다', '-m', '머지 본문');

  const out = ok(d, 'hints');
  const body = out.slice(out.indexOf('본문 있는 커밋'), out.indexOf('본문 없는 커밋'));
  const none = out.slice(out.indexOf('본문 없는 커밋'));
  assert.doesNotMatch(out, /Revert "feat: 무한 스크롤"/);
  assert.match(none, /Revert 1건/);
  for (const t of ['hotfix: 설정 변경', 'fix: 트레일러만']) {
    assert.doesNotMatch(body, new RegExp(t.replace(/[()"]/g, '.')), out);
    assert.match(none, new RegExp(t.replace(/[()"]/g, '.')), out);
  }
  // 본문 길이가 먼저다 — 이유 표현은 저장소마다 쓰는 말이 달라("→", "…라서") 동점일 때만 본다
  assert.ok(body.indexOf('refactor: 큰 변경') < body.indexOf('fix: 짧지만 이유가 있다'), out);
  assert.ok(body.indexOf('fix: 짧지만 이유가 있다') < body.indexOf('fix: 브랜치 쪽 수정'), out); // 1줄끼리는 이유 표현 순
  assert.match(body, /fix: 짧지만 이유가 있다 {2}\(본문 1줄 · 이유 2\)/);
  assert.doesNotMatch(out, /머지 커밋은/);
  assert.match(out, /fix: 브랜치 쪽 수정/);
});

test('hints: 바뀐 파일 종류 표시 — CI·빌드 / 설정 / 문서', () => {
  const d = repo();
  const fix = (files, msg) => {
    for (const f of files) write(d, f, `${msg}\n`);
    git(d, 'add', '-A');
    git(d, 'commit', '-q', '-m', msg, '-m', '본문');
  };
  fix(['.github/workflows/ci.yml'], 'fix: CI 만');
  fix(['vite.config.ts', 'package.json'], 'fix: 빌드와 설정');
  fix(['README.md', 'docs/a.txt'], 'fix: 문서 만');
  fix(['src/a.ts', 'README.md'], 'fix: 코드 섞임');
  const out = ok(d, 'hints');
  assert.match(out, /fix: CI 만 {2}\(본문 1줄\) \(CI·빌드\)/);
  assert.match(out, /fix: 빌드와 설정 {2}\(본문 1줄\) \(CI·빌드·설정\)/);
  assert.match(out, /fix: 문서 만 {2}\(본문 1줄\) \(문서\)/);
  assert.match(out, /fix: 코드 섞임 {2}\(본문 1줄\)\n/);
});

test('hints: 주석은 같은 문장 한 번, 파일당 3개, 다른 도구 폴더 제외, 잘리면 전체 수', () => {
  const d = repo();
  write(d, 'a.yml', '# 주의: 같은 문장을 복사한 워크플로\n');
  write(d, 'b.yml', '# 주의: 같은 문장을 복사한 워크플로\n');
  write(d, 'many.ts', ['// 주의: 하나', '// 주의: 둘', '// 주의: 셋', '// 주의: 넷'].join('\n'));
  write(d, '.other-tool/scan.mjs', '// 주의: 다른 도구 설치 폴더');
  write(d, '.github/workflows/x.yml', '# 함정: .github 는 본다\n');
  commit(d, 'add');
  const out = ok(d, 'hints');
  assert.match(out, /a\.yml:1 .*같은 문장을 복사한 워크플로 {2}\(같은 주석 1곳 더\)/);
  assert.doesNotMatch(out, /b\.yml:1/);
  assert.match(out, /many\.ts:3 .*셋/);
  assert.doesNotMatch(out, /many\.ts:4/);
  assert.doesNotMatch(out, /다른 도구 설치 폴더/);
  assert.match(out, /\.github\/workflows\/x\.yml:1/);
  assert.match(out, /주의·우회 주석 \(5\/6\)/);
});

test('hints: 주의 문서 파일은 제목 목록과 함께, 완료 일감은 원인 절이 있는 것 먼저', () => {
  const d = repo();
  write(d, 'docs/TROUBLESHOOTING.md', ['# Troubleshooting', '', '## 빌드가 멈춘다', '', '```md', '## 코드 안 제목', '```', '### 캐시', ''].join('\n'));
  write(d, 'docs/tickets/done/20261001_100_task-new.md', '---\ntype: task\n---\n\n# 최근 일감\n\n본문\n');
  write(d, 'docs/tickets/done/20260901_100_bug-old.md', '---\ntype: bug\n---\n\n# 옛 버그\n\n## 원인\n\n여백\n\n## 재현\n\n1\n');
  commit(d, 'add');
  const out = ok(d, 'hints');
  assert.match(out, /\n {2}docs\/TROUBLESHOOTING\.md\n {6}docs\/TROUBLESHOOTING\.md:3 {2}## 빌드가 멈춘다\n {6}docs\/TROUBLESHOOTING\.md:8 {2}### 캐시\n/);
  assert.doesNotMatch(out, /코드 안 제목/);
  assert.ok(out.indexOf('옛 버그') < out.indexOf('최근 일감'), out);
  assert.match(out, /옛 버그 {2}\(원인 · 재현 · \d+줄\)/);
  assert.match(out, /최근 일감 {2}\(\d+줄\)/);
  assert.match(out, /배울 거리는 0개일 수 있다/);
});

test('hints: 본문 없는 커밋은 기본 5개까지', () => {
  const d = repo();
  for (let i = 0; i < 12; i++) commit(d, `fix: 본문 없는 수정 ${i}`);
  assert.match(ok(d, 'hints'), /본문 없는 커밋 \(5\/12\)/);
  assert.match(ok(d, 'hints', '--limit', '30', '--all'), /본문 없는 커밋 \(12\)/);
});

test('hints: 완료 일감 폴더가 없으면 그 절을 쓰지 않는다', () => {
  const d = repo();
  assert.doesNotMatch(ok(d, 'hints'), /완료 일감/);
});

test('hints: 주석은 폴더를 번갈아 뽑는다 — 한 폴더에 쏠리지 않게', () => {
  const d = repo();
  for (let i = 0; i < 4; i++) write(d, `src/a/f${i}.ts`, `// 주의: a 폴더 ${i}\n`);
  write(d, 'src/b/g.ts', '// 주의: b 폴더\n');
  write(d, 'src/c/h.ts', '// 주의: c 폴더\n');
  commit(d, 'add');
  const out = ok(d, 'hints', '--limit', '3');
  assert.match(out, /주의·우회 주석 \(3\/6\)/);
  assert.match(out, /a 폴더 0/);
  assert.match(out, /b 폴더/);
  assert.match(out, /c 폴더/);
  assert.doesNotMatch(out, /a 폴더 1/);
});

test('hints: 완료 일감의 절은 제목이 원인·재현 … 으로 시작할 때만', () => {
  const d = repo();
  write(d, 'docs/tickets/done/20261001_100_task-decided.md', '# 결정만 있는 일감\n\n## ETag/304: 재현하지 않는다\n\n## 재현하지 않는다\n\n본문\n');
  write(d, 'docs/tickets/done/20260901_100_bug-real.md', '# 진짜 버그\n\n## 재현 조건\n\n1\n\n## 원인\n\n2\n');
  commit(d, 'add');
  const out = ok(d, 'hints');
  assert.match(out, /진짜 버그 {2}\(재현 조건 · 원인 · \d+줄\)/);
  assert.match(out, /결정만 있는 일감 {2}\(\d+줄\)/);
  assert.ok(out.indexOf('진짜 버그') < out.indexOf('결정만 있는 일감'), out);
});

test('add: 출처가 커밋 해시로 시작하고 --date 가 없으면 그 커밋 날짜를 쓴다', () => {
  const d = repo();
  ok(d, 'init');
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '--allow-empty', '-m', 'fix: 옛 수정'],
    { cwd: d, env: { ...process.env, GIT_AUTHOR_DATE: '2026-09-26T12:00:00', GIT_COMMITTER_DATE: '2026-09-26T12:00:00' } });
  const hash = git(d, 'rev-parse', '--short', 'HEAD').trim();
  const g = (slug, title, ...rest) => ok(d, 'add', '--category', 'git', '--slug', slug, '--title', title, '--why', 'w', '--when', 'n',
    '--case', 'c', '--apply', 'a', ...rest);
  const out = g('old-commit', '옛 커밋에서 배운 것', '--source', `${hash} 옛 수정`);
  assert.match(out, new RegExp(`날짜: 커밋 ${hash} 의 날짜 2026-09-26`));
  assert.match(read(d, `${L}/git/old-commit.md`), new RegExp(`- 출처: 2026-09-26, ${hash} 옛 수정`));
  // --date 가 있으면 그것을 쓴다
  g('given-date', '날짜를 직접 준 항목', '--source', `${hash} x`, '--date', '2026-01-02');
  assert.match(read(d, `${L}/git/given-date.md`), /- 출처: 2026-01-02, /);
  // 찾을 수 없는 해시면 오늘 날짜로 쓰고 알려 준다
  const miss = g('missing-commit', '없는 커밋을 가리킨 항목', '--source', 'deadbeef0 작업');
  assert.match(miss, /커밋 deadbeef0 을 찾지 못했다 — 오늘 날짜로/);
});

// 최종 보고를 쓰는 순간에는 진입 블록만 보인다 — 판단 기준과 훑을 곳이 블록에서 빠지면 제안이 0개로 끝나기 쉽다.
test('README 진입 블록에 훑을 곳과 판단 기준이 있다', () => {
  const readme = fs.readFileSync(path.resolve(path.dirname(SCRIPT), '../../../README.md'), 'utf8');
  const block = readme.match(/```markdown\n## 배울 거리 \(work-learnings\)\n([\s\S]*?)```/)?.[1] ?? '';
  for (const must of ['최종 보고', '훑는다', '잘못 읽을 뻔한 출력', '사용자가 이번에 접한 것', '시간을 잃었을까', '통과한 것은 전부', '사용자가 고른 것만']) {
    assert.ok(block.includes(must), `진입 블록에 '${must}' 가 없다`);
  }
});

// 설치본이 repo-tickets lint 에 걸리면 안 된다 — 같이 설치된 저장소에서 없는 일감 참조 오류가 된다.
// (repo-tickets 의 참조 패턴과 같은 모양을 skill 파일 어디에도 두지 않는다)
test('skill 파일에 일감 참조 모양이 없다', () => {
  const dir = path.resolve(path.dirname(SCRIPT), '..');
  const hits = [];
  for (const f of fs.readdirSync(dir, { recursive: true })) {
    const abs = path.join(dir, f);
    if (!fs.statSync(abs).isFile()) continue;
    fs.readFileSync(abs, 'utf8').split('\n').forEach((line, i) => {
      if (/\[\[(?:bug|task|epic)-[a-z0-9-]+\]\]/.test(line)) hits.push(`${f}:${i + 1}`);
    });
  }
  assert.deepEqual(hits, []);
});
