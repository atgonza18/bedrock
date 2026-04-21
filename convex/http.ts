import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { streamGenerate } from "./ai/streamTemplate";

const http = httpRouter();

auth.addHttpRoutes(http);

// CORS preflight for the streaming generator. The HTTP action lives on
// *.convex.site while the app lives on localhost / its own domain, so the
// browser fires an OPTIONS before the POST.
const corsPreflight = httpAction(async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
});

http.route({
  path: "/api/generate-template-stream",
  method: "OPTIONS",
  handler: corsPreflight,
});

http.route({
  path: "/api/generate-template-stream",
  method: "POST",
  handler: streamGenerate,
});

export default http;
