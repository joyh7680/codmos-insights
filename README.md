# codmos-insights

개발팀의 콘텐츠 유입·사용·재사용을 확인하는 독립 사이트입니다. 모든 수치와 배포 기록은 가상이며, 운영 API·Mixpanel·실제 사용자 데이터에 연결하지 않습니다.

## 실행

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```powershell
npm run dev
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. 서버 없이 보려면 `standalone.html`을 브라우저에서 엽니다.

## 구성

- `dist/index.html`: 사이트 레이아웃
- `dist/styles.css`: 반응형 스타일
- `dist/app.js`: 화면 이동, 기간·학급 필터, 차트, 지표 정의
- `dist/mock-data.js`: 일관된 가상 데이터와 집계
- `scripts/preview.mjs`: 루프백 전용 미리보기 서버
- `scripts/build-standalone.mjs`: 단일 파일 실행본 생성

최근 7일·30일·직접 선택, 학급 필터, 이전 기간 비교, 사용자·메시지 차트 전환, 배포일 표시, 콘텐츠 검색, 지표 정의 모달을 지원합니다. 첫 사용 그룹과 재사용 관찰 기간을 분리합니다.

가상 데이터 제공 기간은 2026-08-17~2026-10-25이며, 조회는 최대 31일입니다. 이 목업 자체에는 로그인이나 팀원 권한 관리 기능이 없으며, 호스팅의 접근 제어와 별개입니다.

## 검증 / 단일 파일 갱신

```powershell
npm run check
node scripts/build-standalone.mjs
```
