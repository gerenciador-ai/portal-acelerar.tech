"use client";
import { useState, useEffect } from 'react';

// Este componente garante que seus "filhos" só sejam renderizados no lado do cliente.
// Isso evita erros de hidratação do Next.js.
export default function ClientOnlyWrapper({ children }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!hasMounted) {
        // Enquanto não estiver montado no cliente, não renderiza nada (ou um loader).
        // Isso garante que o servidor e o cliente inicial vejam a mesma coisa (nada).
        return <div className="text-center p-10 text-white/50">Carregando dashboard...</div>;
    }

    // Depois de montado no cliente, renderiza o conteúdo real.
    return <>{children}</>;
}
