#!/usr/bin/env python3
"""Synchronize LabOn work items and metrics with a GitHub Project."""

from __future__ import annotations

import argparse
import json
import os
import re
import statistics
import subprocess
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import Any


METRICS_START = "<!-- METRICS:START -->"
METRICS_END = "<!-- METRICS:END -->"

PRD_BY_LABEL = {
    "prd:autenticacao": "Ciclo de vida de autenticação e credenciais",
    "prd:usuarios": "Cadastro e contratos de dados de usuário",
    "prd:erros-frontend": "Experiência de erros no frontend",
    "prd:responsividade": "Frontend responsivo",
    "prd:qualidade": "Fundação de qualidade e testes críticos",
    "prd:manual": "Manual de uso do LabOn",
    "prd:conteineres": "Modernização da esteira de contêineres",
    "prd:navegacao": "Navegação e experiência pós-autenticação",
    "prd:dependencias": "Remediação de vulnerabilidades de dependências",
    "prd:visibilidade": "Visibilidade e posicionamento de funcionalidades",
}


def run_gh(*args: str, check: bool = True) -> str:
    result = subprocess.run(
        ["gh", *args],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if check and result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"gh {' '.join(args)}: {message}")
    return result.stdout


def gh_json(*args: str, check: bool = True) -> Any:
    output = run_gh(*args, check=check).strip()
    return json.loads(output) if output else None


def gh_succeeds(*args: str) -> bool:
    result = subprocess.run(
        ["gh", *args],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


def gh_json_optional(*args: str) -> Any | None:
    result = subprocess.run(
        ["gh", *args],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0 or not result.stdout.strip():
        return None
    return json.loads(result.stdout)


def normalized(value: str) -> str:
    decomposed = unicodedata.normalize("NFKD", value.lower())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def label_names(labels: list[Any]) -> list[str]:
    return [label.get("name", "") if isinstance(label, dict) else str(label) for label in labels]


def classify(title: str, labels: list[Any]) -> dict[str, str]:
    names = label_names(labels)
    searchable = normalized(" ".join([title, *names]))

    if any(term in searchable for term in ("dependabot", "vulnerab", "secret scanning", "senha hardcoded")):
        work_type = "Segurança"
    elif any(term in searchable for term in ("workflow", "docker", "container", "ghcr", "azure", "devops")):
        work_type = "DevOps"
    elif any(term in searchable for term in ("document", "manual", "wiki")):
        work_type = "Documentação"
    elif any(term in searchable for term in ("teste", "quality", "qualidade", "maintainability", "reliability")):
        work_type = "Qualidade"
    elif any(term in searchable for term in ("corrigir", "erro", "bug", "falha", "invalido")):
        work_type = "Bug"
    else:
        work_type = "Feature"

    if any(term in searchable for term in ("workflow", "pipeline", "docker", "container", "ghcr", "azure", "ci/cd")):
        area = "CI/CD"
    elif any(term in searchable for term in ("frontend", "tela", "layout", "responsiv", "interface", "ux")):
        area = "Frontend"
    elif any(term in searchable for term in ("backend", "dto", "api", "seed")):
        area = "Backend"
    elif work_type == "Segurança":
        area = "Segurança"
    elif work_type == "Documentação":
        area = "Documentação"
    else:
        area = "Produto"

    if "critical" in searchable or "critica" in searchable or "crítica" in searchable:
        priority, severity = "P0 Crítica", "Crítica"
    elif work_type == "Segurança":
        priority, severity = "P1 Alta", "Alta"
    elif work_type in {"Bug", "Qualidade", "DevOps"}:
        priority, severity = "P2 Média", "N/A"
    else:
        priority, severity = "P3 Baixa", "N/A"

    prd = next((PRD_BY_LABEL[name] for name in names if name in PRD_BY_LABEL), "")
    return {
        "Tipo": work_type,
        "Área": area,
        "Prioridade": priority,
        "Severidade": severity,
        "PRD": prd,
    }


def replace_metrics_block(readme: str, metrics: list[str]) -> str:
    block = "\n".join([METRICS_START, *metrics, METRICS_END])
    pattern = re.compile(
        rf"{re.escape(METRICS_START)}.*?{re.escape(METRICS_END)}",
        flags=re.DOTALL,
    )
    if pattern.search(readme):
        return pattern.sub(block, readme)
    return readme.rstrip() + "\n\n## Indicadores atuais\n\n" + block + "\n"


class ProjectSync:
    def __init__(self, owner: str, number: int, repository: str, dry_run: bool = False):
        self.owner = owner
        self.number = number
        self.repository = repository
        self.dry_run = dry_run
        self.project = gh_json("project", "view", str(number), "--owner", owner, "--format", "json")
        self.project_id = self.project["id"]
        field_data = gh_json("project", "field-list", str(number), "--owner", owner, "--format", "json")
        self.fields = {field["name"]: field for field in field_data["fields"]}
        self.refresh_items()

    def refresh_items(self) -> None:
        data = gh_json(
            "project", "item-list", str(self.number), "--owner", self.owner,
            "--limit", "500", "--format", "json",
        )
        self.project_items = data["items"]
        self.items = {
            item.get("content", {}).get("url"): item
            for item in self.project_items
            if item.get("content", {}).get("url")
        }

    def remove_non_issue_items(self) -> None:
        removed = False
        for item in self.project_items:
            if item.get("content", {}).get("type") == "Issue":
                continue
            item_id = item.get("id")
            if not item_id:
                continue
            if self.dry_run:
                print(f"DRY-RUN remover item não-Issue: {item_id}")
            else:
                run_gh(
                    "project", "item-delete", str(self.number), "--owner", self.owner,
                    "--id", item_id,
                )
            removed = True
        if removed and not self.dry_run:
            self.refresh_items()

    def ensure_item(self, content: dict[str, Any]) -> tuple[dict[str, Any] | None, bool]:
        url = content["url"]
        if url in self.items:
            return self.items[url], False
        if self.dry_run:
            print(f"DRY-RUN adicionar item: {url}")
            return None, True
        item = gh_json(
            "project", "item-add", str(self.number), "--owner", self.owner,
            "--url", url, "--format", "json",
        )
        wrapped = {"id": item["id"], "content": content}
        self.items[url] = wrapped
        return wrapped, True

    def set_select(self, item_id: str, field_name: str, option_name: str) -> None:
        field = self.fields[field_name]
        option = next(option for option in field["options"] if option["name"] == option_name)
        if self.dry_run:
            print(f"DRY-RUN {item_id}: {field_name}={option_name}")
            return
        run_gh(
            "project", "item-edit", "--id", item_id, "--project-id", self.project_id,
            "--field-id", field["id"], "--single-select-option-id", option["id"],
        )

    def set_text(self, item_id: str, field_name: str, value: str) -> None:
        if not value:
            return
        if self.dry_run:
            print(f"DRY-RUN {item_id}: {field_name}={value}")
            return
        run_gh(
            "project", "item-edit", "--id", item_id, "--project-id", self.project_id,
            "--field-id", self.fields[field_name]["id"], "--text", value,
        )

    def classify_new_item(self, item_id: str, content: dict[str, Any]) -> None:
        values = classify(content.get("title", ""), content.get("labels", []))
        for field_name in ("Tipo", "Área", "Prioridade", "Severidade"):
            self.set_select(item_id, field_name, values[field_name])
        self.set_text(item_id, "PRD", values["PRD"])

    def sync_open_items(self) -> None:
        issues = gh_json(
            "issue", "list", "--repo", self.repository, "--state", "open", "--limit", "500",
            "--json", "number,title,url,labels",
        )
        for content in issues:
            item, created = self.ensure_item(content)
            if created and item:
                self.set_select(item["id"], "Status", "Todo")
                self.classify_new_item(item["id"], content)

    def sync_event(self) -> None:
        event_path = os.getenv("GITHUB_EVENT_PATH")
        event_name = os.getenv("GITHUB_EVENT_NAME", "")
        if not event_path or event_name != "issues":
            return
        with open(event_path, encoding="utf-8") as event_file:
            payload = json.load(event_file)
        content = payload.get("issue")
        if not content:
            return
        normalized_content = {
            "number": content["number"],
            "title": content["title"],
            "url": content["html_url"],
            "labels": content.get("labels", []),
        }
        item, created = self.ensure_item(normalized_content)
        if not item:
            return
        if created:
            self.classify_new_item(item["id"], normalized_content)
        action = payload.get("action", "")
        if action == "closed":
            status = "Done"
        elif action == "ready_for_review":
            status = "In Progress"
        elif action in {"opened", "reopened", "converted_to_draft"}:
            status = "Todo"
        else:
            return
        self.set_select(item["id"], "Status", status)

    def metrics(self) -> list[str]:
        issues = gh_json(
            "issue", "list", "--repo", self.repository, "--state", "open", "--limit", "500",
            "--json", "number,createdAt,labels,assignees",
        )
        now = datetime.now(timezone.utc)
        ages = [
            (now - datetime.fromisoformat(issue["createdAt"].replace("Z", "+00:00"))).total_seconds()
            / 86_400
            for issue in issues
        ]
        median_age = round(statistics.median(ages)) if ages else 0

        alert_pages = gh_json_optional(
            "api", "--paginate", "--slurp",
            f"repos/{self.repository}/dependabot/alerts?per_page=100",
        )
        alerts = [alert for page in alert_pages for alert in page] if alert_pages else []
        open_alerts = [alert for alert in alerts if alert.get("state") == "open"]
        severity_counts = {name: 0 for name in ("critical", "high", "medium", "low")}
        for alert in open_alerts:
            severity = alert.get("security_advisory", {}).get("severity")
            if severity in severity_counts:
                severity_counts[severity] += 1

        runs = gh_json_optional(
            "api", f"repos/{self.repository}/actions/runs?per_page=100"
        ) or {"workflow_runs": []}
        conclusions = [
            run.get("conclusion") for run in runs.get("workflow_runs", [])
            if run.get("conclusion") not in {None, "skipped"}
        ]
        successes = conclusions.count("success")
        success_rate = (successes / len(conclusions) * 100) if conclusions else 0
        success_rate_text = f"{success_rate:.1f}".replace(".", ",")

        protected = gh_succeeds(
            "api", f"repos/{self.repository}/branches/develop/protection"
        )
        secret_scan = gh_succeeds(
            "api", f"repos/{self.repository}/secret-scanning/alerts?per_page=1"
        )
        code_scan = gh_succeeds(
            "api", f"repos/{self.repository}/code-scanning/alerts?per_page=1"
        )
        critical_label = "crítico" if severity_counts["critical"] == 1 else "críticos"
        sao_paulo = timezone(timedelta(hours=-3))
        local_date = now.astimezone(sao_paulo).date().isoformat()
        if alert_pages is None:
            dependabot_line = "- Alertas Dependabot abertos: indisponíveis para a credencial configurada"
        else:
            dependabot_line = (
                "- Alertas Dependabot abertos: "
                f"{len(open_alerts)} ({severity_counts['critical']} {critical_label}, "
                f"{severity_counts['high']} altos, {severity_counts['medium']} médios e "
                f"{severity_counts['low']} baixos)"
            )

        return [
            f"- Issues abertas: {len(issues)}",
            f"- Issues sem responsável: {sum(not issue['assignees'] for issue in issues)}",
            f"- Issues sem classificação: {sum(not issue['labels'] for issue in issues)}",
            f"- Idade mediana das issues abertas: {median_age} dias",
            dependabot_line,
            f"- Taxa recente de sucesso da CI: {success_rate_text}% "
            f"({successes} sucessos em {len(conclusions)} execuções concluídas)",
            f"- Proteção da branch `develop`: {'configurada' if protected else 'não configurada'}",
            f"- Secret Scanning: {'habilitado' if secret_scan else 'desabilitado ou indisponível'}",
            f"- Code Scanning: {'disponível' if code_scan else 'sem análise disponível pela API'}",
            f"- Atualizado em: {local_date}",
        ]

    def update_metrics(self) -> None:
        readme = self.project.get("readme", "")
        updated = replace_metrics_block(readme, self.metrics())
        if updated == readme:
            print("Métricas já estão atualizadas.")
            return
        if self.dry_run:
            print(updated)
            return
        run_gh(
            "project", "edit", str(self.number), "--owner", self.owner,
            "--readme", updated,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    owner = os.environ["PROJECT_OWNER"]
    number = int(os.environ["PROJECT_NUMBER"])
    repository = os.getenv("PROJECT_REPOSITORY", os.environ.get("GITHUB_REPOSITORY", ""))
    if not repository:
        raise RuntimeError("PROJECT_REPOSITORY ou GITHUB_REPOSITORY deve ser informado.")

    sync = ProjectSync(owner, number, repository, args.dry_run)
    sync.remove_non_issue_items()
    sync.sync_open_items()
    sync.sync_event()
    sync.update_metrics()


if __name__ == "__main__":
    main()
