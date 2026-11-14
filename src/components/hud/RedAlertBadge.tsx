import React from 'react';

/** Glossy red notification badge ("!") matching Reference 4 */
const RedAlertBadge: React.FC = () => (
  <svg
    viewBox="0 0 28 28"
    className="w-5 h-5 md:w-6 md:h-6 absolute -top-1 -right-1 drop-shadow-sm pointer-events-none"
    aria-hidden="true"
  >
    <circle
      cx="14"
      cy="14"
      r="11.5"
      fill="#ff1f2d"
      stroke="#140c04"
      strokeWidth="2.8"
    />
    <path
      d="M7.5 10.5A8 8 0 0118.5 6"
      stroke="#ff9aa2"
      strokeWidth="2.4"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M15.2 7.2l-1.6 8.2"
      stroke="#ffffff"
      strokeWidth="3.6"
      strokeLinecap="round"
    />
    <circle cx="13.2" cy="19.8" r="2" fill="#ffffff" />
  </svg>
);

export { RedAlertBadge };
