import type { MiddlewareHandler } from "astro";

export const onRequest: MiddlewareHandler = (context, next) => {
  if (context.url.pathname !== "/site.webmanifest") {
    fetch("https://api.darkvisitors.com/visits", {
      method: "POST",
      headers: {
        Authorization:
          "Bearer " + import.meta.env.PUBLIC_DARK_VISITOR_AUTH_TOKEN,
      },
      body: JSON.stringify({
        request_path: context.url.href,
        request_method: context.request.method,
        request_headers: context.request.headers,
      }),
    });
  }

  // return a Response or the result of calling `next()`
  return next();
};
