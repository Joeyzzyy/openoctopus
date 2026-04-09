const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="9" fill="#09070B"/>
  <rect x="4.5" y="4.5" width="23" height="23" rx="7" stroke="#F5F5F5" stroke-width="1.5"/>
  <path d="M9.5 20.5L13.75 12.25L17.5 19.5L22.5 11.5" stroke="#F5F5F5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="22.5" cy="11.5" r="1.75" fill="#F5F5F5"/>
</svg>
`;

export async function GET() {
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
