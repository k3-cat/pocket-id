# This file uses multi-stage builds to build the application from source, including the front-end

# Tags passed to "go build"
ARG BUILD_TAGS=""


# Stage 1: Build Frontend
FROM node:alpine AS frontend-base
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN corepack enable

WORKDIR /build

FROM frontend-base AS frontend-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  --mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
  --mount=type=bind,source=pnpm-workspace.yaml,target=pnpm-workspace.yaml \
  --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=frontend/package.json,target=frontend/package.json \
  pnpm --filter pocket-id-frontend install --prod --frozen-lockfile

FROM frontend-base AS frontend-builder
COPY ./pnpm-lock.yaml ./pnpm-workspace.yaml ./package.json /build/
COPY ./frontend /build/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
  pnpm install --frozen-lockfile --no-editable \
  && pnpm --filter pocket-id-frontend run build


# Stage 2: Build Backend
FROM golang:alpine AS backend-base
ARG BUILD_TAGS

WORKDIR /build

FROM backend-base AS backend-deps
RUN --mount=type=cache,id=go,target=/root/go/pkg/mod \
  --mount=type=bind,source=backend/go.sum,target=backend/go.sum \
  --mount=type=bind,source=backend/go.mod,target=backend/go.mod \
  go mod download

FROM backend-base AS backend-builder
COPY ./backend/go.mod ./backend/go.sum /build/
COPY ./backend /build/
COPY .version /build/
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

WORKDIR /build/cmd
RUN --mount=type=cache,id=go,target=/root/go/pkg/mod \
  VERSION=$(cat /build/.version) \
  CGO_ENABLED=0 \
  GOOS=linux \
  go build \
    -tags "${BUILD_TAGS}" \
    -ldflags="-X github.com/pocket-id/pocket-id/backend/internal/common.Version=${VERSION} -buildid=${VERSION}" \
    -trimpath \
    -o /build/pocket-id \
    .


# Stage 3: Production Image
FROM alpine:3.23.4
WORKDIR /app

RUN apk add --no-cache curl su-exec

COPY --from=backend-builder /build/pocket-id /app/pocket-id
COPY ./scripts/docker /app/docker

RUN chmod +x /app/pocket-id && \
  find /app/docker -name "*.sh" -exec chmod +x {} \;

EXPOSE 1411
ENV APP_ENV=production

HEALTHCHECK --interval=90s --timeout=5s --start-period=10s --retries=3 CMD [ "/app/pocket-id", "healthcheck" ]

ENTRYPOINT ["sh", "/app/docker/entrypoint.sh"]
CMD ["/app/pocket-id"]
