# 작업 인수인계 (새 세션용)

새 Claude 세션을 시작하면 **이 파일을 먼저 읽고** 이어서 작업한다.
마지막 갱신: 2026-11-27

## 사용자 / 진행 방식
- 사용자는 한국어로 소통. 휴대폰(안드로이드, 삼성)으로 작업하고 PC 없이 클라우드로만 빌드한다.
- 플레이 콘솔은 **조직 계정** → 비공개 테스트(12명/14일) 필요 없음. **테스트 단계는 언급하거나 묻지 말고 바로 프로덕션**으로 안내.
- 작업 브랜치: `claude/family-anniversary-app-n862gh` (저장소 기본 브랜치). 커밋 메시지는 한국어.
- 푸시할 때 커밋 메시지에 `[skip ci]` 를 붙이고, 빌드는 Actions 의 workflow_dispatch 로 직접 실행한다.
  (push 로 자동 실행된 빌드는 Releases 업로드가 403 으로 실패한 적이 있음. 직접 실행하면 정상)

## 앱 개요
- Expo SDK 58 (React Native, Expo Router) + Firebase (Firestore, Auth) + expo-notifications
- 구글 로그인만 사용 (@react-native-google-signin + Firebase signInWithCredential). 예전 익명 계정은 링크로 이전됨.
- 가족 그룹(탭) 여러 개, 초대코드(=그룹 문서 ID, 6자리)만으로 참여. 비밀번호 없음.
- 가입자 목록(members)은 **방장만** 볼 수 있음 (보안 규칙 + 설정 화면). '해당 인물'은 별도 `people` 컬렉션.
- 같은 기념일(이름·날짜·반복 방식)이 여러 그룹에 있으면 알림 1번, 그룹 이름 함께 표시 (`src/lib/merge.ts`).
- 알림: 기념일 당일 오전 9시 로컬 알림. 매년/1회 선택.
- 설정에 회원 탈퇴 있음 (플레이 정책).
- 디자인: `design/` 의 시안과 아이콘 원본을 기준으로 홈 화면을 구현 (`src/components/Decor.tsx`, `src/app/index.tsx`).

## 빌드 (GitHub Actions)
| 워크플로 | 결과물 | 버전 |
|---|---|---|
| `android-apk.yml` "안드로이드 앱 만들기" | 가족용 APK (디버그 키 서명) → Releases `v1.0.N` | versionCode = run_number |
| `android-release.yml` "플레이 스토어용 앱 만들기" | 스토어용 AAB (업로드 키 서명) → Releases `store-1.1.N` (prerelease) | versionCode = 1000 + run_number |

- 가족용 APK 와 스토어 버전은 서명이 달라서 서로 덮어 설치 불가 (지우고 설치, 기록은 계정에 있음).
- 스토어 빌드의 서명 설정은 `plugins/withReleaseSigning.js` (RELEASE_STORE_FILE 환경 변수가 있을 때만 적용).

### GitHub 시크릿 (값은 GitHub 에만 있음, 저장소에 없음)
`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`,
`FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `GOOGLE_WEB_CLIENT_ID`,
`RELEASE_KEYSTORE_BASE64`, `RELEASE_KEY_PASSPHRASE`

### 업로드 키 (중요)
- 키 파일은 **저장소에 올리지 않는다** (공개 저장소). 사용자가 구글 드라이브 등에 백업한 파일 2개가 원본:
  `RELEASE_KEYSTORE_BASE64.txt`, `RELEASE_KEY_PASSPHRASE.txt`
- 업로드 키 SHA-1: `CE:71:53:92:D2:1B:19:DC:82:3A:82:2D:BD:14:CA:08:77:2F:A4:AF` (alias `upload`)
- 키를 잃어버리면 플레이 콘솔 → 앱 무결성 → 업로드 키 재설정 요청.

## Firebase 설정 상태
- Authentication: Google 사용 설정, 익명도 켜져 있음(예전 계정 이전용).
- Firestore 규칙: 저장소 `firestore.rules` 를 콘솔에 게시함. 규칙을 바꾸면 사용자가 콘솔에 다시 붙여넣어야 함.
- Firebase 안드로이드 앱 `com.happyfamily.anniversarymemo` 등록됨. 등록된 SHA-1:
  - 디버그 키(가족용 APK): `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`
  - 업로드 키, 그리고 **플레이 앱 서명 키 SHA-1 (플레이 콘솔 → 앱 무결성)** 도 추가해야 함 → 아래 진행 상황 참고

## 스토어 자료
- 개인정보처리방침: https://happyfamily1984.github.io/Anniversarymemo/privacy.html (주소의 **A 대문자** 필수)
- 계정 삭제 안내: https://happyfamily1984.github.io/Anniversarymemo/delete-account.html
- GitHub Pages: 브랜치 `claude/family-anniversary-app-n862gh` 의 `/docs`
- 연락처 이메일: 정책 페이지에 공개됨 (docs/privacy.html 참고)
- 소개 문구·데이터 보안 답변: `store/listing.md`, 이미지: `store/icon-512.png`, `store/feature-graphic-1024x500.png`

## 진행 상황 (2026-11-27 기준)
- [x] 가족용 APK v1.0.11 (새 디자인) 배포
- [x] 스토어용 AAB `store-1.1.1` 빌드 (업로드 키 서명 확인)
- [x] 정책 페이지 공개, 연락처 이메일 입력
- [ ] 플레이 콘솔: 앱 만들기 → 앱 콘텐츠 → 스토어 등록정보 → 프로덕션에 AAB 업로드
- [ ] 플레이 앱 서명 키 SHA-1 을 Firebase 안드로이드 앱에 추가 (안 하면 스토어 버전에서 구글 로그인 DEVELOPER_ERROR)
- [ ] 프로덕션 검토 제출 → 승인 후 공개
  (위 3개는 사용자에게 안내만 한 상태. 실제 진행 여부는 사용자에게 확인)

## 참고: 아이콘 다시 만들기
`design/app-icon-original.png` 에서 가운데 둥근 사각형 안쪽(중심 626,630 / 반경 470)을 잘라
`assets/icon.png`(흐린 배경 위 90%), `android-icon-foreground.png`(62%, 가장자리 페더), `android-icon-background.png`(흐린 확대본),
`splash-icon.png`(둥근 사각형만 투명 배경) 를 만들었다. 홈 화면의 TODAY 달력·케이크 그림(`assets/images/`)은
`design/home-mockup-1.png` 에서 잘라 가장자리를 투명하게 처리한 것.
