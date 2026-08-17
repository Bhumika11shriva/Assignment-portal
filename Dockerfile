FROM php:8.2-apache

# MySQL PDO driver
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Apache: allow .htaccess overrides, enable rewrite (harmless if unused)
RUN a2enmod rewrite headers

COPY . /var/www/html/

# uploads/ must exist and be writable by the web server
RUN mkdir -p /var/www/html/uploads && chown -R www-data:www-data /var/www/html/uploads

# Render injects a $PORT env var at runtime (not build time), so bind
# Apache to it via a tiny start script instead of baking in a fixed port.
RUN printf '#!/bin/sh\nset -e\nPORT="${PORT:-80}"\nsed -i "s/80/${PORT}/g" /etc/apache2/ports.conf /etc/apache2/sites-available/000-default.conf\nexec apache2-foreground\n' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

EXPOSE 80
CMD ["/usr/local/bin/start.sh"]
