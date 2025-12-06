# NestJS Application

NestJS 기반 TypeScript 애플리케이션입니다. Jest를 사용한 테스트 환경이 구성되어 있습니다.

## 설치

```bash
npm install
```

## 개발 서버 실행

```bash
# 개발 모드
npm run start:dev

# 디버그 모드
npm run start:debug
```

## 빌드

```bash
npm run build
```

## 프로덕션 실행

```bash
npm run start:prod
```

## 테스트

```bash
# 단위 테스트
npm test

# 테스트 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:cov

# E2E 테스트
npm run test:e2e
```

## 린트

```bash
npm run lint
```

## 포매팅

```bash
npm run format
```

## 프로젝트 구조

```
src/
├── main.ts                 # 애플리케이션 진입점
├── app.module.ts          # 루트 모듈
├── app.controller.ts      # 컨트롤러
├── app.service.ts         # 서비스
└── app.controller.spec.ts # 단위 테스트

test/
└── app.e2e-spec.ts        # E2E 테스트
```

## 기술 스택

- **NestJS**: Progressive Node.js framework
- **TypeScript**: JavaScript with static typing
- **Jest**: Testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
