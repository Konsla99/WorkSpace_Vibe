---
name: portfolio_HtmlToPdfHtml
description: Syncs and reflects content updates from portfolio.html into portfolio_PDF.html when portfolio.html is completed, while preserving print-specific styles (like white main-wrapper background).
---

# portfolio_HtmlToPdfHtml 스킬 지침서

이 스킬은 웹용 포트폴리오(`portfolio.html`)가 완성되거나 업데이트되었을 때, 변경된 내용을 인쇄/PDF 변환용 포트폴리오(`portfolio_PDF.html`)로 수동 또는 자동 동기화할 때 적용할 지침을 제공합니다.

## 1. 실행 흐름
이 스킬은 기본 버전 및 AI 특화 버전에 모두 적용됩니다.

### 기본 버전
1. **웹용 HTML 읽기**: [portfolio.html](file:///D:/workspace_Gemini/ppt/portfolio.html)의 최신 소스 코드를 읽어와 변경된 본문(`<body>` 내부 콘텐츠 및 스타일 변경점)을 분석합니다.
2. **인쇄용 HTML 로드**: [portfolio_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_PDF.html) 파일을 열어 기존 상태를 파악합니다.
3. **콘텐츠 동기화**: `portfolio.html`의 최신 레이아웃과 텍스트를 `portfolio_PDF.html`에 복사 및 반영하되, 아래의 **PDF 전용 제약 및 스타일 예외 규칙**을 적용합니다.
4. **검증 및 빌드**: 변경된 `portfolio_PDF.html`의 마크업 정합성을 검증합니다.

### AI 특화 버전
1. **웹용 HTML 읽기**: [portfolioAI.html](file:///D:/workspace_Gemini/ppt/portfolioAI.html)의 최신 소스 코드를 읽어와 분석합니다.
2. **인쇄용 HTML 로드**: [portfolio_AI_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_AI_PDF.html) 파일을 엽니다.
3. **콘텐츠 동기화**: `portfolioAI.html`의 최신 레이아웃과 텍스트를 `portfolio_AI_PDF.html`에 복사 및 반영하되, `.main-wrapper` 배경색(`#FFFFFF`) 및 인쇄용 스타일 규칙을 준수합니다.
4. **검증 및 빌드**: 변경된 `portfolio_AI_PDF.html`의 마크업 정합성을 검증합니다.


---

## 2. PDF 전용 제약 및 스타일 예외 규칙

### A. 배경색 설정 유지
- 웹용([portfolio.html](file:///D:/workspace_Gemini/ppt/portfolio.html))의 `.main-wrapper` 배경색은 `var(--wrapper-bg)`로 설정되어 회색빛의 카드 형태를 이룹니다.
- 반면, 인쇄/PDF용([portfolio_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_PDF.html))의 `.main-wrapper` 배경색은 반드시 `#FFFFFF`(순수 흰색)이어야 합니다. 동기화 시 이 스타일 설정을 덮어쓰지 않도록 주의합니다.
  ```css
  /* portfolio_PDF.html 내 유지해야 할 스타일 */
  .main-wrapper {
      background-color: #FFFFFF;
      max-width: 1100px;
      margin: 60px auto;
      padding: 40px;
      border-radius: 20px;
  }
  ```

### B. 인쇄 레이아웃 및 페이지 분할 (Page Break)
- PDF 변환 시 텍스트나 카드가 인쇄 용지의 하단 경계선에서 반으로 잘리는 문제가 발생할 수 있습니다.
- 새로운 컴포넌트나 콘텐츠를 동기화할 때, 각각의 주요 카드(`.project-group`, `.experience-entry` 등)가 자연스럽게 페이지별로 나뉘어 출력될 수 있도록 `.page-break-before-me` 클래스를 구조에 적절히 할당합니다.
- `@media print` 내의 여백 제어 및 불필요한 요소 숨김(네비게이션 헤더, 푸터 등) 규칙이 유실되지 않도록 확인합니다.

---

## 3. 검증 및 마무리 지침
- **콘텐츠 정합성**: 인물 프로필, 학력 기간, 기술 스택명, 프로젝트 상세 실적 수치가 두 파일 간 완벽하게 일치하는지 한 번 더 확인합니다.
- **태그 정합성**: 복잡한 HTML 노드를 복사하는 과정에서 닫히지 않은 `<div>`나 `<ul>` 태그가 발생하지 않도록 주의합니다.
