# work-learnings

[![test](https://github.com/taeksoolee/work-learnings/actions/workflows/test.yml/badge.svg)](https://github.com/taeksoolee/work-learnings/actions/workflows/test.yml)
[![release](https://img.shields.io/github/v/release/taeksoolee/work-learnings)](https://github.com/taeksoolee/work-learnings/releases)
[![license](https://img.shields.io/github/license/taeksoolee/work-learnings)](LICENSE)

> **English summary** — An agent skill (Claude Code tested) that collects *what you can learn* from your work —
> generalizable lessons, not tasks — as markdown inside the repository: `docs/learnings/<category>.md`, one file per
> standard category (`ui-ux`, `frontend`, `testing`, `git`, `ai-collab`, …). The agent proposes "things to learn" at the
> end of a work report and records only the ones you approve; it can also look for candidates in the repo's fix/revert
> commits and workaround comments. A zero-dependency Node script handles add / list / lint (required fields, duplicate
> and similar titles, generated index). Rules and docs are in Korean.
> Install: `npx skills add taeksoolee/work-learnings --skill work-learnings`.

작업 중에 **사용자가 배울 수 있는 것**을 저장소 안 `docs/learnings/` 에 카테고리별로 쌓는 agent skill.
일감(할 일)을 뽑는 도구가 아니라 배움을 위한 도구다.

예: "모바일에서 칩 가로 스크롤은 오른쪽 여백 없이 화면 끝까지 넘긴다 — 끝이 잘려 보여야 더 있다는 신호가 된다."

- **제안 → 승인**: AI 가 작업 보고 끝에 "배울 거리" 후보를 제안하고, 사용자가 고른 것만 기록한다. 자동 기록은 없다.
- **저장소에서 찾기**: "이 저장소에서 배울 거리 찾아줘" 하면 고친·되돌린 커밋과 주의·우회 주석을 단서로 후보를 제안한다.
- **카테고리 표준화**: 저장소마다 같은 카테고리를 써서 나중에 모아 볼 수 있게 한다.
- 안 읽을 거면 설치하지 않는다 — 읽기를 강제하는 장치는 넣지 않았다.

- 규칙 정본: [`skills/work-learnings/rules.md`](skills/work-learnings/rules.md)
- 스크립트: `skills/work-learnings/scripts/learnings.mjs` — node 18+ 내장 모듈만 사용
- 검증된 도구: Claude Code. 형식은 도구 중립(SKILL.md frontmatter 는 `name`/`description` 만)이라
  다른 도구에서도 읽히지만 실검증은 하지 않았다.

## 설치

```sh
npx -y skills add taeksoolee/work-learnings --skill work-learnings --agent claude-code --copy --yes
```

특정 버전으로 고정하려면 태그를 붙인다 (버전 목록과 변경 내역: [Releases](https://github.com/taeksoolee/work-learnings/releases), [CHANGELOG](CHANGELOG.md)):

```sh
npx -y skills add "taeksoolee/work-learnings#v0.3.1" --skill work-learnings --agent claude-code --copy --yes
```

`.claude/skills/work-learnings/` 에 복사된다. **설치본은 저장소에 커밋한다** (`skills-lock.json` 도 함께) — 작고,
클론 즉시 동작하고, 규칙 변경이 PR diff 로 보인다. `.claude/skills/` 를 gitignore 하는 저장소는 예외를 추가한다:

```gitignore
.claude/skills/*
!.claude/skills/work-learnings/
```

`.claude/skills/` (끝 슬래시, 디렉터리 자체 무시) 형태로는 예외가 먹지 않는다 — git 은 제외된 디렉터리 안을
다시 포함하지 못한다. 반드시 `/*` 로 바꾼다.

저장소의 린터·포매터(Biome·ESLint·Prettier 등)가 `.claude/skills/` 까지 검사하면 제외 설정을 추가한다
(설치본은 고치지 않으므로).

**설치본은 고치지 않는다.** 규칙을 바꾸려면 이 저장소에 PR 을 보내고 다시 설치(업데이트)한다 —
재설치하면 로컬 수정은 덮어써진다. 설치된 버전은 `rules.md` 첫 줄과 `lint` 출력에 나온다.

처음 쓰는 저장소라면:

```sh
node .claude/skills/work-learnings/scripts/learnings.mjs init
```

설치·`init` 을 먼저 커밋하고 나서 기록(`add`)한다 — `add` 가 색인을 갱신하므로, 순서가 섞이면 설치 커밋의 색인이
그 커밋의 항목과 어긋난다. 재설치(업데이트) 뒤 색인 형식이 바뀌었으면 `lint` 가 알려 준다 — `lint --fix`.

**로컬에서만 시험할 때** (팀 저장소라 아직 커밋하지 않을 때): 설치본·기록·`skills-lock.json` 을
`.git/info/exclude` 에 넣으면 커밋 대상에 섞이지 않는다 (저장소의 `.gitignore` 는 건드리지 않는다).

```gitignore
# .git/info/exclude
.claude/skills/work-learnings/
docs/learnings/
skills-lock.json
```

CLAUDE.md 가 커밋 대상이면 진입 블록 때문에 그 파일만은 수정이 남는다 — 시험이 끝나면 되돌리거나 커밋을 결정한다
(CLAUDE.md 가 gitignore 된 생성물이면 남는 것이 없다).

**repo-tickets 와 함께 쓸 때**: 설치본(`rules.md` 등)에는 일감 참조 모양(`[[task-…]]` 처럼 실제 이름 꼴)을 두지 않는다
— 그래서 repo-tickets 버전과 무관하게 설치본이 repo-tickets `lint` 에 걸리지 않는다 (v0.1.0 은 예시가 걸렸다).
repo-tickets v0.3.4 부터는 설치된 skill 폴더 자체를 검사하지 않는다.

## 진입 블록

skill 은 description 매칭으로만 로드된다 — "작업 중 배울 만한 게 생겼을 때" 같은 조건으로는 저절로 켜지지 않는다.
그래서 제안 트리거는 항상 로드되는 문서에 넣는다. Claude Code 는 `CLAUDE.md`, 그 밖의 도구는 `AGENTS.md`.
그 파일이 **생성물**(셋업 스크립트가 만드는 포인터, gitignore 대상)이면 생성원 — 그 파일이 가리키는 정본
(예: `AI.md`) — 에 넣는다. 생성물에 넣으면 팀에 공유되지 않고 다시 생성할 때 덮어써진다.
문서 색인 목록이 있으면 거기에 `` [`docs/learnings/`](docs/learnings/) — 배운 것 (규칙은 아래 "배울 거리") `` 를 더한다.

```markdown
## 배울 거리 (work-learnings)

- 작업을 마치고 최종 보고할 때, 사용자가 배울 만한 일반화 가능한 교훈이 있었으면 보고 끝에 "배울 거리" 로
  후보를 제안한다 (`[카테고리] 제목 — 왜 한 줄`). 다른 세션이 맡긴 일의 결과 보고도 포함, 중간 확인 질문은 제외.
- 개수는 기준이 정한다 — 통과한 것만 전부(많아야 3개). 0개면 섹션을 쓰지 않는다. 어느 숫자로도 맞추지 않는다.
- 기준: "다른 프로젝트에서 같은 상황을 만나면 도움이 되는가". 이 프로젝트만의 결정·할 일·상식은 제외.
- 기록은 사용자가 고른 것만, work-learnings skill(`.claude/skills/work-learnings/rules.md`)로 한다.
```

repo-tickets 와 함께 쓰면 두 진입 블록을 나란히 둔다. 기록의 출처에 일감 참조(`[[이름]]`)를 쓰면 repo-tickets `lint` 가
`docs/learnings/` 의 그 참조도 검사한다 — 없는 일감이면 오류다. 의도된 동작이다 (일감 이름은 바뀌지 않으므로 깨진 참조는 실수다).
skill 설치본 자체는 이 검사에 걸리지 않는다 (위 "설치").

## CI (선택)

`lint` 는 오류가 있을 때만 종료 코드 1 이다. 경고(비슷한 제목 등)는 CI 를 막지 않는다.

```yaml
# .github/workflows/learnings.yml
name: learnings
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-24.04   # ubuntu-latest 는 이미지가 예고 없이 바뀐다 — 고정하고 올릴 때 검증
    steps:
      - uses: actions/checkout@v7      # node24 런타임 (v4 는 node20 타깃)
      - uses: actions/setup-node@v7
        with: { node-version: 24 }
      - run: node .claude/skills/work-learnings/scripts/learnings.mjs lint
```

## 개발

```sh
node --test          # 명령 전체 흐름 + 유사 제목 판정 회귀 테스트 (test/)
```

유사 제목 판정은 조사·어미를 떼고 낱말 겹침을 보는 휴리스틱이라 고치면 다른 곳이 깨지기 쉽다.
판정을 바꿀 때는 `test/learnings.test.mjs` 의 잡아야 할 쌍(`SIMILAR`)·잡으면 안 되는 쌍(`DISTINCT`)에
예제를 먼저 추가하고 맞춘다. 실사용 저장소의 오탐·누락 사례도 이 목록에 가상 예제로 옮겨 둔다.

## 릴리즈

1. `skills/work-learnings/rules.md` 첫 줄 버전을 올린다 (규칙은 [CHANGELOG](CHANGELOG.md) 머리말의 MAJOR/MINOR/PATCH 기준).
2. `CHANGELOG.md` 맨 위에 새 버전 절을 쓴다 — 영어 한 줄 요약(`>`) + 한국어 항목.
3. 커밋·push 후 태그와 GitHub Release:
   ```sh
   v=$(sed -nE '1s/.*work-learnings (v[0-9.]+).*/\1/p' skills/work-learnings/rules.md)
   git tag -a "$v" -m "work-learnings $v" && git push origin "$v"
   awk -v v="$v" '$0 ~ "^## "v" " {f=1; next} /^## v/ {f=0} f' CHANGELOG.md | gh release create "$v" --title "$v" --notes-file -
   ```
4. 쓰는 저장소는 재설치로 따라온다. MINOR 이상이면 재설치 후 `lint` 에 새 경고가 나올 수 있다.

## 라이선스

[MIT](LICENSE)
