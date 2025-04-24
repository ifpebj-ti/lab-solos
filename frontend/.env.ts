export const VITE_API_URL =
  (typeof window !== 'undefined' && window.env?.VITE_API_URL) || // Verifica se está no navegador e usa window.env
  import.meta.env.VITE_API_URL || // Fallback para variáveis de ambiente do Vite
  'http://localhost:5000'; // Valor padrão caso nenhuma das opções esteja disponível
