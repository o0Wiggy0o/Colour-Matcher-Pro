
import { cn } from '@/lib/utils';

export const Logo = ({ className }: { className?: string }) => {
  return (
    <div className={cn("flex items-center gap-2 font-bold tracking-tight text-foreground", className)}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8 shrink-0"
        aria-hidden="true"
      >
        <g clipPath="url(#clip0_cmyk_logo)">
          <rect width="32" height="32" fill="hsl(var(--muted))"/>
          <circle cx="9" cy="9" r="6" fill="#00FFFF"/>
          <circle cx="23" cy="9" r="6" fill="#FF00FF"/>
          <circle cx="9" cy="23" r="6" fill="#FFFF00"/>
          <circle cx="23" cy="23" r="6" fill="#1d1d1b"/>
        </g>
        <defs>
          <clipPath id="clip0_cmyk_logo">
            <rect width="32" height="32" rx="4" fill="white"/>
          </clipPath>
        </defs>
      </svg>
      {/* Full logo for sm screens and up */}
      <span className="hidden sm:inline text-xl">
        Colour Matcher<span className="font-semibold"> Pro</span>
      </span>
      {/* Compact logo for extra-small screens */}
      <span className="inline sm:hidden text-lg">
        CM<span className="font-semibold">Pro</span>
      </span>
    </div>
  );
};
