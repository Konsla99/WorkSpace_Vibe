---
name: portfolio_MdToHtml
description: Syncs and reflects updates from portfolio_input.md into portfolio.html and portfolio_PDF.html. Triggers when the user requests to update, compile, sync, or reflect the markdown changes.
---

# portfolio_MdToHtml 스킬 지침서

이 스킬은 `portfolio_input.md` 파일의 변경 사항을 웹용 포트폴리오(`portfolio.html`) 및 인쇄용 포트폴리오(`portfolio_PDF.html`)에 정밀하게 수동 동기화하는 가이드를 제공합니다.

## 1. 실행 흐름
1. **마크다운 읽기**: [portfolio_input.md](file:///D:/workspace_Gemini/ppt/portfolio_input.md) 파일의 내용을 읽고 최신 정보를 파악합니다.
2. **변경사항 식별**: 기존 HTML과 비교하여 인적사항, 경력, 학력, 기술 스택, 프로젝트 및 사이드 프로젝트 등 변경된 요소를 매핑합니다.
3. **HTML 파일 로드**:
   - 웹용: [portfolio.html](file:///D:/workspace_Gemini/ppt/portfolio.html) (`.main-wrapper` 배경색: `var(--wrapper-bg)`)
   - 인쇄용: [portfolio_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_PDF.html) (`.main-wrapper` 배경색: `#FFFFFF`)
4. **수동 편집 및 반영**: 각 파일의 HTML 레이아웃 구조와 스타일을 손상시키지 않고 본래 양식에 맞춰 변경 사항을 적용합니다.
5. **양 파일 동일성 검증**: 두 파일의 정보 동기화 상태를 최종 체크합니다.

---

## 2. 영역별 HTML 양식 반영 규칙

### A. 개인 정보 (About Me)
- **자기소개 및 연락처**: `#about` 내부의 자기소개 문구와 이메일, 전화번호, 거주지, 깃허브 주소를 업데이트합니다.
- **프로필 이미지**: 지정된 경로로 `<img class="profile-image">`의 `src` 속성을 동기화합니다.

### B. 회사 경력 (Experiences)
- **양식 구조**:
  ```html
  <div class="experience-entry">
      <div class="item-header">
          <div>
              <h4 class="item-title">회사명 <span class="department-inline">- 부서명</span></h4>
              <span class="item-period">기간 (직급/역할)</span>
          </div>
      </div>
      <div class="item-body">
          <ul>
              <li>수행 업무 내용 1</li>
              <li>수행 업무 내용 2</li>
          </ul>
      </div>
  </div>
  ```
- **주의**: 각 경력 엔트리 사이에 `experience-entry` 클래스와 구분선이 온전히 유지되는지 확인합니다.

### C. 학력 (Education)
- **양식 구조**:
  ```html
  <p class="education-entry">
      <span class="school-details"><strong>학교명 / 전공</strong> (상태)</span>
      <span class="education-duration">(기간)</span>
  </p>
  ```

### D. 기술 스택 (Skills)
- **아이콘 매핑**: 기술 이름에 적합한 Devicon 클래스를 찾아서 매핑합니다.
  - *예시*: C++ -> `devicon-cplusplus-plain colored`, Python -> `devicon-python-plain colored`, Linux -> `devicon-linux-plain colored`
  - *매핑이 없는 신규 스택*: `devicon-code-plain`를 폴백 아이콘으로 사용하여 정렬을 유지합니다.

### E. 회사 프로젝트 및 사이드 프로젝트 (Projects / Side Projects)
- **그룹 카드 구조 (`.project-group`)**: 
  - 각 프로젝트는 대개 **개요 카드**와 **추가 내용 및 결과 카드**의 두 개의 `project-wide-card`를 묶은 `project-group` 구조를 가집니다.
- **이미지 배치**:
  - 대표 이미지 및 추가 이미지가 존재할 때 `flex` 레이아웃(`display: flex; gap: 25px;`)을 사용하여 왼쪽에는 이미지(또는 Before/After 스택), 오른쪽에는 프로젝트 상세 항목(`project-details`)이 위치하도록 구성합니다.
  - 마크다운에 너비 비율(예: `| 50%`)이 지정된 경우, 해당 이미지 요소를 `<div style="width: 50%; margin: 0 auto;">`로 감싸 반응형 크기를 유지합니다.
- **상세 내용 리스트**:
  - `프로젝트 목적`, `수행 업무`, `상세 기능 소개`, `성과`는 기존 HTML의 `<h5>` 타이틀과 `<ul>/<li>` 구조를 유지합니다.
  - 사용 기술은 `.tech-stack` 내에 `<span class="tech">기술명</span>` 구조로 반영합니다.

---

## 3. 검증 및 마무리 지침
- **배경색 차이 유지**: 웹용 [portfolio.html](file:///D:/workspace_Gemini/ppt/portfolio.html)과 인쇄용 [portfolio_PDF.html](file:///D:/workspace_Gemini/ppt/portfolio_PDF.html)의 `.main-wrapper` 배경색(각각 `var(--wrapper-bg)`와 `#FFFFFF`) 차이를 훼손하지 않아야 합니다.
- **태그 닫힘 체크**: 다량의 복잡한 HTML 카드를 수정하므로 `<div>`, `<ul>` 등 열고 닫는 태그의 쌍이 정확한지 확인합니다.
- **인쇄 여백 검사**: PDF 버전 인쇄 시 페이지가 부자연스럽게 잘리지 않도록 추가된 프로젝트 앞단에 `.page-break-before-me` 클래스 속성이 적절히 지정되었는지 점검합니다.
