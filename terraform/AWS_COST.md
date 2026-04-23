# AWS Cost Estimate

Date: 2026-04-14

This estimate is for the currently deployed minimal Terraform setup:

- Region: `us-west-2` / US West (Oregon)
- EC2 instance: `t3.large`
- Root EBS volume: `30 GiB gp3`
- Public IPv4 / Elastic IP: `1`
- App URL: `http://44.228.87.35`

## Estimated Cost

| Item | Unit price | Hour | Day | Month |
| --- | ---: | ---: | ---: | ---: |
| EC2 `t3.large` Linux on-demand | `$0.0832/hour` | `$0.0832` | `$1.9968` | `$60.74` |
| EBS `gp3` root volume, `30 GiB` | `$0.08/GB-month` | `$0.0033` | `$0.0789` | `$2.40` |
| Public IPv4 / Elastic IP, in use | `$0.005/hour` | `$0.0050` | `$0.1200` | `$3.65` |
| **Total estimate** |  | **`$0.0915`** | **`$2.20`** | **`$66.79`** |

Monthly math uses `730` hours, which is the standard AWS pricing calculator convention.

## Simple Runtime Examples

| Runtime | Estimated total |
| --- | ---: |
| 1 hour | `$0.09` |
| 8 hours | `$0.73` |
| 12 hours | `$1.10` |
| 24 hours / 1 day | `$2.20` |
| 7 days | `$15.37` |
| 30 days | `$65.87` |
| 1 AWS pricing month / 730 hours | `$66.79` |

## What Is Not Included

This does not include:

- Internet data transfer out.
- AWS taxes or VAT.
- CloudWatch log ingestion or custom monitoring.
- Snapshots, backups, extra EBS volumes, or AMIs.
- Route 53, DNS, load balancers, HTTPS certificates, NAT gateways, or other services.

## Cost Notes

- The original cheapest target was `t3.micro`, but the Docker build did not complete reliably on the smaller instance sizes. The live deployment uses `t3.large` so the build can finish.
- The Elastic IP/public IPv4 is charged while in use. If the instance is stopped, the EBS volume and public IPv4 can still continue costing money.
- To stop most compute cost, stop or destroy the EC2 instance. To stop all costs from this Terraform stack, run `./terraform/tf destroy` from the repo root after confirming the app is no longer needed.

## Pricing Sources

Prices were checked against the AWS public price list API for `us-west-2` on 2026-04-14:

- Amazon EC2: `t3.large` Linux on-demand, `$0.0832/hour`
- Amazon EBS: `gp3` provisioned storage, `$0.08/GB-month`
- Amazon VPC: in-use public IPv4 address, `$0.005/hour`
