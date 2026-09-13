// frontend/src/components/AnimatedBackground.jsx
import { useEffect, useRef } from 'react'

/**
 * Fondo de partículas decorativo optimizado para fluidez en móviles:
 * - Sprite con brillo pre-renderizado una sola vez (antes se creaba un
 *   radialGradient por partícula y por frame, lo más costoso de todo).
 * - El tema se lee una vez por frame, no por partícula.
 * - Dibujo limitado a ~30 fps y pausado cuando la pestaña no es visible.
 * - Densidad de partículas y de líneas reducida en pantallas pequeñas.
 * Se detiene por completo para usuarios con movimiento reducido.
 */
function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationId = 0
    let frame = 0
    let isRunning = false

    // Limite de 1.5: más allá el coste de píxeles en móviles no se nota a ojo.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)

    const resize = () => {
      canvas.width = Math.round(window.innerWidth * pixelRatio)
      canvas.height = Math.round(window.innerHeight * pixelRatio)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const isMobile = window.innerWidth < 760
    const particleCount = reducedMotion ? 0 : (isMobile ? 14 : 28)
    const linkDistance = isMobile ? 110 : 150

    const particles = []
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

    // Sprite único con el brillo ya pintado: drawImage es muchísimo más
    // barato que crear y rellenar un gradiente en cada fotograma.
    const SPRITE_SIZE = 32
    const sprite = document.createElement('canvas')
    sprite.width = SPRITE_SIZE
    sprite.height = SPRITE_SIZE
    const spriteCtx = sprite.getContext('2d')
    const glow = spriteCtx.createRadialGradient(
      SPRITE_SIZE / 2, SPRITE_SIZE / 2, 0,
      SPRITE_SIZE / 2, SPRITE_SIZE / 2, SPRITE_SIZE / 2
    )
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    glow.addColorStop(0.25, 'rgba(255, 255, 255, 0.35)')
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
    spriteCtx.fillStyle = glow
    spriteCtx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)

    const animate = () => {
      animationId = requestAnimationFrame(animate)
      // ~30 fps: un fotograma sí y otro no. El movimiento es tan lento que no se aprecia.
      frame++
      if (frame % 2 !== 0) return

      const width = window.innerWidth
      const height = window.innerHeight
      // Tema leído una vez por frame, fuera de los bucles de partículas.
      const rgb = document.documentElement.dataset.theme === 'light' ? '2, 132, 199' : '56, 189, 248'

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.pulse += p.pulseSpeed

        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1

        const alpha = Math.max(p.alpha + Math.sin(p.pulse) * 0.05, 0.05)
        const radius = Math.max(p.radius + Math.sin(p.pulse) * 0.3, 0.5)

        const size = radius * 6
        ctx.globalAlpha = Math.min(alpha * 2.2, 0.55)
        ctx.drawImage(sprite, p.x - size / 2, p.y - size / 2, size, size)
      }

      ctx.globalAlpha = 1
      ctx.globalCompositeOperation = 'source-over'
      ctx.lineWidth = 0.5

      // Distancia al cuadrado para evitar sqrt en cada pareja.
      const linkDistSq = linkDistance * linkDistance
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distSq = dx * dx + dy * dy

          if (distSq < linkDistSq) {
            const dist = Math.sqrt(distSq)
            ctx.strokeStyle = `rgba(${rgb}, ${(1 - dist / linkDistance) * 0.09})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }
    }

    const start = () => {
      if (!isRunning && !reducedMotion) {
        isRunning = true
        animationId = requestAnimationFrame(animate)
      }
    }
    const stop = () => {
      isRunning = false
      cancelAnimationFrame(animationId)
    }
    const handleVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    document.addEventListener('visibilitychange', handleVisibility)
    start()

    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', handleVisibility)
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
