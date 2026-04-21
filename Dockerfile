FROM node:22

ENV PORT=3000

RUN corepack enable
RUN corepack prepare pnpm@10.23.0 --activate

# Create nextjs user with a real home directory
RUN addgroup --system --gid 1001 nextjs \
  && adduser --system --uid 1001 --ingroup nextjs --home /home/nextjs nextjs \
  && mkdir -p /home/nextjs \
  && chown -R nextjs:nextjs /home/nextjs

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

RUN pnpm build

# Allow access to the app directory
RUN chown -R nextjs:nextjs /app

USER nextjs

EXPOSE 3000

CMD ["pnpm", "start"]