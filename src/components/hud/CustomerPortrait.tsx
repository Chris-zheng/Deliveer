import React from 'react';
import type { PersonAppearance } from '../../game/types';
import { toHexColor } from './utils';

const CustomerPortraitSvg: React.FC<{ appearance: PersonAppearance | null }> = ({
  appearance,
}) => {
  const skin = appearance ? toHexColor(appearance.skinColor) : '#f7d5bc';
  const hair = appearance ? toHexColor(appearance.hairColor) : '#593a27';
  const top = appearance ? toHexColor(appearance.topColor) : '#4ea8de';
  const accent = appearance ? toHexColor(appearance.accentColor) : '#f4845f';
  const isHat =
    appearance?.hairStyle === 'cap' || appearance?.hairStyle === 'sunhat';

  return (
    <svg
      viewBox="0 0 40 40"
      className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl bg-sky-100 border-[2.5px] border-[#140c04]"
      aria-hidden="true"
    >
      <path
        d="M8 39c1-7 5.5-10.5 12-10.5S31 32 32 39"
        fill={top}
        stroke="#140c04"
        strokeWidth="2.4"
      />
      <path
        d="M16 29l4 3.5 4-3.5"
        stroke="#ffffff"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle
        cx="20"
        cy="19"
        r="8.5"
        fill={skin}
        stroke="#140c04"
        strokeWidth="2.4"
      />
      {isHat ? (
        <>
          <path
            d="M11 16c0-5.5 4-9 9-9s9 3.5 9 9H11z"
            fill={accent}
            stroke="#140c04"
            strokeWidth="2.2"
          />
          <rect
            x="8"
            y="14.5"
            width="24"
            height="3"
            rx="1.5"
            fill={appearance?.hairStyle === 'sunhat' ? '#f3d48e' : accent}
            stroke="#140c04"
            strokeWidth="2"
          />
        </>
      ) : (
        <path
          d="M11.5 18c0-6 3.8-9.5 8.5-9.5s8.5 3.5 8.5 9.5c-2-2.2-5-3.2-8.5-3.2s-6.5 1-8.5 3.2z"
          fill={hair}
          stroke="#140c04"
          strokeWidth="2.2"
        />
      )}
      <circle cx="17" cy="19.5" r="1.4" fill="#140c04" />
      <circle cx="23" cy="19.5" r="1.4" fill="#140c04" />
      <path
        d="M17.8 23.2q2.2 1.8 4.4 0"
        stroke="#7c2d12"
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};

export { CustomerPortraitSvg };
