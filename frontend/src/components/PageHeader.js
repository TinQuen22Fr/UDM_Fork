import React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions, className }) {
    return (
        <div className={cn('mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3', className)}>
            <div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">{description}</p>
                )}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
