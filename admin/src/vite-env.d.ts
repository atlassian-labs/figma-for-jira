/// <reference types="vite/client" />
/// <reference types="@emotion/react/types/css-prop" />

interface ImportMetaEnv {
  readonly VITE_FIGMA_FOR_JIRA_APP_BASE_PATH?: string
  readonly VITE_FIGMA_FOR_JIRA_FIGMA_WEB_DOMAIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
