import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const FormField = React.forwardRef<HTMLLabelElement, FormFieldProps>(
  ({ className, label, description, error, required, children, ...props }, ref) => (
    <label className={cn('block space-y-1.5', className)} ref={ref} {...props}>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {required && <span className="text-sm text-destructive" aria-hidden="true">*</span>}
      </div>
      {children}
      {description && !error && <p className="text-xs text-muted-foreground">{description}</p>}
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
    </label>
  )
);

FormField.displayName = 'FormField';