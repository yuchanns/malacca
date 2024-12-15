import { Context, Next } from "hono";
import { AppContext, setMiddlewares } from '.';

export const virtualKeyMiddleware = async (c: Context<AppContext>, next: Next) => {
    setMiddlewares(c, 'virtualKey');
    const apiKey = c.get('getVirtualKey')(c);
		const result = await c.env.MALACCA_DB.prepare(
        "SELECT RealKey FROM MalaccaUser WHERE VirtualKey = ?",
      )
        .bind(apiKey)
        .first<Record<string, string>>();
    if (!result) {
        return c.text('Unauthorized', 401);
    }
    c.set('realKey', result["RealKey"]);
    await next();
};
