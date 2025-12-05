# ==========================================================================
# FlickPick Production Dockerfile
# Multi-stage build for optimized production image
# ==========================================================================

# --------------------------------------------------------------------------
# Stage 1: Dependencies (all, including dev for build)
# --------------------------------------------------------------------------
FROM node:20-alpine AS deps

# Add libc6-compat for Alpine compatibility
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev for TypeScript/build tools)
RUN npm ci

# --------------------------------------------------------------------------
# Stage 2: Builder
# --------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for environment variables
# NEXT_PUBLIC_* vars must be available at build time for Next.js
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_AD_PROVIDER=placeholder
ARG NEXT_PUBLIC_UMAMI_WEBSITE_ID
ARG NEXT_PUBLIC_UMAMI_URL
ARG TMDB_API_KEY
ARG TMDB_ACCESS_TOKEN
ARG GEMINI_API_KEY

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_AD_PROVIDER=$NEXT_PUBLIC_AD_PROVIDER
ENV NEXT_PUBLIC_UMAMI_WEBSITE_ID=$NEXT_PUBLIC_UMAMI_WEBSITE_ID
ENV NEXT_PUBLIC_UMAMI_URL=$NEXT_PUBLIC_UMAMI_URL
ENV TMDB_API_KEY=$TMDB_API_KEY
ENV TMDB_ACCESS_TOKEN=$TMDB_ACCESS_TOKEN
ENV GEMINI_API_KEY=$GEMINI_API_KEY

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# --------------------------------------------------------------------------
# Stage 3: Runner (Production)
# --------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install dependencies for sharp (Next.js image optimization)
RUN apk add --no-cache libc6-compat

# Set environment variables
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy standalone build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

# Expose the port
EXPOSE 3000

# Health check (use 127.0.0.1 instead of localhost to avoid IPv6 issues)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Start the application
CMD ["node", "server.js"]
