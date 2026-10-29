// Wordmark de SOMA recortado del logotipo original (public/soma-wordmark.png).
// Se usa como máscara para que tome el color del texto y funcione en ambos temas.
export default function Wordmark({ className = 'h-4', title = 'SOMA' }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        aspectRatio: '670 / 131',
        WebkitMask: 'url(/soma-wordmark.png) center / contain no-repeat',
        mask: 'url(/soma-wordmark.png) center / contain no-repeat',
      }}
    />
  )
}
