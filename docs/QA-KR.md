# RepoRun v1.0.1 변경·검증 보고서

기준 패키지: 이 대화에서 제공한 RepoRun-v1.0.0-source.zip. 원격 저장소에는 쓰기 작업을 하지 않았습니다.

## 변경 범위

저장소 헤더의 실행 조건 버튼을 제거하고, 우측 About 블록 하단으로 옮겼습니다. 우측 사이드바를 확실하게 식별할 수 없거나 숨겨지거나 좁거나 본문 아래에 쌓이면 우측 하단의 44 × 44px 아이콘 전용 버튼으로 전환합니다. 플로팅 위치는 기본 우측/하단 16px이며 safe-area inset을 고려합니다. 상시 큰 카드나 상단 추가 버튼은 없습니다.

같은 버튼 노드를 이동하며, GitHub가 캐시한 오래된 호스트 복사본을 제거합니다. 리사이즈·DOM 교체·기본적인 GitHub 내부 이동에 대응합니다. EN/KR 접근명·툴팁·키보드 포커스와 패널 닫기 후 포커스 복원을 유지합니다. 플로팅 버튼은 패널이 열리는 동안 숨겨집니다.

블루 #2563eb와 흰색 체크리스트·돋보기 로고를 SVG 원본으로 구성했습니다. 설치/관리/도구 모음 PNG 16·32·48·128px, 사이드바/플로팅/패널/설정/팝업, 도움말/개인정보 처리방침 로고와 파비콘, README 및 배포 dist/ZIP을 같은 원본으로 맞췄습니다. 선언된 조건은 여전히 명시됨/추정됨/확인되지 않음으로 구분하며, 체크 로고는 실행 성공이나 안전성 보증이 아닙니다.

## 코드 보존 확인

src/background의 GitHub API·서비스·저장·메시지 처리 파일 4개는 이전 버전과 바이트 단위로 같습니다. 분석기, 공통 UI 헬퍼, 패널·설정·팝업 JS도 같습니다. core.js는 버전 상수만 변경했습니다. UI 파일들은 변경된 공통 로고·CSS를 사용합니다. permissions, host_permissions, web_accessible_resources는 이전과 같습니다. 네이티브 fetch 바인딩 및 세션 토큰 방식은 유지됩니다.

해시 근거: qa-results/preservation.json.

## 실제 수행한 검증

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| Node 회귀 | 104개 통과 | 분석·API·저장·메시지 경계, 기존 테스트 재실행 |
| Chromium 기존 앱 통합 | 46개 통과 | 기존 기능 UI, 모의 Chrome/API, 실제 Dedicated Worker fetch |
| Chromium 배치 회귀 | 40개 통과 | 사이드바/폴백, 리사이즈, 숨김/삭제/복원, 늦은 로딩, 중복 방지, 포커스, EN/KR, 헤더 보존 |
| 문서·이미지·악성 텍스트 | 26개 통과 | 라이트/다크, PNG 크기, 로고 디코딩, export 핸들러, HTML 미실행 |
| 설치 패키지 | 33개 통과 | ZIP CRC, dist 바이트 일치, 버전/권한/참조/로고 해시, 등록 문구 길이 |

실행 브라우저: Chromium 144.0.7559.96. 기존 UI와 배치 검사에서 미처리 JavaScript 오류 0개.

배치 검사에는 헤더에 Activities·Delta·Star가 있는 합성 DOM을 사용했습니다. 해당 DOM의 HTML이 전후 동일한지 비교했으며, RepoView/RepoDelta 실제 확장을 동시 설치한 검증은 아닙니다. 내부 검사 결과 JSON과 재실행 스크립트를 소스에 포함했습니다.

## 네이티브 설치·라이브 검증의 경계

일반적인 unpacked extension 로드를 실제로 시도했으나 서비스 워커를 얻지 못했고, chrome://extensions/ 탐색은 ERR_BLOCKED_BY_ADMINISTRATOR로 막혔습니다. 관리 정책은 변경하거나 우회하지 않았습니다. 기록: qa-results/native-install.json.

따라서 실제 Chrome 관리 화면/도구 모음 아이콘, 실제 GitHub DOM에서의 사이드바 배치, 실계정 PAT 및 최신 빌드의 네이티브 MV3 동작은 이 환경에서 인증하지 않았습니다. 기존 1.0.0의 사용자 정상 동작 확인과 이번 1.0.1의 로컬 회귀 검증을 구분합니다. 제공 스크린샷은 실제 앱 소스를 로컬 Chromium에서 렌더링한 모의 저장소 화면이며 실제 GitHub 캡처가 아닙니다.

다운로드/클립보드는 생성 텍스트와 핸들러를 확인한 범위이고 운영체제 클립보드 및 실제 다운로드 완료 검증이 아닙니다. Dedicated Worker의 data: 응답 200은 receiver 회귀 검증일 뿐 GitHub HTTP 200 또는 MV3 설치 인증이 아닙니다.

## 재실행

```sh
npm run package
python tests/browser_qa.py
python tests/placement_qa.py
python tests/document_qa.py
python tests/package_qa.py
python tests/native_install_probe.py
```

Node 작업에는 Node.js 22+만 필요합니다. 브라우저 검사에는 Python·Playwright·Chromium, 문서/패키지 검사에는 Pillow가 필요합니다. 아이콘 재생성만 CairoSVG가 필요합니다. UI 스크린샷은 docs/screenshots에 저장됩니다. 설치 ZIP에는 QA·테스트·문서용 소스가 포함되지 않습니다.

## 업데이트

기존 로드 폴더에 설치 ZIP의 파일을 덮어쓰고 chrome://extensions에서 RepoRun 재로드 후 버전 1.0.1을 확인하세요. 열려 있던 GitHub·설정 탭을 새로고침합니다. 새 폴더를 기존 확장과 동시에 추가 로드하면 두 버전이 별개로 동작할 수 있으므로 피합니다. 세션 토큰/캐시는 재로드 시 삭제되므로 필요하면 다시 입력합니다.

GitHub 반영에는 전체 소스 ZIP의 RepoRun 내부 파일을 저장소 루트에 반영하세요. 공개 방침 페이지에는 public/privacy-policy.html, document.css, icons를 함께 배포합니다. 별도로 업로드한 웹스토어 아이콘/스크린샷은 대시보드에서도 교체해야 합니다. GitHub 푸시·Pages 배포·스토어 제출은 수행하지 않았습니다.

## 스토어 등록 글자 수

- Single Purpose: 481자
- storage: 606자
- Host access: https://github.com/*: 627자
- Host permission: https://api.github.com/*: 684자

각 필드 본문은 공백 포함 1,000자 이내입니다. Description에 별도 Key Features 제목은 없습니다.
