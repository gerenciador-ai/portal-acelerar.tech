import { redirect } from 'next/navigation';

export default function ComercialRootPage() {
  // Esta função será executada quando alguém acessar /comercial
  // e irá redirecioná-los imediatamente para /comercial/resultados.
  redirect('/comercial/resultados');
}
