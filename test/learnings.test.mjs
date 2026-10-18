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
const add = (dir, title, ...extra) =>
  run(dir, 'add', '--category', 'ui-ux', '--title', title, '--why', '왜', '--when', '언제', '--source', '작업', ...extra);

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

test('init → add → list, 색인 갱신', () => {
  const d = repo();
  assert.match(ok(d, 'init'), /색인 생성/);
  assert.match(read(d, `${L}/README.md`), /\| `ui-ux` \|.*\| 0 \|/); // 파일이 없으면 링크하지 않는다

  ok(d, 'add', '--category', 'ui-ux', '--title', CHIPS, '--why', '끝이 잘려 보여야 더 있다는 신호가 된다.',
    '--when', '모바일 가로 스크롤 목록', '--source', '[[task-mobile-filter-chips]]', '--date', '2026-10-18');
  const body = read(d, `${L}/ui-ux.md`);
  assert.match(body, /^# ui-ux\n/);
  assert.ok(body.includes(`## ${CHIPS}\n\n- 왜: 끝이 잘려 보여야 더 있다는 신호가 된다.\n- 언제: 모바일 가로 스크롤 목록\n- 출처: 2026-10-18, [[task-mobile-filter-chips]]\n`));
  assert.match(read(d, `${L}/README.md`), /\| \[`ui-ux`\]\(ui-ux\.md\) \|.*\| 1 \|/);

  assert.ok(add(d, '터치 영역은 44px 이상으로 잡는다').code === 0);
  const list = ok(d, 'list');
  assert.match(list, /ui-ux \(2\)\n {2}- 모바일 칩/);
  assert.match(ok(d, 'list', 'ui-ux'), /터치 영역/);
  assert.equal(run(d, 'list', 'nope').code, 1);

  assert.match(ok(d, 'lint'), /work-learnings v[\d.]+ lint .*: 오류 0, 경고 0/);
});

test('add: 비슷한 제목이면 멈추고 --force 로 강행', () => {
  const d = repo();
  ok(d, 'init');
  assert.equal(add(d, CHIPS).code, 0);
  const r = add(d, '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다');
  assert.equal(r.code, 1);
  assert.match(r.out, /비슷한 항목/);
  assert.match(r.out, /ui-ux\.md:\d+/);
  assert.equal(add(d, '모바일 칩 가로 스크롤은 화면 끝까지 넘긴다', '--force').code, 0);
  // 정규화 후 같은 제목은 --force 로도 안 된다
  const dup = add(d, `${CHIPS}.`, '--force');
  assert.equal(dup.code, 1);
  assert.match(dup.out, /같은 제목/);
});

test('add: 입력 검사', () => {
  const d = repo();
  ok(d, 'init');
  assert.match(run(d, 'add', '--category', 'nope', '--title', 't', '--why', 'w', '--when', 'n', '--source', 's').out, /모르는 카테고리/);
  assert.match(run(d, 'add', '--category', 'ui-ux', '--title', 't', '--when', 'n', '--source', 's').out, /--why/);
  assert.match(add(d, '칩은 끝까지 넘겨야 할까?').out, /질문형/);
  assert.match(add(d, 't', '--date', '2026/10/18').out, /YYYY-MM-DD/);
});

test('lint: 오류와 경고', () => {
  const d = repo();
  ok(d, 'init');
  write(d, `${L}/ui-ux.md`, [
    '# ui-ux', '',
    '## 필드가 빠진 항목', '', '- 왜: 이유', '',
    '## 출처에 날짜가 없는 항목', '', '- 왜: a', '- 언제: b', '- 출처: 어제 작업', '',
    `## ${CHIPS}`, '', '- 왜: a', '- 언제: b', '- 출처: 2026-10-18, x', '',
    '## 모바일 칩 가로 스크롤은 화면 끝까지 넘긴다', '', '- 왜: a', '- 언제: b', '- 출처: 2026-10-18, x', '',
    '## 정말 그럴까?', '', '- 왜: a', '- 언제: b', '- 출처: 2026-10-18, x', '',
    '```md', '## 코드 블록 안의 제목은 항목이 아니다', '```', '',
  ].join('\n'));
  write(d, `${L}/frontend.md`, `# frontend\n\n## ${CHIPS}.\n\n- 왜: a\n- 언제: b\n- 출처: 2026-10-18, x\n`);
  write(d, `${L}/random.md`, '# random\n');

  const r = run(d, 'lint');
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /✗ docs\/learnings\/ui-ux\.md:3 .*'언제' 없음/);
  assert.match(r.out, /✗ docs\/learnings\/ui-ux\.md:3 .*'출처' 없음/);
  assert.match(r.out, /✗ docs\/learnings\/ui-ux\.md:7 .*날짜/);
  assert.match(r.out, /✗ docs\/learnings\/frontend\.md:3 .*같은 제목.*ui-ux\.md:13/);
  assert.match(r.out, /! docs\/learnings\/ui-ux\.md:19 .*비슷한 제목.*ui-ux\.md:13/);
  assert.match(r.out, /! docs\/learnings\/ui-ux\.md:25 .*질문형/);
  assert.match(r.out, /✗ docs\/learnings\/random\.md .*모르는 카테고리/);
  assert.match(r.out, /✗ docs\/learnings\/README\.md .*색인/);
  assert.doesNotMatch(r.out, /코드 블록 안의/);
});

test('lint --fix: 색인만 고친다', () => {
  const d = repo();
  ok(d, 'init');
  write(d, `${L}/testing.md`, '# testing\n\n## 실패하는 테스트부터 쓴다\n\n- 왜: a\n- 언제: b\n- 출처: 2026-10-18, x\n');
  assert.match(run(d, 'lint').out, /색인/);
  assert.match(ok(d, 'lint', '--fix'), /색인 갱신/);
  assert.match(read(d, `${L}/README.md`), /\| \[`testing`\]\(testing\.md\) \|.*\| 1 \|/);
  assert.match(ok(d, 'lint'), /오류 0, 경고 0/);
});

test('category: 추가 카테고리는 근거와 함께 색인에 남는다', () => {
  const d = repo();
  ok(d, 'init');
  assert.match(run(d, 'category', 'mobile', '--scope', '앱 플랫폼').out, /--reason/);
  assert.match(run(d, 'category', 'ui-ux', '--scope', 's', '--reason', 'r').out, /이미 있는/);
  assert.match(run(d, 'category', 'Mobile App', '--scope', 's', '--reason', 'r').out, /id 형식/);
  ok(d, 'category', 'mobile', '--scope', '앱 플랫폼·빌드·스토어', '--reason', '어디에도 안 맞는 항목 3개 (스토어 심사 등)');
  const readme = read(d, `${L}/README.md`);
  assert.match(readme, /## 추가 카테고리[\s\S]*\| `mobile` \| 앱 플랫폼·빌드·스토어 \| 어디에도 안 맞는 항목 3개/);

  ok(d, 'add', '--category', 'mobile', '--title', '스토어 심사 전에 테스트 계정을 준비한다', '--why', 'w', '--when', 'n', '--source', 's');
  // 재생성해도 추가 카테고리가 유지된다
  ok(d, 'lint', '--fix');
  assert.match(read(d, `${L}/README.md`), /\| \[`mobile`\]\(mobile\.md\) \|.*\| 1 \|/);
  assert.match(ok(d, 'lint'), /오류 0, 경고 0/);
});

test('hints: 배움이 숨어 있기 쉬운 커밋·주석을 나열한다', () => {
  const d = repo();
  write(d, 'src/a.ts', [
    'const x = 1;',
    '// HACK: Safari 는 100vh 에 주소창을 포함한다 — dvh 로 우회',
    '// 주의: 이 순서를 바꾸면 IME 입력이 끊긴다',
    'const todo = "WORKAROUND 라는 단어가 든 문자열이 아니라 주석만 본다";',
    '/* workaround: iOS 에서 click 이 두 번 온다 */',
  ].join('\n'));
  write(d, '.claude/skills/other/x.md', '// HACK: 설치본은 보지 않는다');
  write(d, `${L}/ui-ux.md`, '// HACK: 이미 기록한 곳도 보지 않는다');
  commit(d, 'feat: 화면 추가');
  commit(d, 'fix: 모바일에서 칩 끝이 잘리지 않던 문제');
  commit(d, 'Revert "feat: 무한 스크롤"');

  const out = ok(d, 'hints');
  assert.match(out, /fix: 모바일에서 칩 끝이/);
  assert.match(out, /Revert "feat: 무한 스크롤"/);
  assert.doesNotMatch(out, /feat: 화면 추가/);
  assert.match(out, /src\/a\.ts:2 .*HACK: Safari/);
  assert.match(out, /src\/a\.ts:3 .*주의: 이 순서/);
  assert.match(out, /src\/a\.ts:5 .*workaround: iOS/);
  assert.doesNotMatch(out, /src\/a\.ts:4/);
  assert.doesNotMatch(out, /설치본은|이미 기록한/);
  assert.match(out, /단서일 뿐/);

  assert.match(ok(d, 'hints', '--limit', '1'), /Revert/);
  assert.doesNotMatch(ok(d, 'hints', '--limit', '1'), /fix: 모바일/);
});
