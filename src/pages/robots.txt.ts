const authToken = import.meta.env.PUBLIC_DARK_VISITOR_AUTH_TOKEN;

const robotsTXT = await fetch("https://api.darkvisitors.com/robots-txts", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + authToken,
    "Content-Type": "application/json",
  },
  body: '{"agent_types":["AI Data Scraper","Undocumented AI Agent"],"disallow":"/"}',
});

// Cache and serve this from your website's /robots.txt path
export async function GET() {
  return new Response(await robotsTXT.text(), {
    headers: { "Content-Type": "text/plain" },
    status: 200, // optional, default is 200
    statusText: "OK", // optional, default is 'OK'
  });
}
