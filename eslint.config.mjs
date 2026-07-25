import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // browser-test.devbrowser.js는 Node가 아니라 dev-browser의 QuickJS 샌드박스 전용 스크립트라
    // browser/saveScreenshot 등 이 프로젝트가 모르는 전역을 사용한다 — lint 대상에서 제외한다.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "scripts/browser-test.devbrowser.js"],
  },
];

export default eslintConfig;
