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