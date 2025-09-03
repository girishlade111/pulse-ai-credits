import React, { useEffect, useRef, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  pulsePhase: number;
}

interface AnimatedBackgroundProps {
  particleCount?: number;
  interactive?: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ 
  particleCount = 50, 
  interactive = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isMouseMoving, setIsMouseMoving] = useState(false);
  const particlesRef = useRef<Particle[]>([]);

  // Color palette for particles
  const colors = [
    'rgba(0, 255, 255, 0.6)',    // Cyan/Primary
    'rgba(138, 43, 226, 0.5)',   // Purple
    'rgba(72, 187, 120, 0.5)',   // Green
    'rgba(251, 146, 60, 0.5)',   // Orange
    'rgba(236, 72, 153, 0.5)',   // Pink
    'rgba(59, 130, 246, 0.5)',   // Blue
  ];

  // Initialize particles
  const initParticles = (canvas: HTMLCanvasElement) => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    
    particlesRef.current = particles;
  };

  // Handle mouse movement
  const handleMouseMove = (event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    setMousePos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    setIsMouseMoving(true);

    // Reset mouse moving state after a delay
    setTimeout(() => setIsMouseMoving(false), 100);
  };

  // Draw particles with connections
  const drawParticles = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const particles = particlesRef.current;
    const time = Date.now() * 0.001;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(34, 34, 47, 0.8)');
    gradient.addColorStop(0.5, 'rgba(40, 44, 63, 0.6)');
    gradient.addColorStop(1, 'rgba(34, 34, 47, 0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    particles.forEach((particle, index) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Interactive effect - attract particles to mouse
      if (interactive && isMouseMoving) {
        const dx = mousePos.x - particle.x;
        const dy = mousePos.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          const force = (150 - distance) / 150;
          particle.vx += (dx / distance) * force * 0.02;
          particle.vy += (dy / distance) * force * 0.02;
        }
      }

      // Apply friction
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // Bounce off edges
      if (particle.x <= 0 || particle.x >= canvas.width) {
        particle.vx *= -1;
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
      }
      if (particle.y <= 0 || particle.y >= canvas.height) {
        particle.vy *= -1;
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));
      }

      // Update pulsing effect
      particle.pulsePhase += 0.02;
      const pulseSize = particle.size + Math.sin(particle.pulsePhase) * 0.5;

      // Draw particle
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
      ctx.fillStyle = particle.color;
      ctx.fill();

      // Add glow effect
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw connections to nearby particles
      particles.slice(index + 1).forEach(otherParticle => {
        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.2 * (1 - distance / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      });
    });

    // Draw interactive cursor effect
    if (interactive && isMouseMoving) {
      const radius = 50 + Math.sin(time * 3) * 10;
      const gradient = ctx.createRadialGradient(
        mousePos.x, mousePos.y, 0,
        mousePos.x, mousePos.y, radius
      );
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(mousePos.x, mousePos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };

  // Animation loop
  const animate = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;

    drawParticles(ctx, canvas);
    animationRef.current = requestAnimationFrame(animate);
  };

  // Handle canvas resize
  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Reinitialize particles for new canvas size
    initParticles(canvas);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize particles
    initParticles(canvas);

    // Start animation
    animate();

    // Add event listeners
    if (interactive) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (interactive) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [particleCount, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        background: 'transparent',
      }}
    />
  );
};

export default AnimatedBackground;