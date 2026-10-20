'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';

interface TrazoBrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'dark' | 'light';
  showAvatar?: boolean;
}

/**
 * Marca oficial nítida y consistente de Trazo Espacio Gráfico.
 * Incluye acceso administrativo oculto dentro del logo (doble clic, 3 toques rápidos
 * o mantener presionado 0.8s) sin exponer enlaces ni textos visibles al público.
 */
export function TrazoBrandLogo({
  size = 'md',
  variant = 'dark',
}: TrazoBrandLogoProps) {
  const router = useRouter();
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isLight = variant === 'light';
  const inkColor = isLight ? '#FAF8F5' : '#1C1917';
  const subColor = isLight ? '#D6D3D1' : '#57534E';
  const accentBar = isLight ? '#A8A29E' : '#57534E';

  const dimensions = {
    sm: { box: 'h-8 w-8', title: 'text-sm', sub: 'text-[9px]' },
    md: { box: 'h-9 w-9', title: 'text-base', sub: 'text-[9px]' },
    lg: { box: 'h-11 w-11', title: 'text-xl', sub: 'text-[10px]' },
  }[size];

  const triggerHiddenAdminAccess = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    clickCountRef.current = 0;
    router.push('/admin');
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    clickCountRef.current += 1;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    if (clickCountRef.current >= 3) {
      triggerHiddenAdminAccess(e);
      return;
    }
    clickTimerRef.current = setTimeout(() => {
      clickCountRef.current = 0;
    }, 900);
  };

  const handlePointerDown = () => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHiddenAdminAccess();
    }, 800);
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      onClick={handleLogoClick}
      onDoubleClick={triggerHiddenAdminAccess}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      onPointerCancel={clearLongPress}
      className="inline-flex items-center gap-2.5 select-none"
    >
      <div
        className={`flex ${dimensions.box} shrink-0 items-center justify-center rounded-lg border ${
          isLight
            ? 'border-stone-700 bg-stone-900'
            : 'border-[#D6D3D1] bg-[#FFFFFF]'
        } p-1.5 shadow-2xs`}
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
          aria-hidden="true"
        >
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="8"
            stroke={isLight ? '#FAF8F5' : '#1C1917'}
            strokeWidth="2.4"
          />
          <path
            d="M12 24H18V33C18 34.657 16.657 36 15 36C13.343 36 12 34.657 12 33V24Z"
            fill={isLight ? '#FAF8F5' : '#1C1917'}
          />
          <rect x="21" y="11" width="6" height="26" rx="1.5" fill={accentBar} />
          <path
            d="M30 15C30 13.343 31.343 12 33 12C34.657 12 36 13.343 36 15V25H30V15Z"
            fill={isLight ? '#FAF8F5' : '#1C1917'}
          />
        </svg>
      </div>

      <div className="flex flex-col justify-center">
        <div
          className={`flex items-baseline font-semibold tracking-[0.22em] ${dimensions.title} leading-none`}
          style={{ color: inkColor }}
        >
          <span>TRAZO</span>
        </div>
        <span
          className={`mt-1 block font-medium tracking-[0.2em] uppercase ${dimensions.sub} leading-none`}
          style={{ color: subColor }}
        >
          Espacio Gráfico
        </span>
      </div>
    </div>
  );
}
