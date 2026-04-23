# Minimal EC2 Terraform Deploy

This folder creates the cheapest simple AWS deployment shape for this repo:

- one EC2 instance
- one Elastic IP
- one security group exposing SSH, HTTP, and HTTPS
- Docker Compose bootstrap from user-data

The current `docker-compose.yml` publishes LibreChat on standard HTTP port `80`, so Terraform outputs:

```text
http://<elastic-ip>
```

Port `3880` is intentionally not exposed publicly because the deployment must work without custom firewall ports. Port `443` remains allowed by the security group, but no service listens on it unless HTTPS termination is added later.

## Credentials

Do not commit AWS credentials. Use the wrapper script from the repo root:

```bash
./terraform/tf init
./terraform/tf validate
./terraform/tf plan
```

The wrapper reads the root `.env` and maps:

- `BEDROCK_AWS_ACCESS_KEY_ID` to `AWS_ACCESS_KEY_ID`
- `BEDROCK_AWS_SECRET_ACCESS_KEY` to `AWS_SECRET_ACCESS_KEY`
- `BEDROCK_AWS_DEFAULT_REGION` to `AWS_DEFAULT_REGION` and `TF_VAR_region`

## Configure

Create an ignored local tfvars file:

```bash
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

Set at least:

```hcl
key_name = "your-keypair-name"
repo_url = "https://github.com/itumor/newchatlaw.git"
```

## Apply

```bash
./terraform/tf apply
./terraform/tf output url
```

## App `.env`

The repo root `.env` is not committed and will not be present after EC2 clones the repo. After provisioning, upload it manually and restart Compose:

```bash
scp .env ec2-user@<elastic-ip>:/tmp/newchatlaw.env
ssh ec2-user@<elastic-ip>
sudo mv /tmp/newchatlaw.env /opt/app/.env
cd /opt/app
sudo docker compose up -d --build
```

Do not put `.env` contents in Terraform variables, user-data, or state.

## Known Limitations

- SSH is open by default.
- No DNS or HTTPS termination is configured.
- Because the app is served over public HTTP only, browser secure-context features such as WebCrypto may still fail.
- No backups, monitoring, autoscaling, or IAM hardening is included.
- The HTTPS clone assumes this repo and its submodules are reachable from EC2. If the submodule remains SSH-only or private, bootstrap cloning will fail until a deploy key or token-based flow is added.
