/**
 * Propósito: punto único de consumo de la identidad visual de CubaStock.
 * Responsabilidades: conservar el contenedor/animación compartidos por login y cabeceras,
 * usando siempre el logo cuadrado (sin variante circular).
 * Dependencias: recursos públicos en /branding y estilos .business-logo de App.css.
 */
/** Renderiza el logo cuadrado; el tamaño se interpreta como lado del contenedor animado.
 * "variant" se conserva por compatibilidad con quienes ya lo pasan, pero ya no cambia
 * la imagen: solo ajusta la clase --small para tamaños pequeños. */
function Logo({ size = 48, variant = 'default' }) {
  const isCompact = variant === 'small' || variant === 'compact'

  return (
    <div className={`business-logo${isCompact ? ' business-logo--small' : ''}`} style={{ width: size, height: size }} aria-hidden="true">
      {/* La imagen permanece dentro del contenedor para preservar el brillo animado existente. */}
      <img className="business-logo__image" src="/branding/cubastock-horizontal.jpeg" alt="" />
    </div>
  )
}

export default Logo