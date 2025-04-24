export {};

declare global {
  interface Window {
    env: {
      VITE_API_URL?: string;
    };
  }
}
