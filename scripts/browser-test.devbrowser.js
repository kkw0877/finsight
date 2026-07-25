// dev-browser 샌드박스 전용 스크립트. `dev-browser --headless < scripts/browser-test.devbrowser.js`
// 로 실행한다 (직접 실행 진입점은 scripts/browser-test.sh). docs/BROWSER_TESTING.md에 문서화된
// 7개 시나리오를 그대로 코드화하고, 결과를 마커로 감싼 JSON으로 출력한다.

function arraysEqual(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((v, i) => v === b[i])
  );
}

const results = [];

function record(name, pass, details) {
  results.push({ name, pass, details });
}

// 1. 랜딩 페이지 요소 검증
{
  const page = await browser.getPage("finsight");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  const h1 = await page.locator("h1").textContent();
  const ctaVisible = await page.getByRole("button", { name: "Google로 로그인" }).isVisible();
  const cardTitles = await page.locator("h2").allTextContents();
  const expectedCards = ["CSV 업로드", "자동 카테고리 분류", "지출 비중 한눈에", "월별 추이 파악"];
  const pass =
    h1 === "카드 명세서를 올리면, 소비 패턴을 정리해드립니다" &&
    ctaVisible === true &&
    arraysEqual(cardTitles, expectedCards);
  record("1. 랜딩 페이지 요소 검증", pass, { h1, ctaVisible, cardTitles });
}

// 2. 모바일 반응형 (375px)
{
  const page = await browser.getPage("finsight");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  const hasHorizontalScroll = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  const buf = await page.screenshot({ fullPage: true });
  const screenshotPath = await saveScreenshot(buf, "finsight-mobile.png");
  const pass = hasHorizontalScroll === false;
  record("2. 모바일 반응형 (375px)", pass, { hasHorizontalScroll, screenshotPath });
  await page.setViewportSize({ width: 1280, height: 800 });
}

// 3. 라우트 보호 — 비인증 /dashboard 접근
{
  const page = await browser.getPage("finsight");
  const response = await page.goto("http://localhost:3000/dashboard", { waitUntil: "domcontentloaded" });
  const finalUrl = page.url();
  const status = response.status();
  const pass = finalUrl === "http://localhost:3000/login" && status === 200;
  record("3. 라우트 보호 - /dashboard", pass, { finalUrl, status });
}

// 4. 로그인 페이지 요소 검증
{
  const page = await browser.getPage("finsight");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  const h1 = await page.locator("h1").textContent();
  const desc = await page.locator("p").textContent();
  const btnVisible = await page.getByRole("button", { name: "Google로 로그인" }).isVisible();
  const pass = h1 === "FinSight" && btnVisible === true && typeof desc === "string" && desc.length > 0;
  record("4. 로그인 페이지 요소 검증", pass, { h1, desc, btnVisible });
}

// 5. Google 로그인 리다이렉트 (실제 로그인은 진행하지 않음)
{
  const page = await browser.getPage("finsight");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.getByRole("button", { name: "Google로 로그인" }).click();
  await page.waitForTimeout(2000);
  const finalUrl = page.url();
  const pass = finalUrl.startsWith("https://accounts.google.com/");
  record("5. Google 로그인 리다이렉트", pass, { finalUrl });
}

// 6. 404 처리
{
  const page = await browser.getPage("finsight");
  const res = await page.goto("http://localhost:3000/no-such-page", { waitUntil: "domcontentloaded" });
  const bodyText = await page.locator("body").innerText();
  const status = res.status();
  const pass = status === 404 && bodyText.includes("This page could not be found.");
  record("6. 404 처리", pass, { status, bodySnippet: bodyText.slice(0, 100) });
}

// 7. API 라우트 보호 — 비인증 업로드 시도
{
  const page = await browser.getPage("finsight");
  await page.goto("http://localhost:3000", { waitUntil: "domcontentloaded" });
  const apiRes = await page.evaluate(async () => {
    const res = await fetch("/api/upload", { method: "POST", body: new FormData() });
    return { status: res.status, body: await res.text() };
  });
  const pass = apiRes.status === 401 && apiRes.body.includes("로그인이 필요합니다");
  record("7. API 라우트 보호 - /api/upload", pass, apiRes);
}

const allPass = results.every((r) => r.pass);
console.log("===BROWSER_TEST_RESULT_JSON_START===");
console.log(JSON.stringify({ allPass, results }, null, 2));
console.log("===BROWSER_TEST_RESULT_JSON_END===");
