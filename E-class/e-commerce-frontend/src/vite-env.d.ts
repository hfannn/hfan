/// <reference types="vite/client" />

declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_GHN_BASE_URL?: string;
  readonly VITE_GHN_TOKEN?: string;
  readonly VITE_GHN_SHOP_ID?: string;
  readonly VITE_GHN_FROM_DISTRICT_ID?: string;
  readonly VITE_GHN_FROM_WARD_CODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
