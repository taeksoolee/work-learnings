# Changelog

버전은 `skills/work-learnings/rules.md` 첫 줄(`<!-- work-learnings vX.Y.Z -->`)이 정본이다.
각 버전 절은 GitHub Release 노트로 그대로 쓰인다.

- **MAJOR**: 폴더·카테고리 id·항목 형식처럼 이미 쓰는 저장소가 마이그레이션해야 하는 변경
- **MINOR**: 새 규칙·새 명령·새 카테고리·lint 검사 추가 (재설치 후 새 경고가 나올 수 있다)
- **PATCH**: 판정 정확도 개선·버그 수정·문서

## v0.3.2 — 2026-10-19

> Entry block now carries the judgment itself: what to scan before the final report, and the "would you have lost time" bar.

진입 블록 문구 변경 — **쓰는 저장소는 CLAUDE.md·AGENTS.md 의 블록을 README "진입 블록" 으로 바꿔 넣는다.** 스크립트 변경 없음.

- v0.3.1 에서 배울 거리가 2개 있던 작업을 0개로 보고한 사례: "0개가 정상", "어느 숫자로도 맞추지 않는다" 만 진입 블록에 있고
  "대상은 사용자가 이번에 접한 것" 은 rules.md 에만 있었다. 최종 보고를 쓸 때는 진입 블록만 보인다.
- 진입 블록: 보고 직전에 훑을 곳(처음 써 본 명령·플래그·기법, 잘못 읽을 뻔한 출력, 막혔다가 풀린 지점, 겪을 뻔한 함정),
  "사용자가 이번에 접한 것이 대상", 기준 "몰랐다면 실제로 시간을 잃었을까", "통과한 것은 전부(많아야 3개)".
  문턱만 올리던 "0개가 가장 흔한 정상"·"어느 숫자로도 맞추지 않는다" 는 진입 블록에서 뺐다 (rules.md 에는 남는다).
- rules.md: 보고 직전 훑기, 판단 기준이 진입 블록에도 있어야 하는 이유.
- 테스트: 진입 블록에 훑을 곳·기준 문장이 있는지 고정. `--since` 테스트가 UTC 날짜를 써서 KST 자정~09시에 실패하던 문제 수정.

## v0.3.1 — 2026-10-18

> Third pilot round: proposal count is set by the bar (no anchoring on 1 or 3), body length sorts hints again, Revert/ci/folder fixes, `add` takes the date from a commit hash.

세 저장소 3차 파일럿 반영. 재설치만 하면 된다 (색인 형식 변경 없음).

- 규칙: **개수는 기준이 정한다** — 통과한 것은 전부(많아야 3개), 못 하면 0개. 3개로 채우지도, 1개로 줄이지도 않는다.
  v0.3.0 뒤 세 곳 모두 정확히 1개였다 — "하나뿐이면 하나만" 문구와 파일럿 요청의 압력이 1개로 끌었을 수 있다.
  대상은 "이번 작업에서 사용자가 접한 것" (이 세션이 처음 알아낸 것만이 아니다).
- `hints`:
  - 본문 긴 순을 다시 1순위로, 이유 표현은 같은 길이일 때만 — 이유 표현 순은 세 곳 중 두 곳에서 좋은 후보를 밀어냈다.
  - 본문 없는 Revert 는 목록 대신 개수만, 본문 없는 커밋은 5개까지.
  - `ci`·`build` 커밋도 단서 — CI 함정 교훈의 출처가 `ci:` 커밋이었다.
  - 주석은 폴더를 번갈아 뽑는다 (한 폴더 쏠림).
  - 완료 일감의 절은 제목이 원인·재현 … 으로 시작할 때만 ("재현하지 않는다" 오인 제거).
- `add`: 출처가 커밋 해시로 시작하고 `--date` 가 없으면 그 커밋 날짜를 쓴다.
- README: 로컬 전용 시험에서 CLAUDE.md 가 생성물이면 남는 수정이 없다.

## v0.3.0 — 2026-10-18

> Second pilot round (3 repos): no quota for proposals, smarter `hints` (why-words first, merge/revert/squash noise removed, file-kind tags, deduped comments, caveat-doc headings, done tickets with cause sections), `add --stdin` arrays, double-date fix.

세 저장소 2차 파일럿 피드백 반영. **재설치 후 `lint --fix` 한 번** — `devops-ci` 범위가 바뀌어 색인이 달라진다.
v0.2.0 이하 `add` 로 기록한 항목은 `lint` 에 "출처에 날짜가 둘" 경고가 나올 수 있다 — 날짜 하나로 고친다.

- 수정: `--source` 가 날짜로 시작하면 날짜가 두 번 붙던 문제 — `add` 가 거부(날짜는 `--date`), `lint` 가 경고.
- 규칙: **개수는 상한이지 목표가 아니다** — 0개가 정상, 후보마다 "몰랐다면 실제로 시간을 잃었을까" 확인,
  "더" 요청도 기준을 통과한 것만. 제안은 최종 보고에만(중간 확인 질문 제외). 제목에 백틱·「」 허용.
  단서가 가리키는 문서도 읽는다.
- `devops-ci` 범위에 개발 도구(셸·스크립트·로컬 도구 설정) 포함.
- `add --stdin` 이 JSON 배열을 받는다 — 하나라도 걸리면 아무것도 쓰지 않고, 몇 번째 항목인지 알려 준다.
- `hints`:
  - 커밋: 이유 표현(`때문`·`원인`·`조용히`·`because` …)이 많은 본문 먼저, 그다음 본문 긴 순. 머지 커밋 제외,
    Revert 자동 본문·스쿼시의 하위 커밋 제목 나열·트레일러는 본문으로 치지 않는다.
  - `(설정·문서만)` → `(CI·빌드)`·`(설정)`·`(문서)` 로 나눔. `(CI·빌드)` 는 배울 거리인 경우가 많다.
  - 주석: 같은 문장은 한 번(`같은 주석 N곳 더`), 파일당 3개, 점으로 시작하는 다른 도구 폴더 제외(`.github` 는 본다),
    잘리면 `(보인 수/전체)`.
  - 주의 문서 파일은 제목 목록·줄 번호와 함께. 완료 일감은 `원인`·`재현`·`배운 것` 절이 있는 것 먼저, 절 이름·줄 수 표시.
- README: CLAUDE.md 가 생성물이면 생성원에 진입 블록, 로컬에서만 시험할 때 `.git/info/exclude`.

## v0.2.0 — 2026-10-18

> Pilot feedback: installed files no longer trip repo-tickets lint, richer `hints` (commit bodies first, done tickets, `--since`), `add --stdin`, leaner index.

두 저장소 파일럿 피드백 반영. **재설치 후 `lint --fix` 한 번** — 색인 형식이 바뀌어 그 전까지 `lint` 가 색인 불일치 오류를 낸다.

- 수정: `rules.md` 예시의 일감 참조가 repo-tickets(v0.3.3 이하) `lint` 에서 "없는 일감 참조" 오류가 됐다 —
  설치본에 일감 참조 모양을 두지 않는다 (테스트로 고정).
- `hints`:
  - 커밋: 본문 있는 것을 본문 긴 순으로, 본문 없는 것은 따로 10개까지(`--all`). `perf`·`refactor` 포함, `docs`·`chore` 등 제외, `--since`.
    바뀐 파일이 설정·문서뿐이면 `(설정·문서만)` 표시. 잘렸으면 `(보인 수/전체)`.
  - 주석: 주석 안 어디든 `함정`·`조용히`·`깨진다` 도 잡는다. md 는 `<!-- -->` 만 주석으로 본다.
  - 새 절: 주의 문서(`CAVEATS.md`·`TROUBLESHOOTING.md` 같은 파일, md 의 주의·함정 제목),
    repo-tickets 의 `docs/tickets/done/` 완료 일감(최근 순).
- `add --stdin`: 필드를 JSON 으로 — 백틱·`${…}` 를 셸 이스케이프 없이.
- 제목에 ` — ` 가 있으면 `add` 거부·`lint` 경고 — 제안의 `제목 — 왜` 를 통째로 제목에 넣는 실수.
- 색인: 항목이 있는 카테고리만 표로, 빈 카테고리는 한 줄로.
- 규칙: 제목은 배운 것 하나(60자 안팎), 출처 날짜는 그 일이 있던 날, 특정 버전 도구 함정은 `언제` 에 버전 범위,
  "보고" 에는 다른 세션이 맡긴 일의 결과 보고도 포함.
- README: 설치·`init` 을 먼저 커밋한 뒤 기록, repo-tickets 와 함께 쓸 때.

## v0.1.0 — 2026-10-18

> First release: propose-then-approve learnings in `docs/learnings/<category>.md`, 11 standard categories, script with lint and repo hints.

- `docs/learnings/` 에 카테고리 하나 = 파일 하나. 항목은 제목(배운 것 한 줄) + `왜`·`언제`·`출처`.
- 기본 카테고리 11개, 근거를 남기는 카테고리 추가(`category`).
- 기록은 제안 → 승인. 작업 보고 끝 "배울 거리" 형식, 저장소에서 배울 거리 찾기(`hints` 단서).
- `scripts/learnings.mjs`: `init` / `add` / `list` / `lint [--fix]` / `category` / `hints`.
  `add` 는 비슷한 제목이면 멈추고, 같은 제목은 거부한다. 색인(`README.md`)은 스크립트가 만든다.
- README: 설치, 버전 고정, CLAUDE.md·AGENTS.md 진입 블록, CI 예시.
