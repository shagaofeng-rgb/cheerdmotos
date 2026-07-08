export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="10" fill="#101010"/><path d="M12 42 25 14h11L23 42H12Zm23 0 13-28h6L41 42h-6Z" fill="#ff5a14"/></svg>`;

  return new Response(svg, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": "image/svg+xml"
    }
  });
}
