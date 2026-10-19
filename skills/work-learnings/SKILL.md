---
name: work-learnings
description: 저장소 안 docs/learnings/<카테고리>/<슬러그>.md 에 사용자가 배울 일반화 가능한 교훈을 사례와 함께 기록·정리한다 — 할 일·버그(일감)나 프로젝트 결정 기록이 아니다. 사용자가 "배울 거리" 기록을 승인했을 때(예 "1 기록", "전부 기록"), 배운 것 목록을 볼 때, 저장소에서 배울 거리를 찾아 달라고 할 때, docs/learnings 형식을 검사하거나 옛 형식을 옮길 때 사용한다.
---

# work-learnings

이 저장소의 배움 기록은 `docs/learnings/<카테고리>/<슬러그>.md` — 카테고리는 폴더, 항목 하나는 파일 하나다. **작업 전에 같은 폴더의 `rules.md` 를 읽고 그대로 따른다.**

- 기록은 **제안 → 승인**이다. 사용자가 고른 것만 쓴다 — 승인 없이 기록하지 않는다.
- 추가·검사는 손으로 하지 말고 이 skill 의 `scripts/learnings.mjs` 를 **저장소 루트에서** 실행한다
  (설치 위치 기준 `node .claude/skills/work-learnings/scripts/learnings.mjs <명령>`, 사용법은 rules.md).
- 기록하거나 기존 항목을 고쳤으면 끝내기 전에 `lint` 를 통과시킨다.
