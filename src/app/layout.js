import './globals.css'; // Importa nossos estilos globais (fundo azul, etc)

export const metadata = {
  title: "Portal Acelerar",
  description: "Portal de gestão integrada do Grupo Acelerar",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
