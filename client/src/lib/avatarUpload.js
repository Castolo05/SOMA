const MAX_AVATAR_SIZE = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function readAvatarFile(file) {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return Promise.reject(new Error('Elegí una imagen JPG, PNG o WebP.'))
  }

  if (file.size > MAX_AVATAR_SIZE) {
    return Promise.reject(new Error('La imagen debe pesar menos de 2 MB.'))
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('No se pudo procesar la imagen.'))
        return
      }
      resolve(reader.result)
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'))
    reader.readAsDataURL(file)
  })
}
