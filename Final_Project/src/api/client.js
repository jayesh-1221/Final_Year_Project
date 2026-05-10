import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  // Do not set Content-Type globally: axios would treat FormData as JSON and
  // stringify it, breaking multipart uploads (e.g. /api/audio/analyze). JSON
  // requests still get application/json from the default transformRequest.
  timeout: 60_000,
})
