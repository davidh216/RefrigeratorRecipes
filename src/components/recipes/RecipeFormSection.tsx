import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface RecipeFormSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const RecipeFormSection: React.FC<RecipeFormSectionProps> = ({
  title,
  children,
  className = '',
}) => {
  return (
    <Card className={`shadow-sm ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
};
