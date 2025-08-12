#!/usr/bin/env python3
"""
Enhanced Visual Reporting Dashboard Generator
Creates comprehensive HTML reports with charts and analysis
"""

import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional
import base64
import statistics

class VisualReportGenerator:
    """Generates enhanced visual HTML reports for AI evaluations"""
    
    def __init__(self):
        self.report_data = {}
        self.chart_colors = {
            "primary": "#3498db",
            "success": "#27ae60",
            "warning": "#f39c12",
            "danger": "#e74c3c",
            "info": "#9b59b6"
        }
        
    def generate_comprehensive_report(self,
                                     bi_results: Optional[Dict] = None,
                                     agent_results: Optional[Dict] = None,
                                     crisis_results: Optional[Dict] = None,
                                     monitoring_results: Optional[Dict] = None) -> str:
        """Generate comprehensive visual report combining all evaluation results"""
        
        # Load results from files if not provided
        if not bi_results and os.path.exists('bi_evaluation_results_v2.json'):
            with open('bi_evaluation_results_v2.json', 'r') as f:
                bi_results = json.load(f)
                
        if not agent_results and os.path.exists('agent_evaluation_results.json'):
            with open('agent_evaluation_results.json', 'r') as f:
                agent_results = json.load(f)
                
        if not crisis_results and os.path.exists('crisis_evaluation_results.json'):
            with open('crisis_evaluation_results.json', 'r') as f:
                crisis_results = json.load(f)
                
        if not monitoring_results and os.path.exists('production_monitoring_results.json'):
            with open('production_monitoring_results.json', 'r') as f:
                monitoring_results = json.load(f)
        
        # Generate HTML report
        html = self._generate_html_header()
        html += self._generate_executive_summary(bi_results, agent_results, crisis_results, monitoring_results)
        html += self._generate_performance_charts(bi_results, agent_results)
        html += self._generate_advanced_metrics(bi_results)
        html += self._generate_crisis_analysis(crisis_results)
        html += self._generate_drift_monitoring(monitoring_results)
        html += self._generate_recommendations(bi_results, agent_results, crisis_results, monitoring_results)
        html += self._generate_cost_analysis(bi_results, monitoring_results)
        html += self._generate_html_footer()
        
        # Save report
        report_filename = f"ai_evaluation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.html"
        with open(report_filename, 'w') as f:
            f.write(html)
            
        print(f"📊 Visual report generated: {report_filename}")
        return report_filename
    
    def _generate_html_header(self) -> str:
        """Generate HTML header with styles and scripts"""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI System Evaluation Report - {datetime.now().strftime('%Y-%m-%d %H:%M')}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        .header h1 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        .header .subtitle {{
            font-size: 1.2em;
            opacity: 0.9;
        }}
        .nav {{
            background: #34495e;
            padding: 0;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
        }}
        .nav a {{
            color: white;
            padding: 15px 25px;
            text-decoration: none;
            transition: background 0.3s;
        }}
        .nav a:hover {{
            background: #2c3e50;
        }}
        .content {{
            padding: 40px;
        }}
        .section {{
            margin-bottom: 40px;
        }}
        .section h2 {{
            color: #2c3e50;
            font-size: 2em;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid {self.chart_colors['primary']};
        }}
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .metric-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            transition: transform 0.3s;
        }}
        .metric-card:hover {{
            transform: translateY(-5px);
        }}
        .metric-value {{
            font-size: 2.5em;
            font-weight: bold;
            margin: 10px 0;
        }}
        .metric-label {{
            font-size: 1.1em;
            opacity: 0.95;
        }}
        .success {{ background: linear-gradient(135deg, {self.chart_colors['success']} 0%, #229954 100%); }}
        .warning {{ background: linear-gradient(135deg, {self.chart_colors['warning']} 0%, #d68910 100%); }}
        .danger {{ background: linear-gradient(135deg, {self.chart_colors['danger']} 0%, #c0392b 100%); }}
        .info {{ background: linear-gradient(135deg, {self.chart_colors['info']} 0%, #8e44ad 100%); }}
        .chart-container {{
            position: relative;
            height: 400px;
            margin: 30px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
        }}
        .alert {{
            padding: 15px 20px;
            margin: 20px 0;
            border-radius: 10px;
            border-left: 5px solid;
        }}
        .alert-warning {{
            background: #fff3cd;
            border-color: {self.chart_colors['warning']};
            color: #856404;
        }}
        .alert-danger {{
            background: #f8d7da;
            border-color: {self.chart_colors['danger']};
            color: #721c24;
        }}
        .alert-success {{
            background: #d4edda;
            border-color: {self.chart_colors['success']};
            color: #155724;
        }}
        .table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        .table th {{
            background: #34495e;
            color: white;
            padding: 12px;
            text-align: left;
        }}
        .table td {{
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }}
        .table tr:hover {{
            background: #f5f5f5;
        }}
        .recommendation {{
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            border-radius: 10px;
            margin: 15px 0;
        }}
        .recommendation h4 {{
            color: #2c3e50;
            margin-bottom: 10px;
        }}
        .footer {{
            background: #2c3e50;
            color: white;
            text-align: center;
            padding: 20px;
        }}
        .badge {{
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: bold;
            margin: 0 5px;
        }}
        .badge-success {{ background: {self.chart_colors['success']}; color: white; }}
        .badge-warning {{ background: {self.chart_colors['warning']}; color: white; }}
        .badge-danger {{ background: {self.chart_colors['danger']}; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 6FB Barbershop AI System</h1>
            <div class="subtitle">Comprehensive Evaluation Report</div>
            <div style="margin-top: 20px;">
                <span class="badge badge-success">Production Ready</span>
                <span class="badge badge-warning">Monitoring Active</span>
            </div>
        </div>
        <nav class="nav">
            <a href="#summary">Executive Summary</a>
            <a href="#performance">Performance</a>
            <a href="#metrics">Advanced Metrics</a>
            <a href="#crisis">Crisis Response</a>
            <a href="#monitoring">Monitoring</a>
            <a href="#recommendations">Recommendations</a>
            <a href="#costs">Cost Analysis</a>
        </nav>
        <div class="content">
"""
    
    def _generate_executive_summary(self, bi_results, agent_results, crisis_results, monitoring_results) -> str:
        """Generate executive summary section"""
        # Calculate overall health score
        scores = []
        if bi_results and 'overall_metrics' in bi_results:
            scores.append(bi_results['overall_metrics'].get('average_accuracy', 0))
        if agent_results and 'summary' in agent_results:
            avg_pass_rate = statistics.mean([v.get('pass_rate', 0) for v in agent_results['summary'].values()])
            scores.append(avg_pass_rate)
        if crisis_results and 'overall_metrics' in crisis_results:
            scores.append(crisis_results['overall_metrics'].get('pass_rate', 0))
            
        overall_health = statistics.mean(scores) if scores else 0
        health_status = "success" if overall_health >= 80 else "warning" if overall_health >= 60 else "danger"
        
        html = f"""
        <section id="summary" class="section">
            <h2>Executive Summary</h2>
            <div class="metrics-grid">
                <div class="metric-card {health_status}">
                    <div class="metric-label">Overall Health Score</div>
                    <div class="metric-value">{overall_health:.1f}%</div>
                </div>
        """
        
        if bi_results and 'overall_metrics' in bi_results:
            accuracy = bi_results['overall_metrics'].get('average_accuracy', 0)
            status = "success" if accuracy >= 85 else "warning" if accuracy >= 70 else "danger"
            html += f"""
                <div class="metric-card {status}">
                    <div class="metric-label">BI Accuracy</div>
                    <div class="metric-value">{accuracy:.1f}%</div>
                </div>
            """
            
        if bi_results and 'advanced_metrics' in bi_results:
            hallucination = bi_results['advanced_metrics'].get('average_hallucination_score', 0)
            status = "success" if hallucination < 0.05 else "warning" if hallucination < 0.1 else "danger"
            html += f"""
                <div class="metric-card {status}">
                    <div class="metric-label">Hallucination Rate</div>
                    <div class="metric-value">{hallucination:.3f}</div>
                </div>
            """
            
            response_time = bi_results['advanced_metrics'].get('average_response_time_ms', 0)
            status = "success" if response_time < 2000 else "warning" if response_time < 5000 else "danger"
            html += f"""
                <div class="metric-card {status}">
                    <div class="metric-label">Avg Response Time</div>
                    <div class="metric-value">{response_time:.0f}ms</div>
                </div>
            """
            
        if monitoring_results and 'summary' in monitoring_results:
            total_alerts = monitoring_results['summary'].get('total_alerts', 0)
            status = "success" if total_alerts == 0 else "warning" if total_alerts < 5 else "danger"
            html += f"""
                <div class="metric-card {status}">
                    <div class="metric-label">Drift Alerts</div>
                    <div class="metric-value">{total_alerts}</div>
                </div>
            """
            
        if bi_results and 'advanced_metrics' in bi_results:
            roi = bi_results['advanced_metrics'].get('total_roi_impact', 0)
            html += f"""
                <div class="metric-card info">
                    <div class="metric-label">Total ROI Impact</div>
                    <div class="metric-value">${roi:,.0f}</div>
                </div>
            """
            
        html += """
            </div>
        </section>
        """
        return html
    
    def _generate_performance_charts(self, bi_results, agent_results) -> str:
        """Generate performance charts section"""
        html = """
        <section id="performance" class="section">
            <h2>Performance Analysis</h2>
        """
        
        # Agent Performance Chart
        if agent_results and 'summary' in agent_results:
            agents = list(agent_results['summary'].keys())
            pass_rates = [agent_results['summary'][a].get('pass_rate', 0) for a in agents]
            
            html += f"""
            <div class="chart-container">
                <canvas id="agentPerformanceChart"></canvas>
            </div>
            <script>
                new Chart(document.getElementById('agentPerformanceChart'), {{
                    type: 'bar',
                    data: {{
                        labels: {json.dumps([a.replace('_', ' ').title() for a in agents])},
                        datasets: [{{
                            label: 'Pass Rate (%)',
                            data: {json.dumps(pass_rates)},
                            backgroundColor: '{self.chart_colors["primary"]}',
                            borderColor: '{self.chart_colors["primary"]}',
                            borderWidth: 2
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            title: {{
                                display: true,
                                text: 'AI Agent Performance by Type'
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                max: 100
                            }}
                        }}
                    }}
                }});
            </script>
            """
        
        # Response Time Distribution
        if bi_results and 'revenue_predictions' in bi_results:
            response_times = [r.get('response_time_ms', 0) for r in bi_results['revenue_predictions']]
            if response_times:
                html += f"""
                <div class="chart-container">
                    <canvas id="responseTimeChart"></canvas>
                </div>
                <script>
                    new Chart(document.getElementById('responseTimeChart'), {{
                        type: 'line',
                        data: {{
                            labels: {json.dumps([f"Query {i+1}" for i in range(len(response_times))])},
                            datasets: [{{
                                label: 'Response Time (ms)',
                                data: {json.dumps(response_times)},
                                borderColor: '{self.chart_colors["info"]}',
                                backgroundColor: 'rgba(155, 89, 182, 0.1)',
                                tension: 0.4
                            }}]
                        }},
                        options: {{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {{
                                title: {{
                                    display: true,
                                    text: 'Response Time Trend'
                                }}
                            }}
                        }}
                    }});
                </script>
                """
        
        html += """
        </section>
        """
        return html
    
    def _generate_advanced_metrics(self, bi_results) -> str:
        """Generate advanced metrics section"""
        html = """
        <section id="metrics" class="section">
            <h2>Advanced Metrics</h2>
        """
        
        if bi_results and 'advanced_metrics' in bi_results:
            metrics = bi_results['advanced_metrics'].get('metrics_summary', {})
            
            if metrics.get('performance'):
                perf = metrics['performance']
                html += f"""
                <h3>Latency Percentiles</h3>
                <table class="table">
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                    </tr>
                    <tr>
                        <td>P50 Latency</td>
                        <td>{perf.get('p50_latency_ms', 0):.0f}ms</td>
                        <td><span class="badge badge-{'success' if perf.get('p50_latency_ms', 0) < 2000 else 'warning'}">
                            {'Good' if perf.get('p50_latency_ms', 0) < 2000 else 'Needs Improvement'}
                        </span></td>
                    </tr>
                    <tr>
                        <td>P95 Latency</td>
                        <td>{perf.get('p95_latency_ms', 0):.0f}ms</td>
                        <td><span class="badge badge-{'success' if perf.get('p95_latency_ms', 0) < 5000 else 'warning'}">
                            {'Good' if perf.get('p95_latency_ms', 0) < 5000 else 'Needs Improvement'}
                        </span></td>
                    </tr>
                    <tr>
                        <td>P99 Latency</td>
                        <td>{perf.get('p99_latency_ms', 0):.0f}ms</td>
                        <td><span class="badge badge-{'success' if perf.get('p99_latency_ms', 0) < 10000 else 'danger'}">
                            {'Acceptable' if perf.get('p99_latency_ms', 0) < 10000 else 'Critical'}
                        </span></td>
                    </tr>
                </table>
                """
            
            if metrics.get('quality'):
                quality = metrics['quality']
                html += f"""
                <h3>Quality Metrics</h3>
                <div class="metrics-grid">
                    <div class="metric-card info">
                        <div class="metric-label">Hallucination Detections</div>
                        <div class="metric-value">{quality.get('hallucination_detections', 0)}</div>
                    </div>
                    <div class="metric-card {'danger' if quality.get('high_risk_hallucinations', 0) > 0 else 'success'}">
                        <div class="metric-label">High Risk Hallucinations</div>
                        <div class="metric-value">{quality.get('high_risk_hallucinations', 0)}</div>
                    </div>
                </div>
                """
        
        html += """
        </section>
        """
        return html
    
    def _generate_crisis_analysis(self, crisis_results) -> str:
        """Generate crisis response analysis section"""
        html = """
        <section id="crisis" class="section">
            <h2>Crisis Response Analysis</h2>
        """
        
        if crisis_results and 'overall_metrics' in crisis_results:
            metrics = crisis_results['overall_metrics']
            
            html += f"""
            <div class="alert {'alert-success' if metrics.get('pass_rate', 0) >= 80 else 'alert-warning'}">
                <strong>Crisis Response Readiness:</strong> 
                {metrics.get('pass_rate', 0):.1f}% of crisis scenarios handled successfully
            </div>
            """
            
            if crisis_results.get('critical_failures'):
                html += """
                <h3>⚠️ Critical Failures Requiring Attention</h3>
                <div style="margin: 20px 0;">
                """
                for failure in crisis_results['critical_failures'][:3]:
                    html += f"""
                    <div class="alert alert-danger">
                        <strong>{failure['scenario_id']}:</strong> {failure['reason']}
                    </div>
                    """
                html += "</div>"
            
            if crisis_results.get('best_responses'):
                html += """
                <h3>✅ Exemplary Crisis Responses</h3>
                <div style="margin: 20px 0;">
                """
                for response in crisis_results['best_responses'][:2]:
                    html += f"""
                    <div class="recommendation">
                        <h4>{response['scenario_id']} (Quality: {response['quality']:.1f}%)</h4>
                        <p>{response['excerpt']}</p>
                    </div>
                    """
                html += "</div>"
        
        html += """
        </section>
        """
        return html
    
    def _generate_drift_monitoring(self, monitoring_results) -> str:
        """Generate drift monitoring section"""
        html = """
        <section id="monitoring" class="section">
            <h2>Production Monitoring & Drift Detection</h2>
        """
        
        if monitoring_results and 'summary' in monitoring_results:
            summary = monitoring_results['summary']
            
            html += f"""
            <div class="metrics-grid">
                <div class="metric-card info">
                    <div class="metric-label">Queries Monitored</div>
                    <div class="metric-value">{summary.get('total_queries', 0)}</div>
                </div>
                <div class="metric-card {'danger' if summary.get('critical_alerts', 0) > 0 else 'success'}">
                    <div class="metric-label">Critical Alerts</div>
                    <div class="metric-value">{summary.get('critical_alerts', 0)}</div>
                </div>
            </div>
            """
            
            if monitoring_results.get('alerts'):
                html += """
                <h3>Recent Drift Alerts</h3>
                <table class="table">
                    <tr>
                        <th>Metric</th>
                        <th>Baseline</th>
                        <th>Current</th>
                        <th>Drift %</th>
                        <th>Severity</th>
                        <th>Action</th>
                    </tr>
                """
                for alert in monitoring_results['alerts'][-5:]:
                    severity_badge = "danger" if alert['severity'] == "critical" else "warning" if alert['severity'] == "medium" else "info"
                    html += f"""
                    <tr>
                        <td>{alert['metric_name']}</td>
                        <td>{alert['baseline_value']:.2f}</td>
                        <td>{alert['current_value']:.2f}</td>
                        <td>{alert['drift_percentage']:.1f}%</td>
                        <td><span class="badge badge-{severity_badge}">{alert['severity'].upper()}</span></td>
                        <td>{alert['recommended_action']}</td>
                    </tr>
                    """
                html += "</table>"
        
        html += """
        </section>
        """
        return html
    
    def _generate_recommendations(self, bi_results, agent_results, crisis_results, monitoring_results) -> str:
        """Generate recommendations section"""
        html = """
        <section id="recommendations" class="section">
            <h2>Recommendations</h2>
        """
        
        recommendations = []
        
        # Check for accuracy issues
        if bi_results and 'overall_metrics' in bi_results:
            if bi_results['overall_metrics'].get('average_accuracy', 0) < 85:
                recommendations.append({
                    "priority": "HIGH",
                    "area": "Model Accuracy",
                    "action": "Retrain models with more diverse barbershop data to improve prediction accuracy"
                })
        
        # Check for hallucination issues
        if bi_results and 'advanced_metrics' in bi_results:
            if bi_results['advanced_metrics'].get('average_hallucination_score', 0) > 0.05:
                recommendations.append({
                    "priority": "CRITICAL",
                    "area": "Hallucination Prevention",
                    "action": "Implement stricter fact-checking and validation in AI responses"
                })
        
        # Check for drift issues
        if monitoring_results and 'summary' in monitoring_results:
            if monitoring_results['summary'].get('critical_alerts', 0) > 0:
                recommendations.append({
                    "priority": "CRITICAL",
                    "area": "Performance Drift",
                    "action": "Immediate model retraining required due to detected performance degradation"
                })
        
        # Check for crisis readiness
        if crisis_results and 'overall_metrics' in crisis_results:
            if crisis_results['overall_metrics'].get('pass_rate', 0) < 80:
                recommendations.append({
                    "priority": "HIGH",
                    "area": "Crisis Response",
                    "action": "Enhance crisis response training with more diverse emergency scenarios"
                })
        
        # Check for response time issues
        if bi_results and 'advanced_metrics' in bi_results:
            if bi_results['advanced_metrics'].get('average_response_time_ms', 0) > 3000:
                recommendations.append({
                    "priority": "MEDIUM",
                    "area": "Response Time",
                    "action": "Optimize model selection logic and consider caching for common queries"
                })
        
        if not recommendations:
            recommendations.append({
                "priority": "LOW",
                "area": "General",
                "action": "System performing well. Continue regular monitoring and incremental improvements."
            })
        
        for rec in recommendations:
            badge_color = "danger" if rec['priority'] == "CRITICAL" else "warning" if rec['priority'] == "HIGH" else "success"
            html += f"""
            <div class="recommendation">
                <h4>
                    <span class="badge badge-{badge_color}">{rec['priority']}</span>
                    {rec['area']}
                </h4>
                <p>{rec['action']}</p>
            </div>
            """
        
        html += """
        </section>
        """
        return html
    
    def _generate_cost_analysis(self, bi_results, monitoring_results) -> str:
        """Generate cost analysis section"""
        html = """
        <section id="costs" class="section">
            <h2>Cost Analysis</h2>
        """
        
        total_cost = 0
        query_count = 0
        
        if bi_results and 'advanced_metrics' in bi_results:
            metrics_summary = bi_results['advanced_metrics'].get('metrics_summary', {})
            if metrics_summary.get('cost_analysis'):
                cost_data = metrics_summary['cost_analysis']
                total_cost = cost_data.get('total_cost', 0)
                query_count = cost_data.get('total_queries', 0)
        
        avg_cost = total_cost / query_count if query_count > 0 else 0
        monthly_projection = avg_cost * 1000 * 30  # Assuming 1000 queries per day
        
        html += f"""
        <div class="metrics-grid">
            <div class="metric-card info">
                <div class="metric-label">Total Test Cost</div>
                <div class="metric-value">${total_cost:.2f}</div>
            </div>
            <div class="metric-card info">
                <div class="metric-label">Avg Cost per Query</div>
                <div class="metric-value">${avg_cost:.4f}</div>
            </div>
            <div class="metric-card warning">
                <div class="metric-label">Monthly Projection</div>
                <div class="metric-value">${monthly_projection:.0f}</div>
            </div>
        </div>
        
        <h3>Cost Optimization Strategies</h3>
        <div class="recommendation">
            <h4>Model Selection Optimization</h4>
            <p>Route simple queries to Gemini 2.0 Flash (cheapest) and reserve Claude Opus 4.1 for complex coding tasks only.</p>
        </div>
        <div class="recommendation">
            <h4>Response Caching</h4>
            <p>Implement caching for frequently asked questions to reduce API calls by an estimated 30%.</p>
        </div>
        <div class="recommendation">
            <h4>Batch Processing</h4>
            <p>Group similar queries together for batch processing to reduce overhead costs.</p>
        </div>
        """
        
        html += """
        </section>
        """
        return html
    
    def _generate_html_footer(self) -> str:
        """Generate HTML footer"""
        return f"""
        </div>
        <div class="footer">
            <p>Generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            <p>© 2025 6FB Barbershop AI System - Evaluation Report</p>
        </div>
    </div>
</body>
</html>
"""

def generate_report():
    """Generate comprehensive visual report"""
    generator = VisualReportGenerator()
    report_file = generator.generate_comprehensive_report()
    return report_file

if __name__ == "__main__":
    generate_report()