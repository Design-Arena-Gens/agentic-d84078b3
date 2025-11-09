export const metadata = {
  title: "Cat Forest Video Generator",
  description: "Generate a video of a cat moving in a forest.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
