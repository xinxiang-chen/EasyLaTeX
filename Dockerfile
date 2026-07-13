# syntax=docker/dockerfile:1
# EasyLaTeX render backend
# latex -> DVI -> dvisvgm -> SVG, served via Node on Cloud Run.
#
# TeX packages installed via apt (Debian TeX Live) — reproducible, no tlmgr needed.
# Layer order: system deps first (rare change) → app files last (frequent change).

FROM node:22-bookworm-slim

# Install TeX Live packages we need + dvisvgm.
# texlive-latex-base:  latex binary, base LaTeX2e
# texlive-latex-extra: multirow, array, caption, preview, booktabs, and many more
# texlive-fonts-recommended: CM/Latin Modern fonts; needed by dvisvgm glyph tracing
# texlive-science:     in case users include siunitx etc. (optional but cheap here)
# dvisvgm is part of texlive-binaries on bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
        texlive-latex-base \
        texlive-latex-extra \
        texlive-fonts-recommended \
        texlive-binaries \
    && rm -rf /var/lib/apt/lists/*

# Verify the key binaries exist — fail the build early if the image is wrong.
RUN which latex dvisvgm \
    && kpsewhich multirow.sty preview.sty booktabs.sty \
    && echo "TeX toolchain OK"

# Run as a non-root user for defence-in-depth (TeX still runs inside a restricted
# temp dir, but we don't need or want root for the Node process itself).
RUN useradd -m -u 1001 appuser
WORKDIR /app

# Copy only the server files — the static frontend is hosted separately on Vercel.
COPY --chown=appuser:appuser server/ ./server/
COPY --chown=appuser:appuser package.json ./

USER appuser

# Cloud Run sets PORT automatically; default 8080 is the platform standard.
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
