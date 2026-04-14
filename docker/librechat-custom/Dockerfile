FROM registry.librechat.ai/danny-avila/librechat-dev:latest

COPY docker/librechat-custom/client/src/components/Nav/SettingsTabs/General/General.tsx /app/client/src/components/Nav/SettingsTabs/General/General.tsx
COPY docker/librechat-custom/client/src/store/language.ts /app/client/src/store/language.ts

WORKDIR /app
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm install --include=dev
RUN npm run build:client
