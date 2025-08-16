/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL: string
  // другие переменные окружения...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
