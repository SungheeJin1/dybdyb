# DYB 학생 제출 알림

[DYB 면접 연습 사이트](https://consultingdyb.wixstudio.com/interview)의 **학생 피드백** 목록을 한국 시간 07시~01시에 **10분마다** 확인합니다.
지정한 학생이 새로 제출하면 iPhone으로 푸시 알림을 보냅니다.

```
홍길동 학생 새 제출
진로·인성 3 · 존경하는 인물
홍길동 · 2026-101 · 1차 · 11월 24일 오전 10:10
상태: 제출 완료(피드백 대기 중)
```

코드는 모두 작성되어 있습니다. 아래 1~6단계를 순서대로 따라 하면 됩니다. 코드를 고칠 일은 없습니다.

**준비물**
- iPhone: 알림을 받을 폰
- PC(Windows 또는 Mac)와 Chrome: Google 로그인 정보를 복사하고 GitHub 설정을 하는 데 씁니다. GitHub 설정은 iPhone Safari로도 됩니다. 이때는 주소창 왼쪽 **가가**(또는 **aA**) → **데스크톱 웹사이트 요청**을 누르세요.

---

## 1단계. iPhone에 ntfy 설치하고 토픽 구독

1. iPhone **App Store** → 아래 **검색** 탭 → `ntfy` 입력 → **ntfy** 앱 **받기**.
2. ntfy 앱을 엽니다. 알림 허용을 물으면 **허용**을 누릅니다.
3. 오른쪽 위 **+** 를 누릅니다.
4. **Topic name** 칸에 토픽 이름을 입력합니다. **Use another server**는 끈 상태로 두고 **Subscribe**를 누릅니다.
   - 토픽 이름은 영어 소문자와 숫자로 **길고 무작위로** 정하세요. 예: `dyb-k7m2x9q4w8pz`
   - ntfy는 토픽 이름만 알면 누구나 구독할 수 있습니다. 토픽 이름이 비밀번호 역할을 하니 남에게 알려주지 마세요. 알림에는 학생 이름과 과제명이 들어갑니다.
5. 이 토픽 이름을 메모해 둡니다. 4단계에서 씁니다.

### 1단계 대신(또는 함께): Bark — ntfy 알림이 앱 안에서만 보일 때

ntfy iOS 앱은 메시지가 앱을 열었을 때만 보이고 잠금 화면·배너로는 안 뜨는 경우가 있습니다. Bark는 Apple 푸시로 바로 보내는 iOS 전용 무료 앱이라 이 문제가 없습니다.

1. App Store → **검색** → `Bark` → **Bark - Customed Notifications** **받기**
2. 앱을 열고 알림 **허용**
3. 첫 화면(서버 목록)에 `https://api.day.app/` 뒤에 영어·숫자가 붙은 주소가 보입니다. 그 주소를 길게 눌러 **복사**합니다(또는 주소를 눌러 나오는 메뉴에서 복사).
4. 4단계에서 Secret `BARK_KEY`에 그 주소를 통째로 넣습니다. 키만 넣어도 됩니다.
   - `BARK_KEY`와 `NTFY_TOPIC`이 둘 다 있으면 두 앱으로 모두 보냅니다. ntfy를 그만 쓰려면 `NTFY_TOPIC` Secret을 지웁니다(**🗑**).
   - 이 주소를 아는 사람은 내 폰으로 알림을 보낼 수 있으니 남에게 알려주지 마세요.

## 2단계. 로그인 방식 정하기

이 프로그램은 '학생 피드백' 메뉴가 보이는 선생님 계정으로 로그인해야 합니다. Google은 프로그램이 Google 계정으로 자동 로그인하는 것을 막습니다. 그래서 둘 중 하나를 씁니다.

### 2-A. (먼저 1분만 시도) 계정에 비밀번호 추가하기

성공하면 2-B는 하지 않아도 되고, 나중에 다시 할 일도 없습니다.

1. 사이트(`https://consultingdyb.wixstudio.com/interview`)에서 오른쪽 위 **로그인**을 누릅니다.
2. 로그인 창에서 **비밀번호 찾기**를 누릅니다.
3. 평소 Google로 로그인하는 그 Gmail 주소를 넣고 보내기 버튼을 누릅니다.
4. 메일이 오면 링크를 눌러 새 비밀번호를 정합니다.
5. 사이트에서 다시 **로그인**을 누르고, 이메일과 새 비밀번호 칸에 입력해 **로그인**합니다. '학생 피드백' 메뉴가 보이면 성공입니다.
   - 성공하면 4단계에서 `WIX_EMAIL`, `WIX_PASSWORD`를 넣습니다(`WIX_COOKIES`는 필요 없음).
   - 메일이 오지 않거나 "일치하는 계정이 없습니다"라고 나오면 2-B로 갑니다.

### 2-B. Google로 로그인한 정보(cookie) 복사하기 — PC Chrome

1. PC에서 Chrome을 열고 **시크릿 창**을 엽니다. Windows는 `Ctrl` + `Shift` + `N`, Mac은 `⌘` + `Shift` + `N`.
2. 주소창에 `https://consultingdyb.wixstudio.com/interview`를 입력하고 `Enter`.
3. 오른쪽 위 **로그인** → **Google 계정으로 계속하기** → 선생님 Google 계정으로 로그인합니다.
4. 위쪽 메뉴에 **학생 피드백**이 보이는지 확인합니다.
5. 개발자 도구를 엽니다. Windows는 `F12`(또는 `Ctrl` + `Shift` + `I`), Mac은 `⌘` + `Option` + `I`.
6. 개발자 도구 위쪽 탭에서 **Network**(한국어 화면: **네트워크**)를 누릅니다. 안 보이면 탭 줄 끝의 **>>** 를 눌러 찾습니다.
7. 그 아래 **Disable cache**(**캐시 사용 중지**)에 체크합니다.
8. `F5`(Mac은 `⌘` + `R`)로 새로고침합니다.
9. 왼쪽 목록의 **Name**(**이름**) 열에서 맨 위쪽 **interview**를 누릅니다. 찾기 어려우면 위쪽 필터 칸에 `interview`를 입력합니다.
10. 오른쪽 **Headers**(**헤더**) 탭에서 아래로 내려 **Request Headers**(**요청 헤더**) 부분의 **cookie** 줄을 찾습니다.
11. **cookie** 줄 위에서 마우스 오른쪽 버튼 → **Copy value**(**값 복사**)를 누릅니다.
    - 메뉴에 없으면 cookie 오른쪽 값을 마우스로 끝까지 드래그해 선택하고 `Ctrl` + `C`(Mac은 `⌘` + `C`).
12. 메모장에 붙여 넣어 둡니다. `svSession=...; ...` 처럼 생긴 긴 글자입니다. 4단계에서 씁니다.
13. 시크릿 창은 **그냥 닫습니다.** 사이트에서 **로그아웃을 누르지 마세요.** 누르면 복사한 로그인이 무효가 됩니다.

> 이 cookie 값은 로그인 그 자체입니다. 비밀번호처럼 GitHub Secret에만 넣고 다른 곳에 공유하지 마세요.
> Wix가 정한 기간이 지나면 이 로그인이 풀립니다. 그때 폰으로 **"사이트 로그인이 풀렸습니다"** 알림이 옵니다. 2-B를 다시 하고 4단계의 `WIX_COOKIES`만 새 값으로 바꾸면 됩니다([바꾸고 싶을 때](#바꾸고-싶을-때) 참고).

## 3단계. 저장소를 공개로 바꾸기

공개 저장소는 GitHub Actions를 시간 제한 없이 무료로 쓸 수 있습니다. 그래서 10분 간격이 가능합니다. 비공개 저장소는 월 2,000분이라 30분 간격이 한계입니다.

1. `https://github.com/SungheeJin1/dybdyb`를 엽니다.
2. 위쪽 메뉴 줄 오른쪽 끝 **⚙ Settings**를 누릅니다.
3. 왼쪽 메뉴 **General** 화면을 맨 아래까지 내립니다. 빨간 테두리의 **Danger Zone**이 나옵니다.
4. **Change repository visibility** 줄의 **Change visibility** → **Change to public**을 누릅니다.
5. 뜨는 창에서 차례로 **I want to make this repository public** → **I have read and understand these effects** → **Make this repository public**을 누릅니다. GitHub 비밀번호나 인증 코드를 물으면 입력합니다.

| 공개되는 것 | 공개되지 않는 것 |
| --- | --- |
| 코드, 이 설명서, Actions 실행 기록(건수만 찍힘) | Secrets: 이메일, 비밀번호, cookie, 학생 이름, ntfy 토픽 |

## 4단계. Secrets 등록하기

1. 저장소 **⚙ Settings**를 누릅니다.
2. 왼쪽 메뉴의 **Security** 묶음에서 **Secrets and variables** → **Actions**를 누릅니다.
3. **Secrets** 탭에서 초록 버튼 **New repository secret**을 누릅니다.
4. **Name** 칸과 **Secret** 칸을 채우고 **Add secret**을 누릅니다. 아래 표의 줄마다 3~4를 반복합니다.

| Name (대문자·밑줄까지 똑같이) | Secret에 넣을 값 | 언제 |
| --- | --- | --- |
| `BARK_KEY` | Bark 앱 첫 화면의 `https://api.day.app/...` 주소 | Bark를 쓸 때 |
| `NTFY_TOPIC` | 1단계에서 정한 토픽 이름 | ntfy를 쓸 때 |
| `TARGET_NAMES` | 알림 받을 학생 이름. 여러 명이면 쉼표로 구분 (예: `홍길동, 김철수`). 학생 번호(`2026-101`)도 됩니다. | 항상 |
| `WIX_COOKIES` | 2-B에서 복사한 cookie 값 전체 | 2-B를 했을 때 |
| `WIX_EMAIL` | 로그인 이메일 | 2-A가 성공했을 때 |
| `WIX_PASSWORD` | 2-A에서 정한 비밀번호 | 2-A가 성공했을 때 |

다 넣으면 **Repository secrets** 목록에 이름이 보입니다. 값은 다시 볼 수 없는 게 정상입니다.

## 5단계. main 브랜치에 합치기

GitHub의 자동 실행은 `main` 브랜치에 있는 설정만 돌립니다.

1. 저장소 첫 화면(위쪽 **<> Code** 탭)으로 갑니다.
2. 노란 띠 **claude/friendly-cori-g8wtxu had recent pushes** 옆의 **Compare & pull request**를 누릅니다.
   - 노란 띠가 없으면 위쪽 **Pull requests** 탭 → **New pull request**를 누릅니다. 왼쪽은 `base: main`으로 두고, 오른쪽 `compare:`를 눌러 `claude/friendly-cori-g8wtxu`를 고릅니다.
3. 초록 **Create pull request**를 누릅니다. 다음 화면에서 한 번 더 **Create pull request**.
4. 아래쪽 초록 **Merge pull request** → **Confirm merge**를 누릅니다. 보라색 **Merged** 표시가 뜨면 끝입니다.

## 6단계. 시험 실행

1. 저장소 위쪽 **Actions** 탭을 누릅니다.
2. 왼쪽 목록에서 **학생 제출 알림**을 누릅니다.
3. 오른쪽 **Run workflow ▾** → `Branch: main`은 그대로 → **실행 방식**을 **test-notify**로 바꾸고 → 초록 **Run workflow**를 누릅니다.
4. 몇 초 뒤 목록에 노란 점(실행 중)이 생겼다가 **초록 체크**로 바뀝니다. 폰에 **"테스트 알림"**이 오면 ntfy 설정은 끝입니다.
5. 다시 **Run workflow ▾** → **실행 방식**을 **run**으로 → **Run workflow**. 초록 체크가 뜨고 폰에 **"학생 제출 알림 시작"**이 오면 모두 끝났습니다.
   - 첫 실행에서는 지금 목록에 이미 있는 제출을 알림 없이 기록만 합니다. 그 뒤로 새로 들어오는 제출부터 알립니다.

이제 한국 시간 07:03부터 00:53까지 10분마다 자동으로 확인합니다. 실행 기록은 **Actions** 탭에 쌓입니다.

**빨간 X가 뜨면:** 그 실행을 누릅니다 → 왼쪽 **watch** → **학생 피드백 확인** 줄을 눌러 펼칩니다 → `[오류]`로 시작하는 줄을 아래 [문제 해결](#문제-해결) 표에서 찾습니다.

---

## 바꾸고 싶을 때

| 하고 싶은 것 | 방법 |
| --- | --- |
| 학생 바꾸기·추가 | **Settings** → **Secrets and variables** → **Actions** → `TARGET_NAMES` 줄 오른쪽 **✏(연필)** → 새 값 입력 → **Update secret** |
| 로그인 cookie 새로 넣기 | 2-B를 다시 하고 → 같은 화면 `WIX_COOKIES`의 **✏** → 붙여 넣기 → **Update secret** |
| 다른 검토 상태도 알림 받기 | 같은 화면 **Variables** 탭 → **New repository variable** → Name `WATCH_STATUSES`, Value 예: `SUBMITTED, REVISION_REQUESTED` (전부: `ALL`) → **Add variable** |
| 알림을 눌렀을 때 여는 주소 바꾸기 | 기본은 Safari로 사이트를 엽니다(`x-safari-https://...`, iOS 17 이상). 다른 주소로 바꾸려면 **Variables** 탭 → **New repository variable** → Name `CLICK_URL`, Value 원하는 주소 → **Add variable** |
| 잠시 끄기 / 다시 켜기 | **Actions** → **학생 제출 알림** → 오른쪽 위 **⋯** → **Disable workflow** / **Enable workflow** |
| 확인 시간·간격 바꾸기 | **<> Code** → `.github` → `workflows` → `watch.yml` → 오른쪽 위 **✏(Edit this file)** → `cron:` 줄을 아래 예시로 바꿈 → **Commit changes...** → **Commit changes** |

`cron` 예시(GitHub는 UTC 기준이라 한국 시간에서 9시간을 뺀 값으로 적습니다):

| 원하는 것 | `cron:` 줄 |
| --- | --- |
| 07–01시, 10분마다 (현재) | `- cron: '3,13,23,33,43,53 22-23,0-15 * * *'` |
| 07–01시, 5분마다 (GitHub 최소 간격) | `- cron: '3-58/5 22-23,0-15 * * *'` |
| 24시간, 10분마다 | `- cron: '3,13,23,33,43,53 * * * *'` |

GitHub 자동 실행은 서버가 붐비면 몇 분에서 수십 분 늦게 시작하거나 가끔 한 번씩 건너뜁니다. 정확히 10분이 보장되지는 않습니다.

## 문제 해결

| 폰 알림 또는 로그의 `[오류]` 내용 | 할 일 |
| --- | --- |
| 사이트 로그인이 풀렸습니다 | 2-B를 다시 하고 `WIX_COOKIES`를 새 값으로 바꿉니다 |
| 로그인 실패: … | `WIX_EMAIL` / `WIX_PASSWORD`를 확인합니다. 사이트 비밀번호를 바꿨다면 Secret도 바꿉니다 |
| 설정이 비어 있습니다: (이름) | 그 이름의 Secret이 없거나 철자가 다릅니다 |
| WIX_COOKIES 값에서 쿠키를 읽지 못했습니다 | 2-B의 10~11번에서 cookie **값**을 복사했는지 확인합니다 |
| ntfy 전송 실패 | `NTFY_TOPIC`이 1단계에서 구독한 이름과 같은지 확인합니다 |
| 이 계정에는 학생 피드백 메뉴가 없습니다 | 선생님 계정으로 로그인한 cookie/이메일인지 확인합니다 |
| 로그인 중 reCAPTCHA 확인 창이 떴습니다 | Wix가 자동 로그인을 의심한 경우입니다(2-A 방식). 반복되면 2-B 방식으로 바꿉니다 |
| GitHub에서 "scheduled workflow … disabled" 메일이 옴 | **Actions** → **학생 제출 알림** → **Enable workflow** |

- 로그인 실패는 바로, 다른 오류는 2번 연속 나면 폰으로 **"학생 제출 알림 오류"** 알림이 옵니다. 오류가 계속되는 동안에는 6시간에 한 번만 알립니다.
- 공개 저장소는 60일 동안 변화가 없으면 GitHub가 자동 실행을 끕니다. 그래서 매주 월요일 아침에 자동으로 다시 켜 두도록 해 놓았습니다. 그래도 꺼졌다는 메일이 오면 위 표대로 **Enable workflow**를 누르세요.

---

## 동작 방식 (참고)

1. GitHub Actions가 Chrome을 열어 사이트에 접속합니다. 지난번 로그인 상태(또는 `WIX_COOKIES`)를 씁니다. 이메일 방식이면 로그인이 풀렸을 때 다시 로그인합니다.
2. 사이트가 '학생 피드백' 표를 그릴 때 받는 데이터(`adminList`)를 그대로 읽습니다. 표 행 아래 회색 글씨의 **학생 이름 · 학생 번호**와 같은 값입니다.
3. 학생 이름이나 학생 번호가 `TARGET_NAMES`와 같고, 상태가 **제출 완료(피드백 대기 중)** 이면서 아직 알리지 않은 제출이면 [ntfy](https://ntfy.sh)로 푸시를 보냅니다.
   - 과제명에 이름이 들어 있어도 학생 이름이 다르면 알리지 않습니다.
   - 재제출(2차, 3차…)은 새 제출로 봅니다.
   - 한 번에 6건 이상이면 묶어서 한 건으로 보냅니다.
4. 이미 알린 제출 목록과 로그인 상태는 암호화해서(AES-256-GCM, 키는 Secret에서 만듦) 다음 실행에 넘깁니다(Actions 캐시).
5. 실행 기록에는 학생 이름이나 과제명을 남기지 않고 건수만 남깁니다.

## 내 컴퓨터에서 실행 (선택)

Node.js 20 이상과 Chrome이 필요합니다.

```bash
npm ci
export NTFY_TOPIC=... TARGET_NAMES=홍길동 WIX_COOKIES='...'   # 또는 WIX_EMAIL=... WIX_PASSWORD=...
export BROWSER_CHANNEL=chrome
node src/index.js --test-notify          # 테스트 푸시
node src/index.js --dry-run --verbose    # 푸시 없이 일치하는 제출 확인
node src/index.js                        # 실제 실행
npm test                                 # 단위 테스트
```

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `.github/workflows/watch.yml` | 자동 실행 시간과 순서 |
| `src/index.js` | 실행 흐름: 확인 → 새 제출 판정 → 푸시 → 상태 저장 |
| `src/site.js` | Chrome으로 접속·로그인하고 학생 피드백 데이터를 가져옴 |
| `src/cookies.js` | 복사한 cookie 값(`WIX_COOKIES`)을 읽음 |
| `src/match.js` | 이름·학생 번호·상태로 대상 제출을 고르고 새 제출을 판정 |
| `src/notify.js` | 푸시 문구와 전송 (Bark, ntfy) |
| `src/state.js` | 로그인 상태와 알림 기록을 암호화해 저장 |
| `src/config.js` | Secrets / Variables 읽기 |
