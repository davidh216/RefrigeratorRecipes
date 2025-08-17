'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/auth';
import { Container } from '@/components/ui/Container';

export default function SignUpPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signup');

  const handleSuccess = () => {
    router.push('/ingredients');
  };

  return (
    <Container className="py-12">
      <AuthForm 
        mode={mode} 
        onSuccess={handleSuccess}
        onModeChange={setMode}
      />
    </Container>
  );
}