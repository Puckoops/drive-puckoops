export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="preload" as="image" type="image/webp" href="/bg/edna.webp" fetchPriority="high" />
      {children}
    </>
  );
}
