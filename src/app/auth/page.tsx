import AuthForm from '@/components/auth/AuthForm';

export default function AuthPage() {
  return (
    <div style={{ minHeight: 'calc(100vh - var(--header-height))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <AuthForm />
    </div>
  );
}
