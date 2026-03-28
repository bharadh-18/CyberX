import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

interface PremiumButtonProps {
  onClick?: () => void;
  to?: string;
  label: string;
  icon?: LucideIcon;
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}

const PremiumButton: React.FC<PremiumButtonProps> = ({
  onClick,
  to,
  label,
  icon: Icon,
  type = 'button',
  disabled = false,
  className = '',
}) => {
  const characters = label.split('');

  const ButtonContent = () => (
    <>
      <div className="original">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          <span>{label}</span>
        </div>
      </div>
      <div className="letters">
        {Icon && <Icon className="w-4 h-4 mr-2" />}
        {characters.map((char, index) => (
          <span 
            key={index} 
            style={{ 
              transitionDelay: `${index * 0.05}s`,
              whiteSpace: char === ' ' ? 'pre' : 'normal'
            }}
          >
            {char}
          </span>
        ))}
      </div>
    </>
  );

  const combinedStyles = `btn-staggered-reveal ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedStyles}>
        <ButtonContent />
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedStyles}
    >
      <ButtonContent />
    </button>
  );
};

export default PremiumButton;
