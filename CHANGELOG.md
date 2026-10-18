# Changelog

버전은 `skills/work-learnings/rules.md` 첫 줄(`<!-- work-learnings vX.Y.Z -->`)이 정본이다.
각 버전 절은 GitHub Release 노트로 그대로 쓰인다.

- **MAJOR**: 폴더·카테고리 id·항목 형식처럼 이미 쓰는 저장소가 마이그레이션해야 하는 변경
- **MINOR**: 새 규칙·새 명령·새 카테고리·lint 검사 추가 (재설치 후 새 경고가 나올 수 있다)
- **PATCH**: 판정 정확도 개선·버그 수정·문서

## v0.1.0 — 2026-10-18

> First release: propose-then-approve learnings in `docs/learnings/<category>.md`, 11 standard categories, script with lint and repo hints.

- `docs/learnings/` 에 카테고리 하나 = 파일 하나. 항목은 제목(배운 것 한 줄) + `왜`·`언제`·`출처`.
- 기본 카테고리 11개, 근거를 남기는 카테고리 추가(`category`).
- 기록은 제안 → 승인. 작업 보고 끝 "배울 거리" 형식, 저장소에서 배울 거리 찾기(`hints` 단서).
- `scripts/learnings.mjs`: `init` / `add` / `list` / `lint [--fix]` / `category` / `hints`.
  `add` 는 비슷한 제목이면 멈추고, 같은 제목은 거부한다. 색인(`README.md`)은 스크립트가 만든다.
- README: 설치, 버전 고정, CLAUDE.md·AGENTS.md 진입 블록, CI 예시.
