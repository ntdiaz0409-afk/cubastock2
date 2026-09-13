// frontend/src/components/AnimatedBackground.jsx
import { useEffect, useRef } from 'react'

/** Ejecuta un canvas decorativo adaptable y se detiene para usuarios con movimiento reducido. */
function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationId

    // Configurar tamaño
    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = window.innerWidth * pixelRatio
      canvas.height = window.innerHeight * pixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    // Partículas
    const particles = []
    const particleCount = reducedMotion ? 0 : (window.innerWidth < 760 ? 24 : 42)

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        radius: Math.random() * 1.4 + 0.4,
        alpha: Math.random() * 0.2 + 0.05,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      })
    }

    // Líneas de conexión
    const drawLines = () => {
      // El color se lee en cada dibujo para reaccionar al interruptor de tema.
      const isLightTheme = document.documentElement.dataset.theme === 'light'
      const rgb = isLightTheme ? '2, 132, 199' : '56, 189, 248'
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 150) {
            const alpha = (1 - dist / 150) * 0.09
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }
    }

    // Animación
    const animate = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

      // Actualizar partículas
      particles.forEach((p) => {
        const isLightTheme = document.documentElement.dataset.theme === 'light'
        const rgb = isLightTheme ? '2, 132, 199' : '56, 189, 248'
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed

        // Rebote en bordes
        if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1
        if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1

        // Dibujar partícula
        const alpha = p.alpha + Math.sin(p.pulse) * 0.05
        const radius = p.radius + Math.sin(p.pulse) * 0.3

        ctx.beginPath()
        ctx.arc(p.x, p.y, Math.max(radius, 0.5), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rgb}, ${Math.max(alpha, 0.05)})`
        ctx.fill()

        // Brillo central
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3)
        glow.addColorStop(0, `rgba(${rgb}, ${Math.max(alpha * 0.3, 0.02)})`)
        glow.addColorStop(1, `rgba(${rgb}, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2)
        ctx.fill()
      })

      drawLines()
      animationId = requestAnimationFrame(animate)
    }

    if (!reducedMotion) animate()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'transparent',
      }}
    />
  )
}

export default AnimatedBackground
/**
 * Propósito: fondo de partículas decorativo para login y dashboards.
 * Responsabilidades: dibujar y liberar el canvas sin interceptar interacción del usuario.
 * Dependencias: preferencia reduced-motion y atributo data-theme aplicado por useTheme.
 */
