const base = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
export async function api(path, options = {}) {
  const token = sessionStorage.getItem('drivego_token')
  let response
  try {
    response = await fetch(base + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers },
      signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Не удалось связаться с сервером. Попробуйте ещё раз.')
  }
  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(typeof data?.detail === 'string' ? data.detail : 'Проверьте введённые данные и повторите попытку.')
    error.status = response.status
    throw error
  }
  return data
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Oral', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
