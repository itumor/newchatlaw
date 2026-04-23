# Serve LibreChat On Port 80 Only

## Summary
LibreChat is served directly on standard HTTP port `80` so users can open:

```text
http://44.228.87.35/c/new
```

The custom public port `3880` is intentionally removed from the deployment because the target firewall does not allow custom ports and opening it is considered a security risk.

## Changes
- `docker-compose.yml` maps host port `80` to LibreChat container port `3080`.
- Terraform no longer opens TCP `3880` in the EC2 security group.
- Terraform outputs the app URL without a custom port.
- Deployment docs and example local URLs now point to `http://localhost` or `http://<elastic-ip>`.

## Validation
- Run `docker compose config`.
- Run `./terraform/tf fmt -check`.
- Run `./terraform/tf validate`.
- Run `./terraform/tf plan` and confirm TCP `3880` ingress is removed.
- After deployment, confirm `http://44.228.87.35/c/new` loads and `http://44.228.87.35:3880/c/new` does not.

## Risk
This remains public HTTP only. Browser secure-context features such as WebCrypto may still fail on this origin.
