---
name: owasp-scan
description: FinSight 코드베이스 전체를 OWASP Top 10:2025 기준으로 정적 스캔하고(소스코드 + npm audit 의존성 취약점 + Supabase RLS/설정), docs/security-scans/에 마크다운 리포트로 저장한다. 사용자가 "OWASP 스캔해줘", "보안 감사해줘", "OWASP Top 10 기준으로 점검해줘" 등을 요청하거나 /owasp-scan을 실행할 때 사용한다. PR diff 리뷰는 /review-code가 담당하므로 이 스킬의 범위가 아니다.
---

# FinSight OWASP Top 10:2025 보안 스캔

레포 전체(또는 인자로 받은 특정 경로)를 OWASP Top 10:2025 열 개 카테고리 기준으로 감사하고 마크다운 리포트를 생성한다. PR diff가 아니라 **현재 코드베이스 스냅샷** 전체를 대상으로 한다.

## 1. 스캔 대상 확정

인자(`$ARGUMENTS`)로 경로가 주어지면 그 경로만 스캔한다. 없으면 기본 대상 (실제 레포 구조는 `src/` 하위):
`src/app/`, `src/services/`, `src/lib/`, `src/components/`, `src/hooks/`, `supabase/migrations/`, `package.json`

## 2. 동적 데이터 선수집 (오케스트레이터가 직접 수행)

서브에이전트에는 `Bash`/MCP 툴을 주지 않으므로, 동적으로 확인해야 하는 정보는 여기서 미리 모아 프롬프트 텍스트로 넘긴다.

**의존성 취약점**:
```bash
npm audit --json
```
실패하거나 결과가 없어도 스캔을 중단하지 말고 "npm audit 실행 실패/취약점 없음"으로 요약해 다음 단계로 넘어간다.

**Supabase 설정 (베스트 에포트)**: `mcp__supabase__get_advisors`(type: security)와 `mcp__supabase__list_tables`를 시도한다. 연결된 프로젝트가 없거나 실패하면 에러로 멈추지 말고 "Supabase 미연결 — 정적 마이그레이션 파일 확인으로 대체"라고 기록하고 넘어간다.

## 3. 5개 서브에이전트 병렬 호출

**한 메시지 안에서 Agent 툴을 5번 호출**한다 (`subagent_type`: `owasp-access-auth-scanner`, `owasp-injection-design-scanner`, `owasp-crypto-logging-scanner`, `owasp-supply-chain-integrity-scanner`, `owasp-config-exception-scanner`).

모든 호출에 공통으로 넣을 내용:
- 1단계에서 확정한 스캔 대상 경로 목록
- `/CLAUDE.md`의 CRITICAL 규칙 전문(직접 Read해서 그대로 삽입)

추가로:
- `owasp-supply-chain-integrity-scanner`에는 2단계에서 얻은 npm audit 요약
- `owasp-config-exception-scanner`에는 2단계에서 얻은 Supabase advisor/테이블 요약(또는 "미연결" 안내)

각 에이전트는 자기 파일에 정의된 `### FINDING` 블록(`owasp` 필드 포함) 형식으로만 응답한다.

## 4. 결과 취합

5개 응답에서 모든 `### FINDING` 블록을 모은다.

- 심각도 집계: critical=🔴, major=🟠, minor=🟡, nit=⚪ 개수를 센다.
- OWASP 카테고리별 집계: A01~A10 각각 발견 수를 센다(`owasp` 필드 기준).

## 5. 마크다운 리포트 생성

`docs/security-scans/owasp-scan-<YYYYMMDD>.md`로 저장한다 (디렉토리가 없으면 Write 시 자동 생성됨, 같은 날짜에 이미 파일이 있으면 덮어쓴다).

리포트 구성:

```markdown
# OWASP Top 10:2025 보안 스캔 리포트

- 스캔 일시: <ISO 날짜/시간>
- 스캔 대상: <1단계에서 확정한 경로 목록>
- 커버리지: 소스코드 정적분석 ✅ / 의존성(npm audit) <✅|⚠️ 실행 실패> / 인프라(Supabase) <✅|⚠️ 미연결, 정적 확인만>

## 요약

🔴 critical <n>  🟠 major <n>  🟡 minor <n>  ⚪ nit <n>

| 카테고리 | 발견 수 |
|---|---|
| A01 Broken Access Control | <n> |
| A02 Security Misconfiguration | <n> |
| A03 Software Supply Chain Failures | <n> |
| A04 Cryptographic Failures | <n> |
| A05 Injection | <n> |
| A06 Insecure Design | <n> |
| A07 Authentication Failures | <n> |
| A08 Software or Data Integrity Failures | <n> |
| A09 Security Logging and Alerting Failures | <n> |
| A10 Mishandling of Exceptional Conditions | <n> |

## A01 Broken Access Control
<해당 카테고리의 FINDING 블록들, 없으면 "발견 없음">

## A02 Security Misconfiguration
...

(A03~A10까지 같은 형식으로 반복)

## 다음 액션
<critical/major finding을 우선순위로 나열. 없으면 "critical/major 없음">
```

## 6. 채팅 보고

리포트 전문을 채팅에 다시 출력하지 않는다. 총 발견 수, critical/major 개수, 저장된 파일 경로만 요약해서 사용자에게 알린다.

## 범위 밖

- PR diff 리뷰는 `/review-code`가 담당한다. 이 스킬은 diff가 아니라 코드베이스 전체 스냅샷을 스캔한다.
- Supabase 프로젝트가 연결돼 있지 않으면 인프라 체크는 `supabase/migrations/*.sql` 정적 확인으로만 제한되며, 리포트 커버리지 항목에 그 사실을 명시한다.
