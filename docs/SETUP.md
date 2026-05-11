# First-time server setup for ptf-verseny-majus
# Run these commands once on a fresh Ubuntu server.
# After setup, use ./deploy.sh for every update.

# --- 1. Clone the repo ---
cd /home/cyb0rg
git clone git@github.com:Komaxor/ptf-verseny-majus.git
cd ptf-verseny-majus

# --- 2. Create .env.local ---
nano .env.local
# Fill in:
#   NEXT_PUBLIC_SUPABASE_URL=
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=
#   SUPABASE_SERVICE_ROLE_KEY=
#   OPENAI_API_KEY=
#   CRON_SECRET=
#   MAILERLITE_API_KEY=

# --- 3. Install deps & build ---
pnpm install --frozen-lockfile
pnpm build

# --- 4. Find an available port (pick a FREE one for the service below) ---
for port in $(seq 3000 3020); do ss -tlnp | grep -q ":$port " && echo "$port  IN USE" || echo "$port  FREE"; done

# --- 5. Check your node path (use this in the service file) ---
which node

# --- 6. Create systemd service ---
# Replace PORT with the free port you picked, and adjust the node path if needed.
sudo nano /etc/systemd/system/majusi.service
# Paste:
#   [Unit]
#   Description=PTF Verseny Majus (Next.js)
#   After=network.target
#
#   [Service]
#   Type=simple
#   User=cyb0rg
#   WorkingDirectory=/home/cyb0rg/ptf-verseny-majus
#   ExecStart=/home/cyb0rg/.nvm/versions/node/v20.19.2/bin/node node_modules/.bin/next start -p PORT
#   Restart=on-failure
#   RestartSec=5
#   EnvironmentFile=/home/cyb0rg/ptf-verseny-majus/.env.local
#   StandardOutput=journal
#   StandardError=journal
#
#   [Install]
#   WantedBy=multi-user.target

sudo systemctl daemon-reload
sudo systemctl enable majusi.service
sudo systemctl start majusi.service
sudo systemctl status majusi.service

# --- 7. Nginx reverse proxy ---
# Replace YOUR_DOMAIN and PORT.
sudo nano /etc/nginx/sites-available/majusi
# Paste:
#   server {
#       listen 80;
#       server_name YOUR_DOMAIN;
#
#       location / {
#           proxy_pass http://127.0.0.1:PORT;
#           proxy_http_version 1.1;
#           proxy_set_header Upgrade $http_upgrade;
#           proxy_set_header Connection "upgrade";
#           proxy_set_header Host $host;
#           proxy_set_header X-Real-IP $remote_addr;
#           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
#           proxy_set_header X-Forwarded-Proto $scheme;
#           proxy_read_timeout 86400;
#       }
#   }

sudo ln -s /etc/nginx/sites-available/majusi /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# --- 8. SSL with Let's Encrypt ---
# Replace YOUR_DOMAIN.
sudo certbot --nginx -d YOUR_DOMAIN
# Verify auto-renewal:
sudo systemctl list-timers | grep certbot

# --- 9. Passwordless sudo for deploy.sh ---
sudo visudo -f /etc/sudoers.d/cyb0rg-majusi
# Add this line:
#   cyb0rg ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart majusi.service, /usr/bin/systemctl status majusi.service

# --- 10. Make deploy script executable ---
chmod +x deploy.sh

# --- Done! From now on just run: ./deploy.sh ---
