variable "region" {
  description = "AWS region for all resources. The tf wrapper defaults this from BEDROCK_AWS_DEFAULT_REGION."
  type        = string
  default     = "eu-central-1"
}

variable "repo_url" {
  description = "HTTPS Git repository URL to clone on the EC2 instance."
  type        = string
}

variable "public_key_path" {
  description = "Path to the local public SSH key to import as an AWS EC2 key pair."
  type        = string
  default     = "./id_newchatlaw.pub"
}

variable "instance_type" {
  description = "EC2 instance type."
  type        = string
  default     = "t3.micro"
}

variable "root_volume_size_gb" {
  description = "Root EBS volume size in GiB. Docker image pulls/builds need more than the Amazon Linux default 8 GiB."
  type        = number
  default     = 30
}

variable "swap_size_gb" {
  description = "Local swap file size in GiB to help Docker builds complete on small EC2 instances."
  type        = number
  default     = 4
}

variable "name_prefix" {
  description = "Name prefix for created AWS resources."
  type        = string
  default     = "newchatlaw"
}

variable "allowed_ssh_cidr_blocks" {
  description = "CIDR blocks allowed to SSH to the instance. Default is intentionally open for this minimal dev setup."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}
