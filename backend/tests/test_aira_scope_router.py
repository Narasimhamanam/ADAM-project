from app.routers.answers import answer_question, Question


def test_aira_domain_scope_router_platform():
    res = answer_question(Question(question="what is ADAM?"))
    assert "ADAM (Alzheimer's Disease Detection & Advanced Multimodal Reasoning)" in res["answer"]
    assert "platform" in res["answer"]
    assert "nursing home" in res["answer"]
    assert len(res["sources"]) == 0  # Curated platform knowledge, no fake paper citation


def test_aira_domain_scope_router_alzheimers_background():
    res = answer_question(Question(question="what is AD?"))
    assert "Alzheimer's disease (AD)" in res["answer"]
    assert "General background, not from the indexed papers" in res["explanation"]
    assert len(res["sources"]) == 0


def test_aira_domain_scope_router_spelling_correction():
    res = answer_question(Question(question="wat is alzhimer"))
    assert "I read this as:" in res.get("correction_notice", "")
    assert "Alzheimer" in res["answer"]


def test_aira_domain_scope_router_out_of_scope():
    res = answer_question(Question(question="who won the cricket match yesterday?"))
    assert "I can help with Alzheimer's disease, the gut microbiome and the ADAM platform." in res["answer"]
    assert "Please re-enter your question" in res["explanation"]
    assert len(res["followups"]) > 0


def test_aira_domain_scope_router_greeting():
    res = answer_question(Question(question="Hello AIRA"))
    assert "Hello! I am AIRA" in res["answer"]
    assert len(res["followups"]) > 0
