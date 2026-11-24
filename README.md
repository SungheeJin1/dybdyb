# DYB 학생 제출 알림

[DYB 면접 연습 사이트](https://consultingdyb.wixstudio.com/interview)의 **학생 피드백** 목록을 30분마다 확인합니다.
지정한 학생(예: `홍길동`)이 새로 제출하면 iPhone으로 푸시 알림을 보냅니다.

```
홍길동 학생 새 제출
진로·인성 3 · 존경하는 인물
홍길동 · 2026-101 · 1차 · 11월 24일 오전 10:10
상태: 제출 완료(피드백 대기 중)
```

## 동작 방식

1. GitHub Actions가 정해진 시간마다 Chrome을 열어 사이트에 접속합니다. 저장된 로그인 세션이 만료됐으면 선생님 계정으로 다시 로그인합니다.
2. 사이트가 '학생 피드백' 표를 그릴 때 받는 데이터(`adminList`)를 그대로 읽습니다. 표 행 아래 회색 글씨의 **학생 이름 · 학생 번호**와 같은 값입니다.
3. 학생 이름이나 학생 번호가 `TARGET_NAMES`와 같고, 상태가 **제출 완료(피드백 대기 중)** 이면서 아직 알리지 않은 제출이면 [ntfy](https://ntfy.sh)로 푸시를 보냅니다.
4. 이미 알린 제출 목록과 로그인 세션은 암호화해서 다음 실행에 넘깁니다(Actions 캐시).

과제명에 이름이 들어 있어도 학생 이름이 다르면 알리지 않습니다. 재제출(2차, 3차…)은 새 제출로 보고 다시 알립니다.

## 설정 (처음 한 번)

### 1. iPhone에 ntfy 설치

1. App Store에서 **ntfy** 앱을 설치하고 알림을 허용합니다.
2. `+`를 눌러 토픽을 구독합니다. 서버는 기본값(`ntfy.sh`) 그대로 둡니다.
   - 토픽 이름은 **남이 추측할 수 없게 길고 무작위로** 정하세요. 예: `dyb-7f3k9q2m8x4w`
   - ntfy.sh 토픽은 이름만 알면 누구나 구독할 수 있습니다. 토픽 이름이 비밀번호 역할을 합니다. 알림에는 학생 이름과 과제명이 들어갑니다.

### 2. GitHub Secrets 등록

저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 아래 값을 등록합니다.

| 이름 | 값 |
| --- | --- |
| `WIX_EMAIL` | '학생 피드백' 메뉴가 보이는 선생님(관리자) 계정 이메일 |
| `WIX_PASSWORD` | 그 계정 비밀번호 |
| `NTFY_TOPIC` | 1단계에서 정한 토픽 이름 |
| `TARGET_NAMES` | 알림 받을 학생 이름. 여러 명이면 쉼표로 구분 (예: `홍길동, 김철수`). 학생 번호(`2026-101`)도 됩니다. |

> 로그인 창에서 **이메일 + 비밀번호**로 로그인하는 계정이어야 합니다. Google·Facebook 계정으로만 로그인한다면 자동 로그인이 되지 않습니다.

### 3. main 브랜치에 병합

GitHub의 예약 실행은 기본 브랜치(`main`)에 있는 워크플로만 돌립니다. 이 브랜치를 `main`에 병합하세요.

### 4. 시험 실행

1. 저장소 **Actions** 탭 → **학생 제출 알림** → **Run workflow**에서 `mode`를 **test-notify**로 실행합니다. 폰에 "테스트 알림"이 오면 ntfy 설정은 끝났습니다.
2. 다시 **Run workflow**에서 **run**으로 실행합니다. 로그인과 목록 확인이 잘 되면 "학생 제출 알림 시작" 푸시가 옵니다.
   - 첫 실행에서는 지금 목록에 이미 있는 제출을 알림 없이 기록만 합니다. 이후 새로 들어오는 제출부터 알립니다.

이제 30분마다 자동으로 확인합니다.

## 선택 설정 (Variables)

**Settings → Secrets and variables → Actions → Variables** 탭에 넣습니다.

| 이름 | 기본값 | 설명 |
| --- | --- | --- |
| `WATCH_STATUSES` | `SUBMITTED` | 알림 대상 검토 상태. `SUBMITTED`(제출 완료·피드백 대기), `REVISION_REQUESTED`, `FEEDBACK_READY`, `COMPLETED`, 또는 전부 `ALL`. 쉼표로 여러 개. |
| `NOTIFY_EXISTING` | (없음) | `true`면 첫 실행 때 이미 목록에 있는 제출도 알립니다. |

## 실행 주기와 Actions 사용량

`.github/workflows/watch.yml`의 `cron` 줄에서 바꿉니다. 기본값은 **한국 시간 07시~다음날 01시, 30분마다**입니다.

비공개 저장소는 GitHub Actions 무료 사용량이 **월 2,000분**입니다(Pro는 3,000분). 한 번 실행에 1분 이내라서 기본 설정은 한 달 약 1,100분을 씁니다.

| 간격 | cron 예시 (UTC) | 월 사용량(대략) |
| --- | --- | --- |
| 30분 (기본, 07–01시) | `7,37 22-23,0-15 * * *` | 1,100분 |
| 20분 (07–01시) | `7,27,47 22-23,0-15 * * *` | 1,700분 |
| 15분 (24시간) | `*/15 * * * *` | 공개 저장소에서만 권장 |

GitHub 예약 실행은 몇 분씩 늦게 시작될 수 있습니다. 공개 저장소는 Actions 사용량 제한이 없습니다. 로그에는 학생 이름이 남지 않고 건수만 남습니다.

## 오류가 나면

- 로그인에 실패하거나 확인이 2번 연속 실패하면 "학생 제출 알림 오류" 푸시가 옵니다. 오류가 계속되는 동안에는 6시간에 한 번만 알립니다.
- GitHub도 실패한 실행을 이메일로 알려줍니다. 실패한 실행의 **Artifacts**에 그때 화면(`failure-screenshot`)이 3일간 남습니다.
- **로그인 실패**: `WIX_EMAIL` / `WIX_PASSWORD`를 확인하세요. 비밀번호를 바꾸면 Secret도 바꿔야 합니다.
- **reCAPTCHA 확인 창**: Wix가 자동 로그인을 의심한 경우입니다. 다음 실행에서 다시 시도합니다. 계속 반복되면 GitHub 실행 환경에서의 자동 로그인이 막힌 것입니다.
- **사이트 구조가 바뀜**: 사이트 화면이나 백엔드 이름이 크게 바뀌면 이 프로그램도 고쳐야 합니다.

## 내 컴퓨터에서 실행 (선택)

Node.js 20 이상과 Chrome이 필요합니다.

```bash
npm ci
export WIX_EMAIL=... WIX_PASSWORD=... NTFY_TOPIC=... TARGET_NAMES=홍길동
export BROWSER_CHANNEL=chrome
node src/index.js --test-notify          # 테스트 푸시
node src/index.js --dry-run --verbose    # 푸시 없이 일치하는 제출 확인
node src/index.js                        # 실제 실행
npm test                                 # 단위 테스트
```

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `src/index.js` | 실행 흐름: 확인 → 새 제출 판정 → 푸시 → 상태 저장 |
| `src/site.js` | Playwright로 접속·로그인하고 학생 피드백 데이터(`adminList`)를 가져옴 |
| `src/match.js` | 이름·학생 번호·상태로 대상 제출을 고르고, 새 제출을 판정 |
| `src/notify.js` | ntfy 푸시 문구와 전송 |
| `src/state.js` | 로그인 세션과 알림 기록을 AES-256-GCM으로 암호화해 저장 |
| `.github/workflows/watch.yml` | 예약 실행 설정 |
