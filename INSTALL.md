# Installation and remote access

This guide explains how to install Server Control Center (SCC), what localhost means, and how to make the dashboard available safely through SSH, Nginx or Caddy.

[Russian guide](INSTALL.ru.md) · [Project overview](README.md)

---

## Supported operating systems

The public one-command installer currently supports **Ubuntu Server 24.04 LTS only**, on `amd64` and `arm64`.

| Operating system | Status |
|---|---|
| Ubuntu Server 24.04 LTS | Supported |
| Ubuntu 22.04 / 26.04 and other Ubuntu releases | Not supported or tested |
| Debian 12 / 13 | Not currently supported; adaptation and testing are required |
| Linux Mint, Pop!_OS and other Ubuntu/Debian derivatives | Not officially supported |
| Fedora, Rocky Linux, AlmaLinux, RHEL, openSUSE, Alpine | Not supported by the current installer |

This restriction is intentional: the installer checks for Ubuntu 24.04, uses `apt`, Ubuntu/Docker repository configuration and Ubuntu-specific service/configuration paths. The host-agent also requires systemd and host tools such as Docker CLI, `iproute2`, `ping` and `journalctl`.

The web application runs in a container, but the host-agent must run on the host operating system to read real host metrics. Running only the dashboard container on another distribution is not a complete SCC installation.

Additional operating systems may be supported later with dedicated installers and CI tests for each OS. Do not bypass the version check or run the internal installer on an unsupported distribution and assume it is safe.

## 1. Choose how you want to access SCC

There are three common ways to use the dashboard:

| Method | Best for | Public ports |
|---|---|---|
| SSH tunnel | One administrator; no public website or domain is needed | SSH only; no public SCC port |
| Nginx reverse proxy | Nginx already serves your websites, or you prefer Nginx | TCP 80 and 443 |
| Caddy reverse proxy | A new or simple setup where automatic HTTPS is preferred | TCP 80 and 443 |

Nginx and Caddy are alternatives for the public web entry point. Do not try to make both listen on the same public IP and ports 80/443 at the same time. If Nginx already serves your websites, add SCC to that Nginx instance. If Caddy already serves your websites, add SCC to its Caddyfile.

You can use another reverse proxy, too. It must forward the complete SCC website to http://127.0.0.1:3000 and must require authentication before allowing access.

## 2. Understand localhost, IP addresses and ports

This is the most important part for a first-time installation.

### What does localhost mean?

localhost means **this same computer**.

- 127.0.0.1 is the IPv4 loopback address.
- ::1 is the IPv6 loopback address.
- Connections to these addresses stay inside the computer. They do not travel over the public internet.

A common misunderstanding: localhost in your laptop's browser means **your laptop**, not your VPS. When you open http://127.0.0.1:3000 on your laptop, the browser tries to connect to port 3000 on the laptop itself.

SCC publishes its web port on 127.0.0.1:3000 of the **server**. Therefore:

- A program running on the VPS can reach SCC at http://127.0.0.1:3000.
- Nginx or Caddy running on the same VPS can reach SCC at http://127.0.0.1:3000.
- Another computer on the internet cannot connect directly to the server's port 3000.

### What does 0.0.0.0 mean here?

Inside the Docker container, the Node.js application listens on 0.0.0.0:3000. This means it accepts connections on the container's network interfaces.

That does **not** make it publicly accessible. Docker publishes the container port on the host as follows:

~~~yaml
ports:
  - "127.0.0.1:3000:3000"
~~~

The left side is the host address and port. The right side is the container port. The host-side binding is restricted to loopback. Do not change it to 0.0.0.0:3000:3000.

### Ports used by SCC

| Port | Purpose | Publicly reachable? |
|---|---|---|
| 22/tcp (or your custom SSH port) | SSH administration and SSH tunnels | Only if you use SSH; restrict source addresses where practical |
| 80/tcp | HTTP and certificate validation/redirects for Nginx or Caddy | Yes, when using a public domain and HTTP certificate validation |
| 443/tcp | HTTPS connection from a browser to Nginx or Caddy | Yes, when using a public HTTPS domain |
| 3000/tcp | SCC web application on the server's loopback interface | **No** |
| 8099/tcp | Local Nginx stub_status endpoint used by the SCC agent when Nginx is active during installation | **No** |

Port 8099 is not the public address of SCC. It is a separate local-only endpoint used by the host-agent to read Nginx statistics.

### How the components connect

With a domain and reverse proxy, the request flow is:

~~~text
Your browser
    |
    | HTTPS, TCP 443
    v
scc.example.com (DNS points to your VPS)
    |
    v
Nginx or Caddy
    | TLS certificate
    | username/password check
    |
    | HTTP over local loopback
    v
127.0.0.1:3000
    |
    v
SCC web container
    |
    | read-only mount of the agent socket
    v
/run/scc-agent/agent.sock
    |
    v
SCC host-agent (systemd, root)
    |
    v
Host metrics and Docker information
~~~

HTTPS protects the connection from your browser to the reverse proxy. The proxy then connects to SCC over the local loopback interface on the same VPS.

## 3. Prepare your server

### Requirements

- Ubuntu 24.04 LTS.
- amd64 or arm64.
- systemd and apt.
- Root privileges or a user with sudo.
- TCP port 3000 available on the server.
- Outbound HTTPS access to GitHub and GHCR.
- If Docker is not installed, outbound access to Docker's official package repository.

The SCC installer can install Docker Engine if it is absent and no conflicting container runtime is detected. If Docker is already installed but stopped, the installer stops and asks you to start it yourself. It does not intentionally restart an existing Docker daemon or unrelated containers.

### If you want a public domain

Choose a domain or subdomain such as scc.example.com. Before requesting a public TLS certificate:

1. Create a DNS A record for scc.example.com pointing to your server's public IPv4 address.
2. Create an AAAA record only if your VPS has working public IPv6 and its firewall permits incoming traffic over IPv6.
3. Make sure TCP ports 80 and 443 reach this VPS.
4. Check both the server firewall and your hosting provider's firewall/security-group settings.

Do not expose TCP ports 3000 or 8099.

If you use UFW, first make sure your SSH rule is allowed so you do not lock yourself out. For example:

~~~bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
~~~

Do not enable UFW remotely until you have confirmed that your SSH port is allowed and that you have a recovery path through your hosting provider.

## 4. Install SCC

The public one-command installer will become usable after the source repository, GitHub Release archive and GHCR image have been published publicly. Until then, the command below is a preview and cannot complete successfully.

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo bash
~~~

To install a specific version:

~~~bash
curl -fsSL https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh | sudo env SCC_VERSION=1.1.1 bash
~~~

If you prefer to inspect the script first:

~~~bash
curl -fsSLo /tmp/scc-install.sh https://raw.githubusercontent.com/efimwwz/server-control-center/main/install.sh
less /tmp/scc-install.sh
sudo bash /tmp/scc-install.sh
~~~

The installer checks the operating system, architecture, port 3000 and existing SCC resources; checks for conflicting container runtimes; downloads a release archive and verifies its SHA256 checksum; installs the host-agent systemd service; pulls the prebuilt image from GHCR; starts only the SCC container and verifies its health.

The installer does not install n8n and does not use the project author's private infrastructure.

### If Nginx is already installed

If Nginx is active when SCC is installed, the installer adds a separate configuration file:

/etc/nginx/conf.d/scc-nginx-status.conf

It listens only on 127.0.0.1:8099 and provides /nginx_status for the SCC agent. Existing Nginx websites are not replaced.

This metrics endpoint is separate from the Nginx reverse-proxy configuration described below. Never open port 8099 in a public firewall.

## 5. Option A — SSH tunnel (no Nginx or Caddy required)

This is the simplest and safest method if one administrator uses SCC.

On your own computer, open a terminal and run:

~~~bash
ssh -N -L 3000:127.0.0.1:3000 USER@SERVER_IP
~~~

Replace USER with your SSH username on the VPS, and SERVER_IP with the server's public IP address or SSH hostname.

Keep this terminal window open. Then open this address in a browser on your **own computer**:

http://127.0.0.1:3000

The SSH tunnel forwards your laptop's local port 3000 through SSH to 127.0.0.1:3000 on the VPS. No public SCC port or domain is needed.

If port 3000 is already in use on your laptop, use a different local port:

~~~bash
ssh -N -L 13000:127.0.0.1:3000 USER@SERVER_IP
~~~

Then open http://127.0.0.1:13000 on your laptop.

## 6. Option B — Nginx reverse proxy with HTTPS and password protection

Use this option if Nginx already runs on your VPS or you prefer Nginx.

### Step 1 — Install or check Nginx

If Nginx already serves other websites, do not reinstall it. Add SCC as another virtual host in the existing Nginx instance.

If Nginx is not installed:

~~~bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable --now nginx
sudo systemctl status nginx
~~~

### Step 2 — Create a temporary HTTP virtual host for certificate validation

**Do not proxy the SCC dashboard over public HTTP.** First, expose only the certificate-validation path. The dashboard will remain unavailable through the domain until HTTPS and password protection are configured.

Create the webroot used for ACME HTTP validation:

~~~bash
sudo install -d -o www-data -g www-data -m 0755 /var/www/letsencrypt/.well-known/acme-challenge
~~~

Create a new Nginx configuration file:

~~~bash
sudo nano /etc/nginx/sites-available/scc.example.com
~~~

Replace scc.example.com with your real domain:

~~~nginx
server {
    listen 80;
    listen [::]:80;
    server_name scc.example.com;

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        allow all;
    }

    # Keep the dashboard closed until HTTPS and authentication are ready.
    location / {
        return 404;
    }
}
~~~

Enable the site and test the configuration:

~~~bash
sudo ln -s /etc/nginx/sites-available/scc.example.com /etc/nginx/sites-enabled/scc.example.com
sudo nginx -t
sudo systemctl reload nginx
~~~

If the symbolic link already exists, do not create it again. If Nginx reports a duplicate server_name, inspect the existing virtual hosts instead of deleting them blindly.

### Step 3 — Obtain an HTTPS certificate

The domain's DNS record must point to this VPS, and the server must be reachable from the internet on TCP port 80. Both the host firewall and the provider firewall must allow the validation request.

The following uses Certbot's recommended Snap installation method for Ubuntu. If you already have Certbot installed, check its installation source first. Do not keep competing Snap and apt installations.

~~~bash
sudo apt update
sudo apt install -y snapd
sudo snap install --classic certbot
~~~

Make the Certbot command available in the usual path. If the file already exists, inspect it rather than overwriting it:

~~~bash
sudo ln -s /snap/bin/certbot /usr/local/bin/certbot
~~~

Request the certificate and let Certbot configure HTTPS and the HTTP-to-HTTPS redirect:

~~~bash
sudo certbot --nginx --redirect -d scc.example.com
~~~

Follow the prompts. Certbot will add the certificate configuration to Nginx. The dashboard is still not proxied by the sample HTTP server above; you will add the authenticated HTTPS proxy in the next step.

Test automatic renewal:

~~~bash
sudo certbot renew --dry-run
~~~

### Step 4 — Add password protection and the HTTPS reverse proxy

SCC does not have its own login page. Add authentication at Nginx **before** forwarding requests to SCC.

Install the password-file utility:

~~~bash
sudo apt install -y apache2-utils
~~~

Create a user and password. The command prompts for the password:

~~~bash
sudo htpasswd -cB /etc/nginx/.htpasswd-scc sccadmin
~~~

Use -c only when creating the file for the first time. To add another user later, run htpasswd without -c.

On Ubuntu, Nginx normally runs as www-data. Set permissions so Nginx can read the password file:

~~~bash
sudo chown root:www-data /etc/nginx/.htpasswd-scc
sudo chmod 640 /etc/nginx/.htpasswd-scc
~~~

Open the Nginx configuration for scc.example.com. Certbot has created an HTTPS server block that listens on port 443. Inside that HTTPS server block, create or replace its location / block with the following:

~~~nginx
location / {
    auth_basic "Server Control Center";
    auth_basic_user_file /etc/nginx/.htpasswd-scc;

    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Do not pass the reverse-proxy login credentials to the SCC application.
    proxy_set_header Authorization "";

    proxy_connect_timeout 5s;
    proxy_read_timeout 60s;
}
~~~

Keep the certificate directives and HTTP-to-HTTPS redirect that Certbot generated. Do not replace the whole Certbot configuration with this location block. The port-80 server should continue to redirect normal requests to HTTPS; Certbot will handle its ACME validation path during renewal.

Test and reload Nginx:

~~~bash
sudo nginx -t
sudo systemctl reload nginx
~~~

### Step 5 — Tell SCC it is behind a trusted proxy

Edit the application environment file:

~~~bash
sudo nano /opt/server-control-center/.env
~~~

Set:

~~~ini
TRUST_PROXY=1
~~~

Leave SCC_VERSION, METRICS_PROVIDER and GEMINI_API_KEY unchanged.

Recreate only the SCC application container so the new environment variable takes effect:

~~~bash
sudo docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml up -d --no-deps --force-recreate server-control-center
~~~

TRUST_PROXY=1 is appropriate when one trusted reverse proxy is the only route to the app. Do not enable it if users can bypass the proxy and connect directly to the application.

### Step 6 — Verify Nginx access

Open https://scc.example.com. The browser should ask for the username and password. An unauthenticated request should return HTTP 401, not the dashboard.

On the VPS, the internal health endpoint should still work:

~~~bash
curl -fsS http://127.0.0.1:3000/api/health
~~~

## 7. Option C — Caddy reverse proxy with automatic HTTPS

Caddy is often simpler for a new setup because it obtains and renews public TLS certificates automatically when the domain and network are configured correctly.

Use Caddy if it will own ports 80 and 443. Do not leave another web server listening on those same public ports.

### Step 1 — Install Caddy from its official Ubuntu repository

~~~bash
sudo apt install --yes debian-keyring debian-archive-keyring apt-transport-https curl gnupg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
~~~

The official package installs Caddy as a systemd service and starts it automatically.

If Nginx is already listening on ports 80 and 443, do not install Caddy expecting both services to bind those same ports. Choose one public reverse proxy or plan a more advanced multi-proxy setup.

### Step 2 — Generate a password hash

Run:

~~~bash
sudo caddy hash-password --algorithm argon2id
~~~

Caddy prompts for the password without echoing it when attached to a terminal. Copy the resulting hash. Do not put the plain-text password into the Caddyfile.

### Step 3 — Configure the Caddyfile

Open:

~~~bash
sudo nano /etc/caddy/Caddyfile
~~~

Add this site block. Replace the domain and the example hash with your own domain and the hash generated in the previous step:

~~~caddyfile
scc.example.com {
    basic_auth argon2id {
        sccadmin REPLACE_WITH_THE_GENERATED_HASH
    }

    reverse_proxy 127.0.0.1:3000 {
        header_up -Authorization
    }
}
~~~

Caddy automatically obtains and renews a publicly trusted certificate for a public DNS name. It also redirects HTTP to HTTPS. For this to work, the DNS record must point to your VPS and TCP ports 80 and 443 must be reachable from the internet.

Caddy automatically forwards the original Host and standard X-Forwarded headers. Its default handling ignores untrusted incoming X-Forwarded values unless trusted proxies are configured.

### Step 4 — Validate and reload Caddy

~~~bash
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy
~~~

If reload fails, inspect the service log:

~~~bash
sudo journalctl -u caddy -n 100 --no-pager
~~~

### Step 5 — Set the trusted-proxy option in SCC

Edit:

~~~bash
sudo nano /opt/server-control-center/.env
~~~

Set:

~~~ini
TRUST_PROXY=1
~~~

Recreate only the SCC container:

~~~bash
sudo docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml up -d --no-deps --force-recreate server-control-center
~~~

Caddy is now the public entry point. SCC remains on 127.0.0.1:3000.

### Step 6 — Verify Caddy access

Open https://scc.example.com. The browser should establish HTTPS and ask for the configured username and password.

Check Caddy and the local app:

~~~bash
sudo systemctl status caddy
curl -fsS http://127.0.0.1:3000/api/health
~~~

### What if the domain is not public?

Caddy can serve local names such as localhost using its own local certificate authority. This is different from a public Let's Encrypt certificate: remote devices will not automatically trust a local CA unless you install its root certificate on those devices.

For remote access over the internet, use a real DNS name and a publicly trusted certificate.

## 8. Other reverse proxies and URL paths

You can use another reverse proxy such as Traefik, HAProxy or an identity-aware gateway if it forwards the complete website to http://127.0.0.1:3000 and enforces authentication.

Use a dedicated hostname such as scc.example.com. Do not assume a sub-path such as example.com/scc/ will work: the current frontend is built for the root URL and no sub-path base is configured.

For any reverse proxy:

- Keep the Docker host binding at 127.0.0.1:3000.
- Do not expose ports 3000 or 8099 publicly.
- Require authentication before forwarding requests.
- Forward the original Host, client address and protocol headers.
- Set TRUST_PROXY=1 only when the application is reachable exclusively through the intended trusted proxy.

## 9. Troubleshooting

| Symptom | Likely cause or check |
|---|---|
| http://127.0.0.1:3000 works on the VPS but not on your laptop | Expected without an SSH tunnel or reverse proxy. Your laptop's localhost is not the VPS |
| Domain does not open | Check DNS A/AAAA records, provider firewall, UFW and whether the proxy listens on ports 80/443 |
| Caddy cannot get a certificate | Check public DNS and TCP 80/443 reachability; read journalctl -u caddy |
| Certbot validation fails | Ensure the domain resolves to this server and port 80 is reachable during validation |
| Nginx returns 502 Bad Gateway | Check the SCC container status and curl http://127.0.0.1:3000/api/health on the VPS |
| Browser repeatedly asks for credentials | Expected with Basic Auth. Check the username/password file and proxy logs |
| Dashboard loads but metrics do not | Check systemctl status scc-agent and docker logs server-control-center |
| Nginx metrics are unavailable | Check local 127.0.0.1:8099/nginx_status; do not open port 8099 publicly |

Useful SCC commands:

~~~bash
sudo docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml ps
sudo docker compose --project-directory /opt/server-control-center -f /opt/server-control-center/docker-compose.yml logs --tail 100
sudo systemctl status scc-agent.service
curl -fsS http://127.0.0.1:3000/api/health
~~~

## 10. Data handling and AI privacy

The host-agent reads system metrics, Docker information, services and selected logs. It also queries api.ipify.org to determine the public IPv4 address (cached for five minutes) and sends ICMP probes to 1.1.1.1 for latency and packet-loss measurements.

Without a Gemini API key, the AI assistant uses a local diagnostic fallback. If GEMINI_API_KEY is configured and a user asks the AI assistant a question, the question, selected metrics and part of recent logs are sent to Google Gemini.

Logs can contain IP addresses, hostnames, URLs, request paths, service/container names and identifiers. Redaction masks only selected query-string secrets. It cannot guarantee that every password, token or personal detail is removed. Review data handling before enabling AI.

## 11. Uninstall

~~~bash
sudo bash /opt/server-control-center/deploy/uninstall.sh
~~~

The uninstaller requires the exact phrase REMOVE SERVER CONTROL CENTER and creates a protected backup under /var/backups/server-control-center. It removes SCC's container, files and host-agent. Docker Engine and images remain intact; unrelated containers are not stopped.

Nginx/Caddy and their website configurations are not removed by the SCC uninstaller. Remove the SCC virtual host from your reverse proxy manually only if you no longer need it.

## Official documentation

- [Caddy installation](https://caddyserver.com/docs/install)
- [Caddy automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [Caddy Basic Authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
- [Nginx proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [Certbot Nginx instructions](https://certbot.eff.org/instructions?os=snap&ws=nginx)
- [Ubuntu firewall documentation](https://ubuntu.com/server/docs/firewalls/)
