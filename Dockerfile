# Assignment Portal — Dockerfile for Render
# PHP 8.2 + Apache, with the Postgres PDO driver so php/db.php can
# talk to Render's managed PostgreSQL via DATABASE_URL.

FROM php:8.2-apache

# PDO Postgres driver (php:apache images don't include it by default)
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq-dev \
    && docker-php-ext-install pdo_pgsql \
    && rm -rf /var/lib/apt/lists/*

# Apache should serve the project root (index.html, php/, css/, js/...)
COPY . /var/www/html/

# The uploads/ folder must exist and be writable — submissions and
# assignment attachments are saved here.
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod 755 /var/www/html/uploads

# Render provides $PORT at runtime (varies per deploy) and expects the
# app to listen on it — Apache's port is rewritten at container start,
# not at build time, since $PORT isn't known until then.
ENV PORT=10000
EXPOSE 10000

CMD ["sh", "-c", "sed -ri \"s/Listen [0-9]+/Listen ${PORT}/g\" /etc/apache2/ports.conf && sed -ri \"s/:[0-9]+>/:${PORT}>/g\" /etc/apache2/sites-available/000-default.conf && apache2-foreground"]
