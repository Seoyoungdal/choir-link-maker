# 찬양링크 (Choir Link Maker)

찬양곡 정보를 입력하면 YouTube에서 전체·소프라노·알토·테너·베이스 연습 영상을 찾고, 카카오톡에 바로 붙여 넣을 공지문을 만들어 주는 웹앱입니다.

## 주요 기능

- 출판사·성가곡집·찬양곡 제목을 조합한 YouTube 검색
- 전체·소프라노·알토·테너·베이스 영상 자동 분류
- 찬양대용 공지문과 자막팀용 공지문 생성
- 공지문 한 번에 복사
- 다음 주일 날짜 자동 입력 및 직접 수정
- 모바일·데스크톱 반응형 화면

## 사용하기

배포된 앱: [찬양링크 열기](https://youtube-topic-recommender.youngdal.chatgpt.site)

처음 사용할 때 YouTube Data API v3 키가 필요합니다. 입력한 키는 서버나 저장소로 전송되지 않고 사용 중인 브라우저의 `localStorage`에만 저장됩니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm ci
npm run dev
```

## 기술 구성

- React 19
- Next.js 16
- Vinext / Vite
- Cloudflare Workers
- YouTube Data API v3

## 보안

YouTube API 키와 개인 설정값은 소스 코드에 포함되어 있지 않습니다. 공개 배포 시에는 Google Cloud Console에서 API 키의 웹사이트 및 API 사용 범위를 제한하는 것이 좋습니다.
