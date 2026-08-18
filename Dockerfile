<<<<<<< HEAD
FROM php:8.2-apache

# PostgreSQL PDO driver
RUN docker-php-ext-install pdo pdo_pgsql pgsql

# Apache: allow .htaccess overrides, enable rewrite
RUN a2enmod rewrite headers

COPY . /var/www/html/

# uploads/ must exist and be writable by the web server
RUN mkdir -p /var/www/html/uploads && chown -R www-data:www-data /var/www/html/uploads

# Render injects a $PORT environment variable at runtime.
# Bind Apache to the Render-provided port.
RUN printf '#!/bin/sh\nset -e\nsed -i "s/^Listen 80$/Listen ${PORT:-80}/" /etc/apache2/ports.conf\nsed -i "s/:80>/:${PORT:-80}>/g" /etc/apache2/sites-available/000-default.conf\nexec apache2-foreground\n' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 80

CMD ["/usr/local/bin/start.sh"]
=======
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
>>>>>>> origin/main
