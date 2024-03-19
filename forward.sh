#!/bin/bash

# Create nginx.conf file
cat > nginx.conf <<EOL
events {
    worker_connections 1024;
}

http {
    server {
        listen 443 ssl;
        server_name localhost;

        ssl_certificate /etc/nginx/cert.pem;
        ssl_certificate_key /etc/nginx/key.pem;

        location / {
            proxy_pass $2;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
}
EOL

# Generate self-signed SSL certificate and private key
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "/CN=localhost"

# Run Docker command to start the HTTPS wrapper
docker run -d --name $1 -p 443:443 -v $(pwd)/nginx.conf:/etc/nginx/nginx.conf -v $(pwd)/cert.pem:/etc/nginx/cert.pem -v $(pwd)/key.pem:/etc/nginx/key.pem nginx
