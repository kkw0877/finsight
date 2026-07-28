# 브라우저 테스트 시나리오

`dev-browser` CLI(https://github.com/sawyerhood/dev-browser)로 실행하는 수동/반자동 브라우저 테스트 시나리오 모음이다. `npm run test`(Vitest)가 커버하지 못하는 "실제 브라우저에서 렌더링·리다이렉트·네트워크가 기대대로 동작하는가"를 확인하는 용도이며, 새 기능을 추가하거나 배포 전 골든 패스를 재확인할 때 이 문서의 시나리오를 그대로 실행한다.

## 빠른 실행 (권장)

아래 7개 시나리오는 `scripts/browser-test.devbrowser.js`에 assertion과 함께 코드화되어 있고, `scripts/browser-test.sh`가 포트 점유 확인 → (필요시) dev 서버 기동 → 시나리오 실행 → (자신이 띄운 경우만) 서버 정리까지 한 번에 처리한다. `browser-test` 스킬을 통해 호출하거나, 직접 실행한다:

```bash
bash scripts/browser-test.sh
```

전체 시나리오를 한 번에 pass/fail로 확인할 때는 이 스크립트를 쓰고, 특정 시나리오 하나만 디버깅하거나 새 시나리오를 설계할 때는 아래 개별 스크립트를 참고한다. **시나리오를 추가/수정하면 이 문서와 `scripts/browser-test.devbrowser.js`를 함께 갱신한다.**

## 사전 준비

```bash
npm install -g dev-browser   # 최초 1회
dev-browser install          # Playwright + Chromium 설치, 최초 1회
```

dev 서버(`npm run dev`, http://localhost:3000)는 테스트를 요청받은 쪽(Claude)이 그때그때 기동/종료한다. 사용자가 미리 띄워둘 필요는 없다. 단, 이미 3000번 포트가 사용 중이면 사용자가 직접 작업 중인 서버일 수 있으므로 **절대 강제 종료하지 않고 그대로 재사용**한다:

```bash
# 1) 포트 점유 여부 확인
lsof -ti:3000

# 2-a) 비어 있으면: 직접 기동하고, 이번에 자신이 띄웠다는 것을 기억해둔다
(npm run dev > /tmp/finsight-dev.log 2>&1 &)
sleep 5
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # 200 확인

# 2-b) 이미 떠 있으면: 그대로 재사용, 아래 "정리" 단계에서도 건드리지 않는다
```

## 공통 주의사항

- **하이드레이션 대기 필수**: `page.goto`를 `waitUntil: "domcontentloaded"`로만 열고 바로 클릭하면, Next.js dev 모드에서 React 하이드레이션이 끝나기 전이라 `onClick`이 아직 붙어있지 않아 클릭이 씹힌다. 클릭이 필요한 시나리오는 `waitUntil: "networkidle"`로 열거나, `domcontentloaded` 후 `page.waitForTimeout(1000)` 정도 대기한 뒤 클릭한다.
- **named page 재사용**: 같은 세션 내 여러 스크립트를 이어서 실행할 땐 `browser.getPage("finsight")`처럼 동일한 이름을 써서 쿠키·상태를 유지한다.
- **headless 기본**: 아래 스크립트는 모두 `dev-browser --headless`로 실행한다. 실제 로그인 등 사람이 개입해야 하는 단계는 `--connect`로 실행 중인 Chrome에 붙어서 진행한다(하단 "테스트 범위 밖" 참고).
- **정리는 자신이 띄운 것만**: 테스트 시작 전 포트가 비어 있어서 직접 dev 서버를 띄웠다면, 테스트가 끝난 뒤 반드시 종료한다 (`lsof -ti:3000 | xargs kill`). 반대로 시작 전부터 이미 떠 있던 서버(사용자가 띄운 것으로 간주)는 절대 종료하지 않는다.

## 시나리오

### 1. 랜딩 페이지 요소 검증
**목적**: 헤드라인, CTA 버튼(히어로+최하단 2개), 신규 인사이트 섹션 3개(대시보드 목업/AI 처리 과정 인포그래픽/카테고리 아이콘 그리드)가 모두 렌더링되는지 확인.
**기대 결과**: `h1`이 랜딩 헤드라인과 일치, CTA 버튼("Google로 로그인")이 2개, `sectionTitles`가 `["카드 명세서 하나면, 이런 화면을 받습니다", "이렇게 분석합니다", "9가지 카테고리로 자동 분류됩니다"]`.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

const h1 = await page.locator("h1").textContent();
const ctaCount = (await page.getByRole("button", { name: "Google로 로그인" }).all()).length;
const sectionTitles = await page.locator("h2").allTextContents();

console.log(JSON.stringify({ h1, ctaCount, sectionTitles }, null, 2));
EOF
```

### 2. 모바일 반응형 (375px)
**목적**: 좁은 뷰포트에서 가로 스크롤이 생기지 않고 카드가 1열로 쌓이는지 확인.
**기대 결과**: `hasHorizontalScroll: false`. 스크린샷으로 레이아웃 육안 확인.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
await page.setViewportSize({ width: 375, height: 812 });
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });

const hasHorizontalScroll = await page.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth
);
const buf = await page.screenshot({ fullPage: true });
const path = await saveScreenshot(buf, "finsight-mobile.png");
console.log(JSON.stringify({ hasHorizontalScroll, path }));
EOF
```

### 3. 라우트 보호 — 비인증 `/dashboard` 접근
**목적**: 로그인하지 않은 상태로 보호 라우트에 직접 접근하면 `/login`으로 리다이렉트되는지 확인.
**기대 결과**: `finalUrl`이 `http://localhost:3000/login`.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
const response = await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
console.log(JSON.stringify({ finalUrl: page.url(), status: response.status() }));
EOF
```

### 4. 로그인 페이지 요소 검증
**목적**: `/login` 페이지의 타이틀·설명·CTA가 정상 렌더링되는지 확인.
**기대 결과**: `h1: "FinSight"`, 설명 문구 존재, `btnVisible: true`.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
const h1 = await page.locator("h1").textContent();
const desc = await page.locator("p").textContent();
const btnVisible = await page.getByRole("button", { name: "Google로 로그인" }).isVisible();
console.log(JSON.stringify({ h1, desc, btnVisible }));
EOF
```

### 5. Google 로그인 리다이렉트
**목적**: "Google로 로그인" 클릭 시 `/api/auth/signin` → Supabase authorize URL → `accounts.google.com`까지 정상적으로 이어지는지 확인. **실제 로그인은 진행하지 않는다** (계정 정보 미입력).
**기대 결과**: `finalUrl`이 `https://accounts.google.com/...`로 시작.
**주의**: 반드시 `networkidle` 대기 후 클릭할 것 — "공통 주의사항" 참고.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await page.getByRole("button", { name: "Google로 로그인" }).click();
await page.waitForTimeout(2000);
console.log(JSON.stringify({ finalUrl: page.url() }));
EOF
```

### 6. 404 처리
**목적**: 존재하지 않는 경로 접근 시 Next.js 기본 404가 뜨는지 확인.
**기대 결과**: `status404: 404`, 본문에 "This page could not be found." 포함.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
const res = await page.goto("http://localhost:3000/no-such-page", { waitUntil: "domcontentloaded" });
const bodyText = await page.locator("body").innerText();
console.log(JSON.stringify({ status: res.status(), bodySnippet: bodyText.slice(0, 100) }));
EOF
```

### 7. API 라우트 보호 — 비인증 업로드 시도
**목적**: 로그인하지 않은 상태로 `/api/upload`를 직접 호출하면 401과 한글 에러 메시지를 반환하는지 확인.
**기대 결과**: `status: 401`, `body: {"error":"로그인이 필요합니다."}`.

```bash
dev-browser --headless <<'EOF'
const page = await browser.getPage("finsight");
await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
const apiRes = await page.evaluate(async () => {
  const res = await fetch("/api/upload", { method: "POST", body: new FormData() });
  return { status: res.status, body: await res.text() };
});
console.log(JSON.stringify(apiRes));
EOF
```

## 테스트 범위 밖 (사람 개입 필요)

아래 골든 패스 구간은 실제 Google 계정 로그인이 필요해 headless 자동화로 진행할 수 없다:

- CSV/PDF 업로드 → Claude 분석 → 대시보드 렌더(요약/도넛차트/추이차트/거래테이블)
- 4회째 업로드 시 quota 소진 → 블러 + 업그레이드 CTA
- 업그레이드 CTA → Polar 체크아웃 페이지
- 웹훅 수신 후 `is_pro` 갱신

이 구간을 확인하려면 사람이 직접 브라우저에서 Google 로그인을 마친 뒤, `dev-browser --connect`로 그 브라우저(Chrome `chrome://inspect/#remote-debugging` 활성화 필요)에 붙어서 이어서 스크립트를 실행한다. 배포 전 최종 검증 시 `phases/0-mvp/step16.md`의 골든 패스 체크리스트와 함께 사용한다.
