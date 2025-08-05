# ECS Module Outputs

output "cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "cluster_arn" {
  description = "ECS cluster ARN"
  value       = aws_ecs_cluster.main.arn
}

output "frontend_service_name" {
  description = "Frontend service name"
  value       = aws_ecs_service.frontend.name
}

output "backend_service_name" {
  description = "Backend service name"
  value       = aws_ecs_service.backend.name
}

output "frontend_service_arn" {
  description = "Frontend service ARN"
  value       = aws_ecs_service.frontend.id
}

output "backend_service_arn" {
  description = "Backend service ARN"
  value       = aws_ecs_service.backend.id
}

output "log_group_name" {
  description = "CloudWatch log group name"
  value       = aws_cloudwatch_log_group.ecs.name
}

output "task_execution_role_arn" {
  description = "Task execution role ARN"
  value       = aws_iam_role.ecs_task_execution.arn
}

output "task_role_arn" {
  description = "Task role ARN"
  value       = aws_iam_role.ecs_task.arn
}