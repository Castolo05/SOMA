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
      resizeAvatar(reader.result).then(resolve, () => reject(new Error('No se pudo procesar la imagen.')))
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'))
    reader.readAsDataURL(file)
  })
}

// El avatar se guarda como data URL en profiles.avatar_url: se recorta a un
// cuadrado de AVATAR_SIZE px y se comprime a JPEG para que pese pocos KB.
const AVATAR_SIZE = 256

function resizeAvatar(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const size = Math.min(AVATAR_SIZE, side)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = dataUrl
  })
}
