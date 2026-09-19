# RepoRun 로고 관리

[English](BRANDING.md) · [README](../README-KR.md)

1.0.1 로고는 블루 바탕의 흰색 체크리스트 두 항목과 돋보기입니다. 터미널이나 실행 버튼이 아닌, 명시된 실행 조건을 확인하는 도구를 뜻합니다. 체크 표시는 실행 가능성·안전성의 인증을 의미하지 않습니다. 글꼴이나 문자 없이 벡터 도형으로 구성했습니다.

기본 블루 `#2563eb`, hover `#1d4ed8`, 다크 모드 포인트 `#79a9ff`를 사용합니다. `public/icons/logo.svg`가 원본이며 `python scripts/icons.py`로 16·32·48·128px PNG 및 `assets.json` 해시를 일괄 생성합니다. 원본·파생 파일이 맞지 않으면 check/build가 실패합니다. 재생성만 CairoSVG가 필요하고 일반 빌드에는 필요하지 않습니다.

사이드바·플로팅 버튼·패널·설정·팝업·README·도움말·개인정보 처리방침에 같은 로고를 사용합니다. 파비콘에는 버전이 붙은 PNG 경로를 씁니다. GitHub에 공개하는 리소스는 기존처럼 SVG 한 파일이며 새 권한은 없습니다.

로고 변경 후 `npm run package`로 dist와 설치 ZIP까지 다시 만들고 스크린샷도 갱신하세요. Chrome Web Store 대시보드에 별도로 업로드한 아이콘·스크린샷은 별도 교체 대상입니다.
