#!/usr/bin/env python3
"""
Agent Manager CLI - Command-line interface for managing AI agents
Provides comprehensive control over the multi-agent system
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

import click
import rich
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.live import Live
from rich.layout import Layout
from rich.text import Text

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

try:
    from services.master_orchestrator import get_orchestrator, MasterOrchestrator
    from services.semantic_cache import get_semantic_cache
    from services.agents.business_intelligence_agent import get_business_intelligence_agent
    SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Some services not available: {e}")
    SERVICES_AVAILABLE = False

# Initialize rich console
console = Console()

class AgentManagerCLI:
    """Command-line interface for agent management"""
    
    def __init__(self):
        self.orchestrator = get_orchestrator() if SERVICES_AVAILABLE else None
        self.cache = get_semantic_cache() if SERVICES_AVAILABLE else None
        self.agents = {}
        
        # Load available agents
        if SERVICES_AVAILABLE:
            self.agents['business_intelligence'] = get_business_intelligence_agent()
    
    async def status_all(self) -> Dict[str, Any]:
        """Get status of all agents and services"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "services_available": SERVICES_AVAILABLE,
            "orchestrator": None,
            "agents": {},
            "cache": None
        }
        
        if not SERVICES_AVAILABLE:
            return status
        
        try:
            # Orchestrator status
            if self.orchestrator:
                status["orchestrator"] = self.orchestrator.get_agent_status()
            
            # Individual agent status
            for agent_name, agent in self.agents.items():
                status["agents"][agent_name] = agent.get_status()
            
            # Cache status
            if self.cache:
                status["cache"] = await self.cache.get_stats()
        
        except Exception as e:
            status["error"] = str(e)
        
        return status
    
    async def health_check_all(self) -> Dict[str, Any]:
        """Perform health check on all services"""
        health = {
            "timestamp": datetime.now().isoformat(),
            "overall_healthy": False,
            "services": {}
        }
        
        if not SERVICES_AVAILABLE:
            health["services"]["error"] = "Services not available"
            return health
        
        try:
            # Check individual agents
            for agent_name, agent in self.agents.items():
                health["services"][agent_name] = await agent.health_check()
            
            # Check cache
            if self.cache:
                health["services"]["cache"] = await self.cache.health_check()
            
            # Overall health
            agent_health = [
                service.get("healthy", False) 
                for service in health["services"].values() 
                if isinstance(service, dict)
            ]
            health["overall_healthy"] = all(agent_health) if agent_health else False
            
        except Exception as e:
            health["services"]["error"] = str(e)
        
        return health
    
    async def test_agent(self, agent_name: str, test_message: str = None) -> Dict[str, Any]:
        """Test a specific agent"""
        if not SERVICES_AVAILABLE:
            return {"error": "Services not available"}
        
        if agent_name not in self.agents:
            return {"error": f"Agent '{agent_name}' not found"}
        
        agent = self.agents[agent_name]
        test_message = test_message or f"Test message for {agent_name} at {datetime.now()}"
        
        try:
            result = await agent.execute(test_message)
            return {
                "success": result.success,
                "response": str(result.result)[:200] + "..." if len(str(result.result)) > 200 else str(result.result),
                "execution_time": result.execution_time,
                "confidence": result.confidence,
                "tokens_used": result.tokens_used
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def clear_cache(self, pattern: str = "*") -> Dict[str, Any]:
        """Clear cache entries"""
        if not SERVICES_AVAILABLE or not self.cache:
            return {"error": "Cache service not available"}
        
        try:
            if pattern == "*":
                # Clear expired entries
                cleared = await self.cache.clear_expired()
                return {"success": True, "cleared_count": cleared}
            else:
                # Clear specific pattern
                cleared = await self.cache.invalidate_pattern(pattern)
                return {"success": True, "cleared_count": cleared}
        except Exception as e:
            return {"error": str(e)}

# CLI Commands
@click.group()
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def cli(verbose):
    """AI Agent Management CLI"""
    if verbose:
        console.print("[dim]Verbose mode enabled[/dim]")

@cli.command()
def status():
    """Show status of all agents and services"""
    
    async def _status():
        manager = AgentManagerCLI()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(description="Checking agent status...", total=None)
            
            status_data = await manager.status_all()
            progress.update(task, completed=100)
        
        # Create status display
        layout = Layout()
        
        # Services status
        services_table = Table(title="🤖 AI Agent System Status")
        services_table.add_column("Component", style="cyan")
        services_table.add_column("Status", justify="center")
        services_table.add_column("Details")
        
        # Overall status
        overall_status = "✅ Online" if status_data.get("services_available") else "❌ Offline"
        services_table.add_row("System", overall_status, status_data.get("timestamp", ""))
        
        # Orchestrator
        orch_data = status_data.get("orchestrator", {})
        if orch_data:
            orch_status = "✅ Active" if orch_data.get("status") == "active" else "⚠️ Inactive"
            orch_details = f"Version: {orch_data.get('version', 'N/A')}"
            services_table.add_row("Orchestrator", orch_status, orch_details)
        
        # Individual agents
        agents_data = status_data.get("agents", {})
        for agent_name, agent_info in agents_data.items():
            agent_status = {
                "idle": "✅ Ready",
                "processing": "🔄 Processing",
                "error": "❌ Error",
                "offline": "⚠️ Offline"
            }.get(agent_info.get("status", ""), "❓ Unknown")
            
            details = f"Tasks: {agent_info.get('task_count', 0)} | Errors: {agent_info.get('error_count', 0)}"
            services_table.add_row(agent_name.replace('_', ' ').title(), agent_status, details)
        
        # Cache status
        cache_data = status_data.get("cache", {})
        if cache_data:
            cache_status = "✅ Connected" if cache_data.get("cache_size", 0) >= 0 else "❌ Disconnected"
            cache_details = f"Entries: {cache_data.get('cache_size', 0)} | Hit Rate: {cache_data.get('hit_rate', 0):.1%}"
            services_table.add_row("Semantic Cache", cache_status, cache_details)
        
        console.print(services_table)
        
        # Show error if any
        if "error" in status_data:
            console.print(Panel(f"[red]Error: {status_data['error']}[/red]", title="System Error"))
    
    asyncio.run(_status())

@cli.command()
def health():
    """Perform comprehensive health check"""
    
    async def _health():
        manager = AgentManagerCLI()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(description="Running health checks...", total=None)
            
            health_data = await manager.health_check_all()
            progress.update(task, completed=100)
        
        # Overall health status
        overall_healthy = health_data.get("overall_healthy", False)
        health_color = "green" if overall_healthy else "red"
        health_emoji = "✅" if overall_healthy else "❌"
        
        console.print(Panel(
            f"[{health_color}]{health_emoji} System Health: {'Healthy' if overall_healthy else 'Unhealthy'}[/{health_color}]",
            title="Health Check Results"
        ))
        
        # Detailed health table
        health_table = Table(title="Component Health Details")
        health_table.add_column("Service", style="cyan")
        health_table.add_column("Status", justify="center")
        health_table.add_column("Details")
        
        services = health_data.get("services", {})
        for service_name, service_health in services.items():
            if isinstance(service_health, dict):
                is_healthy = service_health.get("healthy", False)
                status_emoji = "✅" if is_healthy else "❌"
                status_text = "Healthy" if is_healthy else "Unhealthy"
                
                # Extract relevant details
                details = []
                if "checks" in service_health:
                    checks = service_health["checks"]
                    details.append(f"Checks: {sum(1 for v in checks.values() if v is True)}/{len(checks)}")
                
                if "last_activity" in service_health:
                    details.append(f"Last: {service_health['last_activity'][:19]}")
                
                health_table.add_row(
                    service_name.replace('_', ' ').title(),
                    f"{status_emoji} {status_text}",
                    " | ".join(details)
                )
            else:
                health_table.add_row(
                    service_name.replace('_', ' ').title(),
                    "❓ Unknown",
                    str(service_health)
                )
        
        console.print(health_table)
    
    asyncio.run(_health())

@cli.command()
@click.argument('agent_name')
@click.option('--message', '-m', help='Test message to send to agent')
def test(agent_name, message):
    """Test a specific agent"""
    
    async def _test():
        manager = AgentManagerCLI()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(description=f"Testing {agent_name} agent...", total=None)
            
            result = await manager.test_agent(agent_name, message)
            progress.update(task, completed=100)
        
        if "error" in result:
            console.print(Panel(f"[red]Test failed: {result['error']}[/red]", title="Agent Test"))
        else:
            # Create test results panel
            if result.get("success"):
                status_color = "green"
                status_text = "✅ Success"
            else:
                status_color = "red"
                status_text = "❌ Failed"
            
            test_info = [
                f"[bold]{status_text}[/bold]",
                f"Execution Time: {result.get('execution_time', 0):.3f}s",
                f"Confidence: {result.get('confidence', 0):.1%}",
                f"Tokens Used: {result.get('tokens_used', 0)}",
                "",
                f"Response: {result.get('response', 'No response')}"
            ]
            
            console.print(Panel(
                "\n".join(test_info),
                title=f"Test Results: {agent_name}",
                border_style=status_color
            ))
    
    asyncio.run(_test())

@cli.command()
@click.argument('message')
@click.option('--session', '-s', default='cli_session', help='Session ID for conversation')
@click.option('--user', '-u', help='User ID')
@click.option('--shop', help='Barbershop ID')
def chat(message, session, user, shop):
    """Chat with the AI agent system"""
    
    async def _chat():
        if not SERVICES_AVAILABLE:
            console.print("[red]Services not available[/red]")
            return
        
        orchestrator = get_orchestrator()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(description="Processing request...", total=None)
            
            result = await orchestrator.process_request(
                message=message,
                session_id=session,
                user_id=user,
                barbershop_id=shop
            )
            progress.update(task, completed=100)
        
        if result.get("success"):
            console.print(Panel(
                result["response"],
                title=f"AI Response (Session: {session})",
                border_style="blue"
            ))
            
            # Show metadata
            metadata = result.get("metadata", {})
            if metadata:
                meta_text = []
                for key, value in metadata.items():
                    meta_text.append(f"{key}: {value}")
                
                console.print(f"[dim]Metadata: {' | '.join(meta_text)}[/dim]")
        else:
            console.print(Panel(
                f"[red]Error: {result.get('error', 'Unknown error')}[/red]",
                title="Chat Error"
            ))
    
    asyncio.run(_chat())

@cli.command()
@click.option('--pattern', '-p', default='*', help='Cache pattern to clear (* for expired only)')
def clear_cache(pattern):
    """Clear semantic cache entries"""
    
    async def _clear():
        manager = AgentManagerCLI()
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
        ) as progress:
            task = progress.add_task(description="Clearing cache...", total=None)
            
            result = await manager.clear_cache(pattern)
            progress.update(task, completed=100)
        
        if "error" in result:
            console.print(f"[red]Cache clear failed: {result['error']}[/red]")
        else:
            cleared_count = result.get("cleared_count", 0)
            console.print(f"[green]✅ Cleared {cleared_count} cache entries[/green]")
    
    asyncio.run(_clear())

@cli.command()
def interactive():
    """Start interactive chat mode"""
    
    async def _interactive():
        if not SERVICES_AVAILABLE:
            console.print("[red]Services not available[/red]")
            return
        
        orchestrator = get_orchestrator()
        session_id = f"interactive_{int(time.time())}"
        
        console.print(Panel(
            f"🤖 Welcome to 6FB AI Agent System Interactive Mode\nSession ID: {session_id}\nType 'quit' or 'exit' to end session",
            title="Interactive Mode",
            border_style="green"
        ))
        
        while True:
            try:
                message = console.input("\n[bold cyan]You:[/bold cyan] ")
                
                if message.lower() in ['quit', 'exit', 'q']:
                    console.print("[yellow]Goodbye![/yellow]")
                    break
                
                if not message.strip():
                    continue
                
                with Progress(
                    SpinnerColumn(),
                    TextColumn("🤖 AI is thinking..."),
                    console=console,
                ) as progress:
                    task = progress.add_task(description="", total=None)
                    
                    result = await orchestrator.process_request(
                        message=message,
                        session_id=session_id
                    )
                    progress.update(task, completed=100)
                
                if result.get("success"):
                    console.print(f"\n[bold green]AI:[/bold green] {result['response']}")
                    
                    # Show quick metadata
                    metadata = result.get("metadata", {})
                    if metadata.get("agent_count"):
                        console.print(f"[dim]({metadata['agent_count']} agents responded)[/dim]")
                else:
                    console.print(f"\n[red]Error: {result.get('error', 'Unknown error')}[/red]")
                    
            except KeyboardInterrupt:
                console.print("\n[yellow]Session interrupted. Goodbye![/yellow]")
                break
            except Exception as e:
                console.print(f"\n[red]Unexpected error: {e}[/red]")
    
    asyncio.run(_interactive())

@cli.command()
def benchmark():
    """Run performance benchmarks"""
    
    async def _benchmark():
        if not SERVICES_AVAILABLE:
            console.print("[red]Services not available[/red]")
            return
        
        console.print(Panel("🏃‍♂️ Running Performance Benchmarks", title="Benchmark", border_style="yellow"))
        
        manager = AgentManagerCLI()
        benchmarks = []
        
        # Test messages for different agent types
        test_cases = [
            ("business_intelligence", "Analyze my revenue trends for this month"),
            ("business_intelligence", "What are my top performing services?"),
            ("business_intelligence", "Show me customer retention metrics"),
        ]
        
        for agent_name, message in test_cases:
            console.print(f"\n[cyan]Testing {agent_name} with: '{message[:50]}...'[/cyan]")
            
            start_time = time.time()
            result = await manager.test_agent(agent_name, message)
            end_time = time.time()
            
            benchmark = {
                "agent": agent_name,
                "message": message,
                "success": result.get("success", False),
                "response_time": end_time - start_time,
                "execution_time": result.get("execution_time", 0),
                "tokens": result.get("tokens_used", 0),
                "confidence": result.get("confidence", 0)
            }
            benchmarks.append(benchmark)
            
            # Show result
            status = "✅" if benchmark["success"] else "❌"
            console.print(f"  {status} Response time: {benchmark['response_time']:.3f}s | Tokens: {benchmark['tokens']}")
        
        # Summary table
        summary_table = Table(title="Benchmark Results Summary")
        summary_table.add_column("Agent")
        summary_table.add_column("Avg Response Time")
        summary_table.add_column("Success Rate")
        summary_table.add_column("Avg Tokens")
        
        # Group by agent
        agent_results = {}
        for b in benchmarks:
            agent = b["agent"]
            if agent not in agent_results:
                agent_results[agent] = []
            agent_results[agent].append(b)
        
        for agent, results in agent_results.items():
            avg_time = sum(r["response_time"] for r in results) / len(results)
            success_rate = sum(1 for r in results if r["success"]) / len(results)
            avg_tokens = sum(r["tokens"] for r in results) / len(results)
            
            summary_table.add_row(
                agent.replace('_', ' ').title(),
                f"{avg_time:.3f}s",
                f"{success_rate:.1%}",
                f"{avg_tokens:.0f}"
            )
        
        console.print(summary_table)
    
    asyncio.run(_benchmark())

if __name__ == '__main__':
    cli()