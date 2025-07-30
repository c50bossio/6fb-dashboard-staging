# 6FB AI Agent System - AWS Infrastructure
# Terraform configuration for production-grade infrastructure

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
  
  backend "s3" {
    bucket         = "sixfb-ai-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "sixfb-ai-terraform-lock"
    
    # Versioning and lifecycle management
    versioning = true
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "6FB-AI-Agent-System"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "DevOps-Team"
      CostCenter  = "Engineering"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Random password for database
resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Random password for Redis
resource "random_password" "redis_password" {
  length  = 32
  special = false
}

# Local values
locals {
  name_prefix = "${var.project_name}-${var.environment}"
  
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "Terraform"
    Owner       = "DevOps-Team"
  }
  
  # Network configuration
  vpc_cidr = var.vpc_cidr
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  # Subnet configurations
  private_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 1),  # 10.0.1.0/24
    cidrsubnet(local.vpc_cidr, 8, 2),  # 10.0.2.0/24
    cidrsubnet(local.vpc_cidr, 8, 3),  # 10.0.3.0/24
  ]
  
  public_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 101), # 10.0.101.0/24
    cidrsubnet(local.vpc_cidr, 8, 102), # 10.0.102.0/24
    cidrsubnet(local.vpc_cidr, 8, 103), # 10.0.103.0/24
  ]
  
  database_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 201), # 10.0.201.0/24
    cidrsubnet(local.vpc_cidr, 8, 202), # 10.0.202.0/24
    cidrsubnet(local.vpc_cidr, 8, 203), # 10.0.203.0/24
  ]
  
  elasticache_subnets = [
    cidrsubnet(local.vpc_cidr, 8, 211), # 10.0.211.0/24
    cidrsubnet(local.vpc_cidr, 8, 212), # 10.0.212.0/24
    cidrsubnet(local.vpc_cidr, 8, 213), # 10.0.213.0/24
  ]
}