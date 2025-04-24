import axios from 'axios';

// Verifica o valor atual de VITE_API_URL
console.log('VITE_API_URL:', window.env?.VITE_API_URL);

export const api = axios.create({
  baseURL: window.env?.VITE_API_URL || 'http://localhost:5000', // Valor padrão
});
