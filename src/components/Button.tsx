// Shared button system: a small set of consistent treatments used across
// the whole site instead of one-off ad-hoc classNames on every CTA.
//
//   primary   — solid Congo red, for the single most important action in a view
//   secondary — outline/ghost background, for supporting actions
//   ghost     — text-only link style, for tertiary actions
//   danger    — outline red, reserved for destructive actions (delete)
//
// Renders a <Link> when `href` is a local path, a plain <a> when it looks
// like an external/absolute URL, and a <button> otherwise — so the same
// visual system covers navigation CTAs and in-page actions alike.
'use client';

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'inline-flex items-center justify-center gap-1.5 font-bold rounded-full no-underline transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none cursor-pointer';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-red text-white hover:bg-brand-red-dark hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-8px_rgba(210,28,46,0.55)] active:translate-y-0',
  secondary:
    'bg-white text-brand-ink border border-brand-line hover:border-brand-blue hover:text-brand-blue-deep',
  ghost:
    'bg-transparent text-brand-blue-deep hover:text-brand-blue underline-offset-4 hover:underline px-0 py-0',
  danger:
    'bg-transparent text-brand-danger border border-brand-danger/70 hover:bg-brand-danger/10',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'text-xs px-3.5 py-2',
  md: 'text-sm px-5 py-2.5',
  lg: 'text-base px-7 py-3.5',
};

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  fullWidth?: boolean;
};

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & { href?: undefined };

type ButtonAsLink = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'className' | 'children' | 'href'> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

function buildClassName(variant: ButtonVariant, size: ButtonSize, fullWidth: boolean | undefined, className: string) {
  const sizeClass = variant === 'ghost' ? '' : SIZE_CLASSES[size];
  const widthClass = fullWidth ? 'w-full' : '';
  return [BASE, VARIANT_CLASSES[variant], sizeClass, widthClass, className].filter(Boolean).join(' ');
}

export function Button(props: ButtonProps) {
  const anyProps = props as Record<string, unknown>;
  const {
    variant = 'primary',
    size = 'md',
    className = '',
    children,
    fullWidth,
    href,
    ...rest
  } = anyProps as {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
    children: ReactNode;
    fullWidth?: boolean;
    href?: string;
    [key: string]: unknown;
  };
  const cls = buildClassName(variant, size, fullWidth, className);

  if (href) {
    if (/^(https?:\/\/|tel:|mailto:)/.test(href)) {
      return (
        <a href={href} className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
