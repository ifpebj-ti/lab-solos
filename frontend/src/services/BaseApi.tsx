import axios from 'axios';

export const api = axios.create({
  baseURL: window.env?.VITE_API_URL || 'http://localhost:5000', // Valor padrão
});
