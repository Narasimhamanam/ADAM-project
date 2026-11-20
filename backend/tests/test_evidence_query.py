import pytest
from app.agents.adam_workflow import choose_evidence_query


def test_evidence_selection_modes():
    assert choose_evidence_query("frailty", None, True) == ("frailty", "automatic")
    assert choose_evidence_query("frailty", " PPI ", False) == ("PPI", "manual")
    assert choose_evidence_query("frailty", "PPI", True) == ("PPI frailty", "hybrid")
    with pytest.raises(ValueError):
        choose_evidence_query("frailty", None, False)
