# Railway (or any container host): serve the static app with Caddy.
FROM caddy:2.8.4-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY index.html manifest.webmanifest sw.js /srv/
COPY css /srv/css
COPY js /srv/js
COPY icons /srv/icons
