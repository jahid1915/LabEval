import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * StudentAuth Legacy Redirection Stub
 * Student self-registration has been permanently disabled.
 * All authentication is handled securely through /login.
 */
export default function StudentAuth() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
}
