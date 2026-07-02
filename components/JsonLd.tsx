/** Renders a JSON-LD structured-data <script>. The `<` escape guards against
 *  XSS when values contain user text (per Next.js JSON-LD guidance). */
export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
