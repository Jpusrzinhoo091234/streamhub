import './globals.css';

export const metadata = {
    title: 'StreamHub — Download de Músicas',
    description: 'Baixe músicas do Spotify, YouTube e mais com um clique.',
};

export default function RootLayout({ children }) {
    return (
        <html lang="pt-br" suppressHydrationWarning>
            <body>
                <div className="background-elements">
                    <div className="blob blob-1"></div>
                    <div className="blob blob-2"></div>
                    <div className="blob blob-3"></div>
                </div>
                {children}
            </body>
        </html>
    );
}
