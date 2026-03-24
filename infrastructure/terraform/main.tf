# =============================================================
# Bazzar — Terraform Infrastructure (AWS)
# Provisions:
#   - VPC with public/private subnets
#   - EKS cluster (3 nodes, t3.medium)
#   - DocumentDB (MongoDB-compatible)
#   - ElastiCache Redis
#   - MSK Kafka
#   - ECR repositories for all 14 services
# =============================================================

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  # Remote state — S3 backend
  # Uncomment and fill in before first apply:
  # backend "s3" {
  #   bucket         = "bazzar-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-south-1"
  #   encrypt        = true
  #   dynamodb_table = "bazzar-terraform-lock"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "Bazzar"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# =============================================================
# Variables
# =============================================================

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "bazzar-eks-cluster"
}

variable "node_instance_type" {
  description = "EC2 instance type for EKS worker nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_desired_count" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 3
}

variable "node_min_count" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 2
}

variable "node_max_count" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 6
}

variable "docdb_username" {
  description = "DocumentDB master username"
  type        = string
  default     = "bazzar_admin"
  sensitive   = true
}

variable "docdb_password" {
  description = "DocumentDB master password"
  type        = string
  sensitive   = true
}

# =============================================================
# Data Sources
# =============================================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# =============================================================
# VPC
# =============================================================

resource "aws_vpc" "bazzar_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "bazzar-vpc"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }
}

# --- Public Subnets (one per AZ, for load balancers) ---------

resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.bazzar_vpc.id
  cidr_block              = "10.0.${count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "bazzar-public-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
    "kubernetes.io/role/elb"                    = "1"
  }
}

# --- Private Subnets (for EKS nodes, RDS, Kafka, Redis) ------

resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.bazzar_vpc.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "bazzar-private-${count.index + 1}"
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
    "kubernetes.io/role/internal-elb"           = "1"
  }
}

# --- Internet Gateway ----------------------------------------

resource "aws_internet_gateway" "igw" {
  vpc_id = aws_vpc.bazzar_vpc.id

  tags = {
    Name = "bazzar-igw"
  }
}

# --- Elastic IPs for NAT Gateways ----------------------------

resource "aws_eip" "nat" {
  count  = 3
  domain = "vpc"

  tags = {
    Name = "bazzar-nat-eip-${count.index + 1}"
  }
}

# --- NAT Gateways (one per AZ for HA) ------------------------

resource "aws_nat_gateway" "nat" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "bazzar-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.igw]
}

# --- Route Tables --------------------------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.bazzar_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw.id
  }

  tags = {
    Name = "bazzar-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count          = 3
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count  = 3
  vpc_id = aws_vpc.bazzar_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.nat[count.index].id
  }

  tags = {
    Name = "bazzar-private-rt-${count.index + 1}"
  }
}

resource "aws_route_table_association" "private" {
  count          = 3
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# =============================================================
# Security Groups
# =============================================================

resource "aws_security_group" "eks_cluster" {
  name        = "bazzar-eks-cluster-sg"
  description = "EKS cluster control plane security group"
  vpc_id      = aws_vpc.bazzar_vpc.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bazzar-eks-cluster-sg"
  }
}

resource "aws_security_group" "eks_nodes" {
  name        = "bazzar-eks-nodes-sg"
  description = "EKS worker node security group"
  vpc_id      = aws_vpc.bazzar_vpc.id

  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "-1"
    self      = true
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bazzar-eks-nodes-sg"
  }
}

resource "aws_security_group" "docdb" {
  name        = "bazzar-docdb-sg"
  description = "DocumentDB security group — allow traffic from EKS nodes only"
  vpc_id      = aws_vpc.bazzar_vpc.id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bazzar-docdb-sg"
  }
}

resource "aws_security_group" "redis" {
  name        = "bazzar-redis-sg"
  description = "ElastiCache Redis security group"
  vpc_id      = aws_vpc.bazzar_vpc.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bazzar-redis-sg"
  }
}

resource "aws_security_group" "kafka" {
  name        = "bazzar-kafka-sg"
  description = "MSK Kafka security group"
  vpc_id      = aws_vpc.bazzar_vpc.id

  ingress {
    from_port       = 9092
    to_port         = 9092
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  ingress {
    from_port       = 9094
    to_port         = 9094
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bazzar-kafka-sg"
  }
}

# =============================================================
# IAM Roles for EKS
# =============================================================

resource "aws_iam_role" "eks_cluster_role" {
  name = "bazzar-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "eks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

resource "aws_iam_role" "eks_node_role" {
  name = "bazzar-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role.name
}

resource "aws_iam_role_policy_attachment" "ecr_read_only" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role.name
}

# =============================================================
# EKS Cluster
# =============================================================

resource "aws_eks_cluster" "bazzar" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster_role.arn
  version  = "1.29"

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    security_group_ids      = [aws_security_group.eks_cluster.id]
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  enabled_cluster_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]
}

# --- EKS Managed Node Group ----------------------------------

resource "aws_eks_node_group" "bazzar_nodes" {
  cluster_name    = aws_eks_cluster.bazzar.name
  node_group_name = "bazzar-node-group"
  node_role_arn   = aws_iam_role.eks_node_role.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [var.node_instance_type]
  disk_size       = 50
  ami_type        = "AL2_x86_64"
  capacity_type   = "ON_DEMAND"

  scaling_config {
    desired_size = var.node_desired_count
    min_size     = var.node_min_count
    max_size     = var.node_max_count
  }

  update_config {
    max_unavailable = 1
  }

  labels = {
    role        = "worker"
    environment = var.environment
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.ecr_read_only,
  ]

  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }
}

# =============================================================
# ECR Repositories (one per service + web frontend)
# =============================================================

locals {
  services = [
    "user-service",
    "product-service",
    "cart-service",
    "order-service",
    "payment-service",
    "review-service",
    "seller-service",
    "notification-service",
    "search-service",
    "recommendation-service",
    "storefront-designer-service",
    "referral-service",
    "delivery-service",
    "analytics-service",
    "web-frontend",
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.services)
  name                 = "bazzar/${each.value}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Service = each.value
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 production images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["sha-"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      }
    ]
  })
}

# =============================================================
# DocumentDB (MongoDB-compatible)
# =============================================================

resource "aws_docdb_subnet_group" "bazzar" {
  name       = "bazzar-docdb-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "bazzar-docdb-subnet-group"
  }
}

resource "aws_docdb_cluster_parameter_group" "bazzar" {
  family      = "docdb5.0"
  name        = "bazzar-docdb-params"
  description = "Bazzar DocumentDB cluster parameter group"

  parameter {
    name  = "tls"
    value = "disabled"  # Set to "enabled" for production TLS
  }
}

resource "aws_docdb_cluster" "bazzar" {
  cluster_identifier              = "bazzar-docdb-cluster"
  engine                          = "docdb"
  engine_version                  = "5.0.0"
  master_username                 = var.docdb_username
  master_password                 = var.docdb_password
  db_subnet_group_name            = aws_docdb_subnet_group.bazzar.name
  vpc_security_group_ids          = [aws_security_group.docdb.id]
  db_cluster_parameter_group_name = aws_docdb_cluster_parameter_group.bazzar.name
  backup_retention_period         = 7
  preferred_backup_window         = "02:00-03:00"
  preferred_maintenance_window    = "sun:04:00-sun:05:00"
  skip_final_snapshot             = false
  final_snapshot_identifier       = "bazzar-docdb-final-snapshot"
  deletion_protection             = true
  storage_encrypted               = true

  tags = {
    Name = "bazzar-docdb-cluster"
  }
}

resource "aws_docdb_cluster_instance" "bazzar" {
  count              = 2
  identifier         = "bazzar-docdb-${count.index + 1}"
  cluster_identifier = aws_docdb_cluster.bazzar.id
  instance_class     = "db.r6g.large"

  tags = {
    Name = "bazzar-docdb-instance-${count.index + 1}"
  }
}

# =============================================================
# ElastiCache Redis
# =============================================================

resource "aws_elasticache_subnet_group" "bazzar" {
  name       = "bazzar-redis-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "bazzar-redis-subnet-group"
  }
}

resource "aws_elasticache_parameter_group" "bazzar" {
  family = "redis7"
  name   = "bazzar-redis-params"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"  # Expired key events (useful for cart TTL)
  }
}

resource "aws_elasticache_replication_group" "bazzar" {
  replication_group_id       = "bazzar-redis"
  description                = "Bazzar Redis cluster for cart, sessions and caching"
  node_type                  = "cache.t3.medium"
  num_cache_clusters         = 2
  parameter_group_name       = aws_elasticache_parameter_group.bazzar.name
  subnet_group_name          = aws_elasticache_subnet_group.bazzar.name
  security_group_ids         = [aws_security_group.redis.id]
  engine_version             = "7.1"
  port                       = 6379
  automatic_failover_enabled = true
  multi_az_enabled           = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false  # Set true and update REDIS_URL to rediss:// for TLS

  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_window          = "03:00-04:00"
  snapshot_retention_limit = 3

  tags = {
    Name = "bazzar-redis"
  }
}

# =============================================================
# MSK Kafka
# =============================================================

resource "aws_msk_configuration" "bazzar" {
  name              = "bazzar-kafka-config"
  kafka_versions    = ["3.5.1"]
  description       = "Bazzar MSK Kafka configuration"

  server_properties = <<-PROPERTIES
    auto.create.topics.enable=true
    default.replication.factor=2
    min.insync.replicas=1
    num.partitions=3
    log.retention.hours=168
    log.retention.bytes=1073741824
    compression.type=snappy
  PROPERTIES
}

resource "aws_msk_cluster" "bazzar" {
  cluster_name           = "bazzar-kafka"
  kafka_version          = "3.5.1"
  number_of_broker_nodes = 3

  broker_node_group_info {
    instance_type   = "kafka.t3.small"
    client_subnets  = aws_subnet.private[*].id
    security_groups = [aws_security_group.kafka.id]

    storage_info {
      ebs_storage_info {
        volume_size = 100
      }
    }
  }

  configuration_info {
    arn      = aws_msk_configuration.bazzar.arn
    revision = aws_msk_configuration.bazzar.latest_revision
  }

  client_authentication {
    unauthenticated = true
    # For production, enable SASL/SCRAM or mTLS:
    # sasl {
    #   scram = true
    # }
  }

  encryption_info {
    encryption_in_transit {
      client_broker = "PLAINTEXT"
      in_cluster    = true
    }
  }

  open_monitoring {
    prometheus {
      jmx_exporter {
        enabled_in_broker = true
      }
      node_exporter {
        enabled_in_broker = true
      }
    }
  }

  logging_info {
    broker_logs {
      cloudwatch_logs {
        enabled   = true
        log_group = aws_cloudwatch_log_group.kafka.name
      }
    }
  }

  tags = {
    Name = "bazzar-kafka"
  }
}

resource "aws_cloudwatch_log_group" "kafka" {
  name              = "/bazzar/kafka"
  retention_in_days = 14
}

# =============================================================
# Outputs
# =============================================================

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.bazzar.name
}

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = aws_eks_cluster.bazzar.endpoint
}

output "eks_cluster_ca" {
  description = "EKS cluster certificate authority"
  value       = aws_eks_cluster.bazzar.certificate_authority[0].data
  sensitive   = true
}

output "docdb_endpoint" {
  description = "DocumentDB cluster endpoint"
  value       = aws_docdb_cluster.bazzar.endpoint
}

output "docdb_reader_endpoint" {
  description = "DocumentDB cluster reader endpoint"
  value       = aws_docdb_cluster.bazzar.reader_endpoint
}

output "redis_primary_endpoint" {
  description = "ElastiCache Redis primary endpoint"
  value       = aws_elasticache_replication_group.bazzar.primary_endpoint_address
}

output "redis_reader_endpoint" {
  description = "ElastiCache Redis reader endpoint"
  value       = aws_elasticache_replication_group.bazzar.reader_endpoint_address
}

output "kafka_bootstrap_brokers" {
  description = "MSK Kafka bootstrap broker string (plaintext)"
  value       = aws_msk_cluster.bazzar.bootstrap_brokers
}

output "ecr_repository_urls" {
  description = "Map of service name → ECR repository URL"
  value = {
    for name, repo in aws_ecr_repository.services : name => repo.repository_url
  }
}

output "vpc_id" {
  description = "Bazzar VPC ID"
  value       = aws_vpc.bazzar_vpc.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = aws_subnet.public[*].id
}
