// El isotipo coral funciona sobre los dos temas (el oscuro es ciruela, no azul),
// así que se usa la misma imagen siempre.
export default function ThemeLogo({ alt = 'SOMA', className = '' }) {
  return (
    <span className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`}>
      <img src="/logo-light.png" alt={alt} className="w-full h-full object-contain" />
    </span>
  )
}
