/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY: string;
    readonly PROD: boolean;
    readonly DEV: boolean;
    readonly MODE: string;
    readonly BASE_URL: string;
    // Add other environment variables as needed
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }