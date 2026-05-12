import { type HTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
}

const sizeMap = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
};

export function Container({ size = 'lg', children, className, ...props }: ContainerProps) {
  return (
    <div
      className={clsx('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeMap[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}
