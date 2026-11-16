import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { resolveImageUrl } from '../lib/imageRegistry';

interface StudioImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  aspectClass?: string;
  loading?: 'lazy' | 'eager';
}

export function StudioImage({
  src,
  alt,
  className = 'w-full h-full object-cover',
  aspectClass = '',
  loading = 'lazy',
}: StudioImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveImageUrl(src);

  if (!resolved || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F5F7FB] text-[#667085] ${aspectClass} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Cpu className="w-8 h-8 text-[#98A2B3] mb-2" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#667085] px-4 text-center line-clamp-1">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      loading={loading}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
