"use client";

import { useState, useEffect } from 'react';

/**
 * Este componente serve para garantir que seus filhos (`children`)
 * só sejam renderizados no lado do cliente (no navegador).
 * Isso é útil para evitar erros de hidratação do Next.js, especialmente
 * com bibliotecas que manipulam o DOM diretamente, como as de gráficos.
 */
export default function ClientOnlyWrapper({ children }) {
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        // Este efeito só roda no cliente, após a montagem inicial.
        setHasMounted(true);
    }, []);

    // Se o componente ainda não montou no cliente, não renderiza nada.
    if (!hasMounted) {
        return null;
    }

    // Após a montagem, renderiza os componentes filhos.
    return <>{children}</>;
}
