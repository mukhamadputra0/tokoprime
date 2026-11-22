import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'dark', size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-16'
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <img 
        src="/assets/aistudio/Gemini_Generated_Image_g56kvng56kvng56k_e33eb3ee.jfif" 
        alt="PRIME STYLE" 
        className={`${sizeClasses[size]} object-contain border border-black`}
      />
    </div>
  );
};
