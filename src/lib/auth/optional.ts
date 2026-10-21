import { createMiddleware } from "@tanstack/react-start";

/**
 * Like auth middleware, but signed-out visitors continue as guests.
 * Admin routes must keep using `authMiddleware` and `assertAdmin`.
 */
export const optionalAuthMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const { getBearerToken } = await import("./client");
    return next({ sendContext: { bearerToken: getBearerToken() ?? undefined } });
  })
  .server(async ({ next, context }) => {
    const { assertSameSiteRequest } = await import("./isolation.server");
    const { getSessionUser } = await import("./verify.server");
    assertSameSiteRequest();
    let userId: string | null = null;
    let email: string | null = null;
    try {
      const user = await getSessionUser(context.bearerToken);
      userId = user?.id ?? null;
      email = user?.email ?? null;
    } catch {
      userId = null;
      email = null;
    }
    return next({ context: { userId, email } });
  });
