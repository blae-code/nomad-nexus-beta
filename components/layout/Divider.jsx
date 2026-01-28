import { cn } from '@/lib/utils';

export default function Divider({ 
  className = '', 
  variant = 'default',
  orientation = 'horizontal',
  spacing = 'md'
}) {
  const variants = {
    default: 'divider',
    subtle: 'divider divider--subtle',
  };

  const orientationClasses = {
    horizontal: 'w-full h-[1px]',
    vertical: 'divider--vertical h-full w-[1px]',
  };

  const spacingClasses = {
    none: 'my-0',
    xs: 'my-[4px]',
    sm: 'my-2',
    md: 'my-3',
    lg: 'my-4',
    xl: 'my-6',
  };

  if (orientation === 'vertical') {
    return (
      <div 
        className={cn(
          variants[variant],
          orientationClasses[orientation],
          'mx-0',
          className
        )}
        role="separator"
        aria-orientation="vertical"
      />
    );
  }

  return (
    <hr 
      className={cn(
        variants[variant],
        orientationClasses[orientation],
        spacing !== 'none' && spacingClasses[spacing],
        className
      )}
      role="separator"
    />
  );
}