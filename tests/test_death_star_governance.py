import json
from pathlib import Path


REGISTRY_PATH = Path("config/governance/death-star-registry.json")


def load_registry():
    return json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))


def test_phoenix_routes_through_billy():
    registry = load_registry()
    phoenix = next(item for item in registry["domains"] if item["id"] == "PHOENIX")

    assert phoenix["executive_operator"] == "Billy"
    assert phoenix["routing"] == ["Death Star", "Billy", "PHOENIX"]
    assert registry["controls"]["block_phoenix_bypass"] is True


def test_boba_fett_is_automatic_bypass_control():
    registry = load_registry()
    boba_fett = next(item for item in registry["agents"] if item["id"] == "Boba Fett")

    assert boba_fett["type"] == "CONTROL_AGENT"
    assert boba_fett["trigger_mode"] == "AUTOMATIC"
    assert "STOP_INVALID_ROUTING" in boba_fett["actions"]
    assert registry["controls"]["require_control_agent_on_bypass"] is True


def test_github_is_checked_before_sync_is_declared_unavailable():
    registry = load_registry()
    controls = registry["controls"]

    assert controls["github_sync_channel"] == "thomascatulli-1976/phoenix"
    assert controls["check_repository_before_sync_unavailable"] is True


def test_personal_ai_work_os_is_owned_and_monitored_by_billy():
    registry = load_registry()
    initiative = next(
        item for item in registry["initiatives"] if item["id"] == "Personal AI Work OS"
    )

    assert initiative["architecture_owner"] == "PHOENIX"
    assert initiative["executive_operator"] == "Billy"
    assert initiative["monitoring_owner"] == "Billy"
    assert initiative["control_agent"] == "Boba Fett"
    assert initiative["human_approval"] == "MANDATORY"
