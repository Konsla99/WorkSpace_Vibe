# 프로젝트 규칙 및 개요 (AGENTS.md)

이 문서는 채민기 개발자의 포트폴리오 웹사이트 구축 프로젝트에 대한 개요, 구조 및 작업 규칙을 정의합니다.

## 1. 프로젝트 목적
*   **목적**: 제공된 PDF 파일('채민기 _ 개발자 포트폴리오.pdf') 및 `project_context.md` 파일에 기록된 개발 경력과 프로젝트 세부 내용을 바탕으로, 깔끔하고 직관적인 개발자 포트폴리오 웹사이트(`portfolio.html`)를 구축하고 유지보수합니다.
*   **주요 특징**:
    *   PDF 인쇄 및 웹 브라우저 뷰어 모두에 최적화된 반응형 웹사이트.
    *   단일 파일 구조(HTML 내부에 CSS 및 JavaScript 포함)를 유지하여 배포 및 공유가 용이함.

## 2. 프로젝트 디렉터리 구조 및 파일 설명
*   `portfolio.html`: 최종 포트폴리오 웹사이트 메인 파일 (CSS, JS 포함).
*   `portfolio_PDF.html`: PDF 인쇄를 위한 전용 버전 (인쇄 시 배경색 제거 및 페이지 분할 최적화 적용).
*   `portfolio_backup.html`: 이전 상태 백업용 포트폴리오 파일.
*   `portfolio_input.md`: (단일 진실 공급원) 사용자가 포트폴리오 정보(경력, 프로젝트, 기술 등)를 수정/추가하는 원본 데이터 파일.
*   `portfolioAI.html`: AI 활용 역량을 강조한 포트폴리오 웹사이트 메인 파일.
*   `portfolio_AI_PDF.html`: AI 활용 역량 포트폴리오의 PDF 인쇄용 전용 버전 (배경색 제거 및 페이지 분할 최적화 적용).
*   `portfolio_AI_input.md`: (단일 진실 공급원) AI 특화 포트폴리오 정보의 원본 데이터 파일.
*   `project_context.md`: 포트폴리오에 포함된 프로젝트(스캐너 정보관리 App, 연조직 제거 기능 개선 등)의 상세 스펙과 성과가 정리된 마크다운 문서.
*   `지시사항.txt`: 프로젝트 구현 시 준수해야 할 디자인 및 기술적 가이드라인 정의.
*   `히스토리.txt`: 포트폴리오 파일의 변경 이력 및 레이아웃 수정 요약본.
*   `이미지/`: 포트폴리오 프로젝트 카드에 적용될 UI 스크린샷 이미지들이 위치한 폴더.
*   `참고자료/`: 포트폴리오 제작 및 검토 시 참고하는 보조 자료 폴더.
*   `채민기 _ 개발자 포트폴리오.pdf`: 포트폴리오의 원본 데이터가 수록된 PDF 파일.
*   `.agents/AGENTS.md`: (본 파일) 에이전트의 작업 지침 및 프로젝트 구조 요약 문서.

## 3. 에이전트 작업 지침 및 제약사항
*   **단일 진실 공급원(Single Source of Truth) 준수**:
    *   기본 버전: 포트폴리오 정보는 [portfolio_input.md](file:///D:/workspace_Gemini/ppt/portfolio_input.md)를 기준으로 관리하며, 수정 요청 시 [portfolio.html](file:///D:/workspace_Gemini/ppt/portfolio.html)과 [portfolio_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_PDF.html)에 수동 반영합니다.
    *   AI 특화 버전: 포트폴리오 정보는 [portfolio_AI_input.md](file:///D:/workspace_Gemini/ppt/portfolio_AI_input.md)를 기준으로 관리하며, 수정 요청 시 [portfolioAI.html](file:///D:/workspace_Gemini/ppt/portfolioAI.html)과 [portfolio_AI_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_AI_PDF.html)에 수동 반영합니다.
*   **단일 파일 유지**: 모든 스타일과 스크립트는 HTML 내부의 `<style>` 및 `<script>` 태그 내에 작성하며, 외부 CSS/JS 파일로 분리하지 않습니다.
*   **디자인 테마**: 깔끔한 화이트/그레이 배경에 딥 퍼플 포인트 컬러(`#6200EA`)를 사용합니다.
*   **인쇄(PDF) 대응 및 두 파일의 차이점**:
    *   웹용 스타일과 인쇄용 스타일(page break 규칙 등)이 충돌하지 않도록 관리해야 하며, 인쇄 시 페이지가 이상하게 잘리지 않도록 `@media print` 스타일을 관리합니다.
    *   웹용(`portfolio.html`, `portfolioAI.html`)은 `.main-wrapper`의 배경색을 `var(--wrapper-bg)` (회색)으로 설정합니다.
    *   PDF용(`portfolio_PDF.html`, `portfolio_AI_PDF.html`)은 `.main-wrapper`의 배경색을 `#FFFFFF` (흰색)으로 설정하여 PDF 출력 시 회색 배경이 나타나지 않도록 유지합니다.
*   **텍스트 유지**: 이력서 및 프로젝트 명세의 원본 데이터(소속, 기간, 업무, 성과, 기술 스택)를 생략하거나 축소하지 않고 그대로 유지합니다.

