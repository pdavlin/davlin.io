const robotsTXT = await fetch("https://api.darkvisitors.com/robots-txts", {
  method: "POST",
  headers: {
    Authorization: "Bearer " + "a22ae245-1006-4025-9ad8-37d4c37f299b",
    "Content-Type": "application/json",
  },
  body: '{"agent_types":["AI Data Scraper","Undocumented AI Agent"],"disallow":"/"}',
});

// Cache and serve this from your website's /robots.txt path
export async function GET() {
  console.log("trying to parse this response");
  return new Response(await robotsTXT.text(), {
    headers: { "Content-Type": "text/plain" },
    status: 200, // optional, default is 200
    statusText: "OK", // optional, default is 'OK'
  });
}
