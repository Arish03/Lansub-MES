import asyncio
import json
import logging
import httpx
from datetime import datetime, timedelta
from typing import List, Optional

log = logging.getLogger(__name__)

# ── Ollama Configuration ─────────────────────────────────────────────────────
OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL = "qwen3.5:latest"


async def _generate_via_ollama(report_type: str, context: dict) -> str:
    """Generate a report using Qwen 3.5 via Ollama's local API."""
    context_str = json.dumps(context, indent=2)

    system_instruction = (
        "You are Lansub AI, a condition monitoring and predictive maintenance assistant for a Gas Compressor Train. "
        "Generate a detailed, professional condition monitoring report in Markdown format based on the "
        "provided JSON context data containing assets, telemetry, and alarms. "
        "The report type to generate is: " + report_type + ".\n\n"
        "Instructions:\n"
        "1. For 'daily_summary': Summarize plant status, show an asset health table, list critical findings, and give action items.\n"
        "2. For 'fault_analysis': Provide root cause analysis of any active faults (e.g., gear wear, bearing wear, cavitation), specify severity, affected components, and impact.\n"
        "3. For 'maintenance_recommendation': Highlight priority maintenance tasks, target dates, required spare parts, and optimal maintenance windows.\n"
        "Keep the output clean, highly structured, professional, and directly in Markdown without any wrapping chat dialogue. "
        "Do not include any thinking tags or internal reasoning. Output only the final report."
    )

    user_message = f"Here is the machine state context data:\n```json\n{context_str}\n```\n\nGenerate the {report_type} report now."

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_message},
    ]

    log.info(f"Calling Ollama ({OLLAMA_MODEL}) for report type: {report_type}...")

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": OLLAMA_MODEL,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "num_predict": 2048,
                },
            },
        )
        response.raise_for_status()
        result = response.json()

    generated_text = result.get("message", {}).get("content", "")

    # Strip any <think>...</think> blocks that Qwen3.5 may produce
    import re
    generated_text = re.sub(r"<think>.*?</think>", "", generated_text, flags=re.DOTALL).strip()

    log.info(f"Ollama report generation complete. Length: {len(generated_text)} chars")
    return generated_text


async def generate_report(
    report_type: str,
    asset_data: list,
    telemetry_summary: dict,
    alarm_summary: dict,
    db=None,
) -> dict:
    """
    Generate an AI report. Uses Qwen 3.5 via Ollama with template fallback.
    report_type: 'daily_summary' | 'fault_analysis' | 'maintenance_recommendation'
    """
    context = _build_context(asset_data, telemetry_summary, alarm_summary)

    try:
        content = await _generate_via_ollama(report_type, context)
        generated_by = f"Lansub AI (Qwen 3.5 via Ollama)"
        content = f"> **🤖 AI Model:** Running **Qwen 3.5** locally via Ollama\n\n" + content
    except Exception as e:
        log.warning(f"Ollama/Qwen3.5 failed: {e}. Falling back to template engine.")
        content = _template_report(report_type, context)
        generated_by = "Lansub AI (Rule-Based Template Engine)"
        content = (
            f"> **⚠️ System Notice:** Qwen 3.5 model unavailable (falling back to template engine). "
            f"Error: {str(e)}\n\n" + content
        )

    return {
        "report_type": report_type,
        "generated_at": datetime.utcnow().isoformat(),
        "generated_by": generated_by,
        "content": content,
        "context": context,
    }


def _build_context(asset_data: list, telemetry_summary: dict, alarm_summary: dict) -> dict:
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "plant": "Gas Compressor Train — Unit 01",
        "assets": asset_data,
        "telemetry": telemetry_summary,
        "alarms": alarm_summary,
        "total_critical": alarm_summary.get("critical_count", 0),
        "total_warning": alarm_summary.get("warning_count", 0),
    }




def _template_report(report_type: str, ctx: dict) -> str:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    assets = ctx.get("assets", [])
    critical = ctx.get("total_critical", 0)
    warning = ctx.get("total_warning", 0)
    alarms = ctx.get("alarms", {})

    if report_type == "daily_summary":
        healthy = sum(1 for a in assets if a.get("health_score", 100) >= 80)
        degraded = sum(1 for a in assets if 50 <= a.get("health_score", 100) < 80)
        critical_assets = sum(1 for a in assets if a.get("health_score", 100) < 50)
        plant_status = "🟢 GOOD" if critical == 0 else "🔴 ATTENTION REQUIRED"

        # Build asset table rows
        table_rows = []
        for a in assets:
            h = a.get("health_score", 100)
            if h >= 80:
                status_icon = "🟢 Good"
            elif h >= 50:
                status_icon = "🟡 Degraded"
            else:
                status_icon = "🔴 Critical"
            fault = a.get("fault_type", "none").replace("_", " ").title()
            table_rows.append(f"| {a.get('asset_id', 'N/A')} | {h:.1f}% | {status_icon} | {fault} |")
        table_str = "\n".join(table_rows)

        # Critical alarm lines
        alarm_lines = []
        for a in alarms.get("critical_alarms", []):
            msg = a.get("message", "")
            alarm_lines.append(f"- **{msg}**")
        alarm_str = "\n".join(alarm_lines) if alarm_lines else "None at this time."

        next_cycle = (datetime.utcnow() + timedelta(hours=24)).strftime("%Y-%m-%d %H:%M UTC")

        rec1 = "1. **Continue normal operation** — All assets performing within design parameters." if (critical == 0 and warning == 0) else ""
        rec2 = "2. **Monitor degraded assets** — Schedule inspection during next maintenance window." if degraded > 0 else ""
        rec3 = "3. **Immediate action required** — Investigate critical alarms before next shift." if critical_assets > 0 else ""
        rec4 = "4. **Review maintenance schedule** — Ensure PM tasks are up to date for all assets."

        return (
            "# LANSUB CONDITION MONITORING — DAILY SUMMARY\n"
            f"**Generated:** {ts}\n"
            "**Plant:** Gas Compressor Train — Unit 01\n"
            "**Report Type:** Daily Summary\n"
            "**Generated By:** Lansub AI Analytics Engine\n\n"
            "---\n\n"
            "## 🔍 EXECUTIVE SUMMARY\n\n"
            f"The Gas Compressor Train completed a monitoring cycle with **{len(assets)} active assets** "
            f"under continuous surveillance. The system recorded **{critical} critical alarms** and **{warning} warning-level events**.\n\n"
            f"Overall plant health status: **{plant_status}**\n\n"
            "---\n\n"
            "## 📊 ASSET HEALTH OVERVIEW\n\n"
            "| Asset | Health Score | Status | Fault Detected |\n"
            "|-------|-------------|--------|----------------|\n"
            f"{table_str}\n\n"
            f"- ✅ Healthy Assets: {healthy}\n"
            f"- ⚠️  Degraded Assets: {degraded}\n"
            f"- 🚨 Critical Assets: {critical_assets}\n\n"
            "---\n\n"
            "## 🚨 CRITICAL FINDINGS\n\n"
            f"{alarm_str}\n\n"
            "---\n\n"
            "## 💡 RECOMMENDATIONS\n\n"
            f"{rec1}\n{rec2}\n{rec3}\n{rec4}\n\n"
            "---\n\n"
            "## 📅 NEXT STEPS\n\n"
            "- Next scheduled maintenance window: Check CMMS for PM schedule\n"
            f"- Next AI analysis cycle: {next_cycle}\n"
            "- Trending indicators require: Continued monitoring\n\n"
            "---\n"
            "*Report generated automatically by Lansub AI — Lansub MES v1.0*\n"
            "*For questions, contact your condition monitoring engineer.*\n"
        )

    elif report_type == "fault_analysis":
        fault_assets = [a for a in assets if a.get("fault_type", "none") != "none"]
        no_fault_msg = "No active faults detected at time of analysis." if not fault_assets else ""

        fault_sections = []
        for a in fault_assets:
            asset_id = a.get("asset_id", "N/A")
            fault_upper = a.get("fault_type", "").replace("_", " ").upper()
            health = a.get("health_score", 100)
            rul = a.get("rul_days", 365)
            fault_name = a.get("fault_type", "").replace("_", " ")
            asset_type = a.get("asset_type", "N/A")
            if health > 60:
                severity_desc = "early-stage degradation requiring scheduled intervention"
                impact = "Low — Scheduled maintenance sufficient"
            else:
                severity_desc = "advanced degradation requiring immediate action"
                impact = "High — Risk of unplanned downtime"
            fault_sections.append(
                f"### {asset_id} — {fault_upper}\n\n"
                f"**Health Score:** {health:.1f}%\n"
                f"**Estimated RUL:** {rul} days\n\n"
                f"**Fault Signature:**\n"
                f"The {fault_name} pattern has been identified based on vibration "
                f"spectral analysis and bearing temperature trending. The fault severity level indicates "
                f"{severity_desc}.\n\n"
                f"**Affected Components:** {asset_type} bearings, coupling system\n"
                f"**Impact:** {impact}\n\n"
                "---\n"
            )
        fault_str = "\n".join(fault_sections)

        return (
            "# LANSUB AI — FAULT ANALYSIS REPORT\n"
            f"**Generated:** {ts}\n"
            f"**Assets with Active Faults:** {len(fault_assets)}\n\n"
            "---\n\n"
            "## ROOT CAUSE ANALYSIS\n\n"
            f"{no_fault_msg}\n\n"
            f"{fault_str}\n"
            "*Report generated by Lansub AI — Lansub MES v1.0*\n"
        )

    else:  # maintenance_recommendation
        table_rows = []
        for a in assets:
            h = a.get("health_score", 100)
            priority = "HIGH" if h < 60 else "MEDIUM" if h < 80 else "LOW"
            asset_id = a.get("asset_id", "")
            task = a.get("fault_type", "Routine PM").replace("_", " ").title()
            hours = "4-8" if h < 60 else "2-4"
            rul = a.get("rul_days", 30)
            target = (datetime.utcnow() + timedelta(days=rul // 2)).strftime("%Y-%m-%d")
            table_rows.append(f"| {priority} | {asset_id} | {task} inspection | {hours} | {target} |")
        table_str = "\n".join(table_rows)

        rul_values = [a.get("rul_days", 365) for a in assets]
        min_rul = min(rul_values) if rul_values else 30

        return (
            "# LANSUB AI — MAINTENANCE RECOMMENDATION REPORT\n"
            f"**Generated:** {ts}\n"
            "**Plant:** Gas Compressor Train — Unit 01\n\n"
            "---\n\n"
            "## PRIORITY MAINTENANCE TASKS\n\n"
            "| Priority | Asset | Task | Est. Hours | Target Date |\n"
            "|----------|-------|------|-----------|-------------|\n"
            f"{table_str}\n\n"
            "## REQUIRED SPARE PARTS\n\n"
            "- Bearing sets (matched pair) for each identified fault location\n"
            "- Coupling elements — inspect and replace if worn\n"
            "- Lubrication: Grease/oil as per OEM specification\n"
            "- Gaskets and seals for preventive replacement\n\n"
            "## RECOMMENDED MAINTENANCE WINDOW\n\n"
            f"Optimal maintenance window: **Next planned shutdown** or within **{min_rul} days**\n\n"
            "---\n"
            "*Report generated by Lansub AI — Lansub MES v1.0*\n"
        )
