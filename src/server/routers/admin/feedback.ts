import { z } from "zod";
import { router } from "../../trpc";
import { superAdminProcedure } from "../../trpc/admin-middleware";

export const adminFeedbackRouter = router({
  list: superAdminProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
        type: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.type) where.type = input.type;
      if (input.status) where.status = input.status;

      const [items, total] = await Promise.all([
        ctx.db.feedback.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: input.pageSize,
          skip: (input.page - 1) * input.pageSize,
        }),
        ctx.db.feedback.count({ where }),
      ]);

      return { items, total, pages: Math.ceil(total / input.pageSize) };
    }),

  getNPSScore: superAdminProcedure.query(async ({ ctx }) => {
    const npsItems = await ctx.db.feedback.findMany({
      where: { type: "nps", score: { not: null } },
      select: { score: true },
    });

    if (npsItems.length === 0) return { score: null, promoters: 0, passives: 0, detractors: 0, total: 0 };

    let promoters = 0, passives = 0, detractors = 0;
    for (const item of npsItems) {
      if ((item.score ?? 0) >= 9) promoters++;
      else if ((item.score ?? 0) >= 7) passives++;
      else detractors++;
    }

    const total = npsItems.length;
    const nps = Math.round(((promoters - detractors) / total) * 100);

    return { score: nps, promoters, passives, detractors, total };
  }),

  getScoreDistribution: superAdminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.$queryRaw<{ score: number; count: number }[]>`
      SELECT score, COUNT(*)::int AS count
      FROM "Feedback"
      WHERE type = 'nps' AND score IS NOT NULL
      GROUP BY score
      ORDER BY score ASC
    `;
    return rows;
  }),

  updateStatus: superAdminProcedure
    .input(z.object({ id: z.string(), status: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.feedback.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
