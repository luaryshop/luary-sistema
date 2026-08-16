import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { marketplaceRouter } from "./routers/marketplace";
import { productsRouter } from "./routers/products";
import { ordersRouter } from "./routers/orders";
import { catalogRouter } from "./routers/catalog";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),

    // Login local por senha (substitui o OAuth da Manus). A senha vem da
    // variável de ambiente ADMIN_PASSWORD — não fica no código-fonte.
    login: publicProcedure
      .input(z.object({ password: z.string().min(1, "Senha obrigatória") }))
      .mutation(async ({ input, ctx }) => {
        if (!ENV.adminPassword) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "ADMIN_PASSWORD não configurada no servidor.",
          });
        }
        if (input.password !== ENV.adminPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Senha incorreta" });
        }

        const openId = ENV.ownerOpenId;
        await db.upsertUser({
          openId,
          name: ENV.ownerName,
          email: null,
          loginMethod: "password",
          lastSignedIn: new Date(),
          role: "admin",
        });

        const sessionToken = await sdk.createSessionToken(openId, {
          name: ENV.ownerName,
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true } as const;
      }),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  marketplace: marketplaceRouter,
  products: productsRouter,
  orders: ordersRouter,
  catalog: catalogRouter,

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
