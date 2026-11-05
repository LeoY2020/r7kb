import type { SVGProps } from 'react';

export type IconName =
  | 'graph'
  | 'quiz'
  | 'library'
  | 'faq'
  | 'arrow'
  | 'arrowUpRight'
  | 'plus'
  | 'sparkle'
  | 'check'
  | 'heart'
  | 'search'
  | 'menu'
  | 'close'
  | 'chevronDown'
  | 'download'
  | 'clock'
  | 'book'
  | 'lightbulb'
  | 'sun'
  | 'moon'
  | 'knowledge'
  | 'notebook'
  | 'tag'
  | 'trash'
  | 'edit'
  | 'copy'
  | 'upload'
  | 'file'
  | 'filter'
  | 'chevronRight'
  | 'alert'
  | 'link'
  | 'calendar';

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

/**
 * 统一的线性图标。全部为 24 格 stroke 图标，不引入图标库依赖。
 */
export function Icon({ name, size = 20, ...rest }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  };

  switch (name) {
    case 'graph':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.4" />
          <circle cx="18" cy="7" r="2.4" />
          <circle cx="12" cy="18" r="2.4" />
          <path d="M8.2 7.2 15.9 8.6M7.3 8.2l3.6 7.6M16.6 9.1l-3.4 6.7" />
        </svg>
      );
    case 'quiz':
      return (
        <svg {...common}>
          <path d="M5 4.5h14v15H5z" />
          <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
        </svg>
      );
    case 'library':
      return (
        <svg {...common}>
          <path d="M4 6.5c0-1 .8-1.8 1.8-1.8H9v15H5.8c-1 0-1.8-.8-1.8-1.8z" />
          <path d="M9 4.7h4.2v15H9z" />
          <path d="m15.2 5.6 3.5 1-3.1 13.1-3.5-1z" />
        </svg>
      );
    case 'faq':
      return (
        <svg {...common}>
          <path d="M4.5 5.5h15v10.2H12l-4.5 3.4v-3.4H4.5z" />
          <path d="M9.6 9.2a2.4 2.4 0 1 1 3.2 2.3c-.6.2-.9.7-.9 1.3v.4" />
          <path d="M11.9 15.6h.01" />
        </svg>
      );
    case 'arrow':
      return (
        <svg {...common}>
          <path d="M4.5 12h15M13.5 6l6 6-6 6" />
        </svg>
      );
    case 'arrowUpRight':
      return (
        <svg {...common}>
          <path d="M7 17 17 7M9 7h8v8" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case 'sparkle':
      return (
        <svg {...common}>
          <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9z" />
          <path d="M18.5 16.5 19.2 19l2.3.7-2.3.7-.7 2.4-.7-2.4-2.3-.7 2.3-.7z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m5 12.5 4.5 4.5L19 7" />
        </svg>
      );
    case 'heart':
      return (
        <svg {...common}>
          <path d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 7.6a4.1 4.1 0 0 1 7.5 3c0 4.8-7.5 9.4-7.5 9.4z" />
        </svg>
      );
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.2" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );
    case 'chevronDown':
      return (
        <svg {...common}>
          <path d="m6 9.5 6 6 6-6" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 4v10M8 10.5l4 4 4-4M5 19h14" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7.5V12l3 1.8" />
        </svg>
      );
    case 'book':
      return (
        <svg {...common}>
          <path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h12.5v15H7a2.5 2.5 0 0 0-2.5 2.5z" />
          <path d="M4.5 5.5v15.2" />
        </svg>
      );
    case 'lightbulb':
      return (
        <svg {...common}>
          <path d="M9 17.5h6M10 20.5h4" />
          <path d="M12 3.5a5.5 5.5 0 0 0-3.2 9.9c.5.4.7 1 .7 1.6v.5h5v-.5c0-.6.2-1.2.7-1.6A5.5 5.5 0 0 0 12 3.5z" />
        </svg>
      );
    case 'sun':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
        </svg>
      );
    case 'moon':
      return (
        <svg {...common}>
          <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8.2 8.2 0 1 0 10.5 10.5z" />
        </svg>
      );
    case 'knowledge':
      return (
        <svg {...common}>
          <path d="M4 5.5 12 3l8 2.5v5L12 13 4 10.5z" />
          <path d="M4 12.5 12 15l8-2.5M4 16.5 12 19l8-2.5" />
        </svg>
      );
    case 'notebook':
      return (
        <svg {...common}>
          <path d="M6 3.5h12.5v17H6z" />
          <path d="M6 3.5v17M9.5 3.5v17" />
          <path d="M12.5 8.5h3M12.5 12h3M12.5 15.5h2" />
        </svg>
      );
    case 'tag':
      return (
        <svg {...common}>
          <path d="M4.5 11.2V5.5a1 1 0 0 1 1-1h5.7L20 13.3a1.6 1.6 0 0 1 0 2.3l-4.4 4.4a1.6 1.6 0 0 1-2.3 0z" />
          <circle cx="8.6" cy="8.6" r="1.3" />
        </svg>
      );
    case 'trash':
      return (
        <svg {...common}>
          <path d="M4.5 6.5h15M9 6.5V4.2h6v2.3M6.5 6.5l.9 13.2h9.2l.9-13.2" />
          <path d="M10 10v6M14 10v6" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M4 20h4.5L19 9.5a1.8 1.8 0 0 0 0-2.5l-1-1a1.8 1.8 0 0 0-2.5 0L5 16.5z" />
          <path d="M13.5 7.5 16.5 10.5" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...common}>
          <rect x="8.5" y="8.5" width="11" height="12" rx="2" />
          <path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4M8 8l4-4 4 4M5 20h14" />
        </svg>
      );
    case 'file':
      return (
        <svg {...common}>
          <path d="M6 3.5h8l4 4v13H6z" />
          <path d="M14 3.5v4h4M9 12h6M9 16h6" />
        </svg>
      );
    case 'filter':
      return (
        <svg {...common}>
          <path d="M4 6.5h16L14 13v6l-4 2v-8z" />
        </svg>
      );
    case 'chevronRight':
      return (
        <svg {...common}>
          <path d="m9.5 6 6 6-6 6" />
        </svg>
      );
    case 'alert':
      return (
        <svg {...common}>
          <path d="M12 3.8 21 20H3z" />
          <path d="M12 9.5v4.6M12 17.2h.01" />
        </svg>
      );
    case 'link':
      return (
        <svg {...common}>
          <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.8 6.5" />
          <path d="M13.5 10.5a4 4 0 0 0-5.7 0L5.2 13a4 4 0 0 0 5.7 5.7l1.3-1.3" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="4" y="5.5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" />
        </svg>
      );
    default:
      return null;
  }
}

export default Icon;