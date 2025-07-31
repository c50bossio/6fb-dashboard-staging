#!/usr/bin/env python3
"""
Database Analysis Script
Analyzes all SQLite databases to understand schemas and data
"""
import sqlite3
import os
import json
from pathlib import Path

def analyze_database(db_path):
    """Analyze a single database file"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        analysis = {
            'path': str(db_path),
            'size_bytes': os.path.getsize(db_path),
            'tables': {}
        }
        
        for table in tables:
            table_name = table[0]
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()
            
            # Count rows
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            row_count = cursor.fetchone()[0]
            
            # Get sample data (first 3 rows)
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            sample_data = cursor.fetchall()
            
            analysis['tables'][table_name] = {
                'columns': [{'name': col[1], 'type': col[2], 'not_null': col[3], 'pk': col[5]} for col in columns],
                'row_count': row_count,
                'sample_data': sample_data
            }
        
        conn.close()
        return analysis
        
    except Exception as e:
        return {'path': str(db_path), 'error': str(e)}

def main():
    """Analyze all databases in the system"""
    base_path = Path("/Users/bossio/6FB AI Agent System")
    
    # Find all .db files
    db_files = []
    for db_file in base_path.rglob("*.db"):
        db_files.append(db_file)
    
    print(f"Found {len(db_files)} database files:")
    for db in db_files:
        print(f"  {db}")
    
    # Analyze each database
    all_analyses = []
    for db_path in db_files:
        print(f"\nAnalyzing: {db_path}")
        analysis = analyze_database(db_path)
        all_analyses.append(analysis)
        
        if 'error' not in analysis:
            print(f"  Tables: {list(analysis['tables'].keys())}")
            print(f"  Size: {analysis['size_bytes']} bytes")
            total_rows = sum(table['row_count'] for table in analysis['tables'].values())
            print(f"  Total rows: {total_rows}")
    
    # Save detailed analysis
    with open(base_path / 'database_analysis.json', 'w') as f:
        json.dump(all_analyses, f, indent=2)
    
    print(f"\nDetailed analysis saved to: {base_path}/database_analysis.json")
    
    # Generate consolidation report
    generate_consolidation_report(all_analyses)

def generate_consolidation_report(analyses):
    """Generate a consolidation strategy report"""
    base_path = Path("/Users/bossio/6FB AI Agent System")
    
    # Categorize databases
    core_dbs = []
    marketing_dbs = []
    analytics_dbs = []
    test_dbs = []
    
    for analysis in analyses:
        if 'error' in analysis:
            continue
            
        path = analysis['path']
        if 'marketing_campaigns' in path:
            marketing_dbs.append(analysis)
        elif 'analytics_dashboard' in path:
            analytics_dbs.append(analysis)
        elif 'test' in path.lower() or 'demo' in path.lower():
            test_dbs.append(analysis)
        else:
            core_dbs.append(analysis)
    
    # Find common table patterns
    all_tables = {}
    for analysis in analyses:
        if 'error' in analysis:
            continue
        for table_name, table_info in analysis['tables'].items():
            if table_name not in all_tables:
                all_tables[table_name] = []
            all_tables[table_name].append({
                'db_path': analysis['path'],
                'columns': table_info['columns'],
                'row_count': table_info['row_count']
            })
    
    # Generate report
    report = f"""
DATABASE CONSOLIDATION ANALYSIS REPORT
=====================================

SUMMARY:
- Total databases: {len(analyses)}
- Core system databases: {len(core_dbs)}
- Marketing campaign databases: {len(marketing_dbs)}
- Analytics dashboard databases: {len(analytics_dbs)}
- Test/Demo databases: {len(test_dbs)}

UNIQUE TABLES FOUND: {len(all_tables)}
"""
    
    for table_name, instances in all_tables.items():
        report += f"\n{table_name}:"
        report += f"\n  Instances: {len(instances)}"
        total_rows = sum(inst['row_count'] for inst in instances)
        report += f"\n  Total rows across all instances: {total_rows}"
        
        # Check schema consistency
        if len(instances) > 1:
            first_schema = instances[0]['columns']
            consistent = all(inst['columns'] == first_schema for inst in instances[1:])
            report += f"\n  Schema consistent: {consistent}"
            if not consistent:
                report += f"\n  WARNING: Schema inconsistency detected!"
    
    report += f"""

CONSOLIDATION STRATEGY:
1. Create unified master database with all required tables
2. Migrate data from all instances to master database
3. Update all application code to use unified database
4. Archive/delete redundant database files

CRITICAL ISSUES IDENTIFIED:
- Data scattered across {len(analyses)} separate files
- Potential schema inconsistencies
- No centralized data integrity
- Performance impact from multiple connections
"""
    
    # Save report
    with open(base_path / 'consolidation_report.txt', 'w') as f:
        f.write(report)
    
    print(report)
    print(f"\nConsolidation report saved to: {base_path}/consolidation_report.txt")

if __name__ == "__main__":
    main()