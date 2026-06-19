export default async (req) => {
  const body = await req.json().catch(() => ({}));
  return new Response(JSON.stringify({
    status: "Alpha Node Online",
    law: "48",
    received: body.message || "No message",
    message: "Test successful. Awaiting upstream confirmation."
  }, null, 2), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
};
