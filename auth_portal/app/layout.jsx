import './globals.css';

export const metadata = {
  title: "Black Brand",
  description: "Black Brand portal",
  icons: {
    icon: "/black-brand-circle-wordmark.png",
    shortcut: "/black-brand-circle-wordmark.png",
    apple: "/black-brand-circle-wordmark.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
