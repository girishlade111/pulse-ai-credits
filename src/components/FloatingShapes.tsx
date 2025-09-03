import React from 'react';

interface FloatingShapesProps {
  count?: number;
}

const FloatingShapes: React.FC<FloatingShapesProps> = ({ count = 8 }) => {
  const shapes = Array.from({ length: count }, (_, i) => ({
    id: i,
    size: Math.random() * 100 + 50,
    left: Math.random() * 100,
    animationDelay: Math.random() * 20,
    animationDuration: Math.random() * 20 + 20,
    shape: ['circle', 'square', 'triangle'][Math.floor(Math.random() * 3)],
    opacity: Math.random() * 0.3 + 0.1,
  }));

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {shapes.map((shape) => (
        <div
          key={shape.id}
          className={`absolute animate-float-slow ${
            shape.shape === 'circle' 
              ? 'rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20' 
              : shape.shape === 'square'
              ? 'bg-gradient-to-br from-green-500/20 to-blue-500/20 rotate-45'
              : 'bg-gradient-to-br from-orange-500/20 to-pink-500/20'
          }`}
          style={{
            width: `${shape.size}px`,
            height: `${shape.size}px`,
            left: `${shape.left}%`,
            animationDelay: `${shape.animationDelay}s`,
            animationDuration: `${shape.animationDuration}s`,
            opacity: shape.opacity,
            clipPath: shape.shape === 'triangle' 
              ? 'polygon(50% 0%, 0% 100%, 100% 100%)' 
              : undefined,
          }}
        />
      ))}
    </div>
  );
};

export default FloatingShapes;