export function publicAppUrl(path = '') {
  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  const relativePath = path.replace(/^\//, '')

  return new URL(`${basePath}${relativePath}`, window.location.origin).toString()
}
