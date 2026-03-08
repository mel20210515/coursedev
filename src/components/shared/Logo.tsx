interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 32, showText = true, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <img
        src="/logo.png"
        alt="Course Builder Logo"
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <span className="text-xl font-bold tracking-tight">
          <span className="text-violet-500">Course </span>
          <span className="text-text-primary">Builder</span>
        </span>
      )}
    </div>
  );
}
