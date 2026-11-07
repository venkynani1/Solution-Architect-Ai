import "./globals.css";

export const metadata = {
  title: "Solution Architect AI",
  description: "Turn a business problem statement into the best solution approach with trending tech.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
