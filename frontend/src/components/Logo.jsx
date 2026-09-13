// frontend/src/components/Logo.jsx
/**
 * Punto único de consumo de la identidad visual de CubaStock.
 * Usa la marca generada (cubo isométrico cian) como imagen cuadrada,
 * con un leve resplandor de acento sin animaciones pesadas.
 */
function Logo({ size = 48 }) {
  return (
    <div
      className="business-logo"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img
        className="business-logo__image"
        src="/branding/cubastock-mark.png"
        alt=""
        width={size}
        height={size}
      />
    </div>
  )
}

export default Logo
/**
 * Propósito: identidad visual compartida por login y cabeceras.
 * Responsabilidades: renderizar la marca cuadrada a cualquier tamaño.
 * Dependencias: /branding/cubastock-mark.png y .business-logo en App.css.
 */
