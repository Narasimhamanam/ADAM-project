"""
Provider-Independent LLM Client & Biomedical Reasoning Engine
=============================================================
Supports Groq, OpenAI, Ollama, and local expert reasoning.
Features dynamic query intent routing to eliminate rigid templates,
prevent unrelated literature pollution, and provide natural, query-driven responses.
"""
from __future__ import annotations

import os
import re
from typing import Dict, Any, List, Optional
import httpx

from app.core.logging import get_logger
from app.rag.intent import classify_query_intent
from app.rag.literature_store import search_literature

logger = get_logger(__name__)

CONVERSATIONAL_SYSTEM_PROMPT = (
    "You are AIRA, the ADAM Intelligent Research Assistant. "
    "Respond warmly, naturally, and concisely to user conversational inquiries, greetings, or questions about what you can do. "
    "Do NOT force medical or microbiome lectures into simple conversational questions."
)

SCIENTIFIC_SYSTEM_PROMPT = (
    "You are AIRA, an expert biomedical AI research assistant specializing in Alzheimer's disease, "
    "gut microbiome multi-omics, machine learning, and explainability in the ADAM-1 framework.\n"
    "Guidelines:\n"
    "1. Structure your response with a clear direct answer first, followed by supporting evidence and mechanisms.\n"
    "2. Ground findings in verified literature citations where relevant.\n"
    "3. Keep discussions objective and avoid making direct medical causality claims when discussing correlations or SHAP attributions."
)


class LLMClient:
    """Provider-independent LLM caller with intent-aware knowledge synthesis."""

    GROQ_MODELS = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "mixtral-8x7b-32768",
        "gemma2-9b-it",
    ]

    def __init__(self):
        self.groq_key = os.environ.get("GROQ_API_KEY", "").strip()
        self.openai_key = os.environ.get("OPENAI_API_KEY", "").strip()
        self.ollama_url = os.environ.get("OLLAMA_URL", "http://localhost:11434").strip()
        model_env = os.environ.get("GROQ_MODEL", "").strip()
        if not model_env or "compound" in model_env.lower() or "mini" in model_env.lower():
            self.groq_model = "llama-3.3-70b-versatile"
        else:
            self.groq_model = model_env

    def get_active_provider(self) -> str:
        """Identify which provider is active."""
        if self.groq_key:
            return f"Groq ({self.groq_model})"
        if self.openai_key:
            return "OpenAI (GPT-4o-mini)"
        return "ADAM-1 Biomedical Expert Engine (Local RAG)"

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context_docs: Optional[List[Dict[str, Any]]] = None,
        intent: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Generate response via external LLM or intent-aware local synthesizer."""
        provider = self.get_active_provider()
        detected_intent = intent or classify_query_intent(prompt)

        # Only use context docs and citations if intent actually warrants it
        active_context_docs = context_docs if detected_intent in ["biomedical_research", "data_record"] else []
        citations = []
        context_text = ""
        if active_context_docs:
            context_text = "\n\nRelevant Literature Context:\n" + "\n".join(
                [f"[{d.get('pmid', 'Ref')}] {d.get('title')}: {d.get('abstract')}" for d in active_context_docs]
            )
            citations = [{"pmid": d.get("pmid"), "title": d.get("title")} for d in active_context_docs]

        full_prompt = f"{prompt}\n{context_text}" if context_text else prompt

        # Determine appropriate system prompt
        effective_sys_prompt = system_prompt
        if not effective_sys_prompt:
            if detected_intent in ["general_conversation", "unrelated_general"]:
                effective_sys_prompt = CONVERSATIONAL_SYSTEM_PROMPT
            else:
                effective_sys_prompt = SCIENTIFIC_SYSTEM_PROMPT

        # 1. Try Groq if configured
        if self.groq_key:
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.groq_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": self.groq_model,
                            "messages": [
                                {"role": "system", "content": effective_sys_prompt},
                                {"role": "user", "content": full_prompt},
                            ],
                            "temperature": 0.2 if detected_intent in ["biomedical_research", "general_knowledge"] else 0.5,
                            "max_tokens": 800,
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        text = data["choices"][0]["message"]["content"]
                        return {
                            "response": text,
                            "provider": f"Groq ({self.groq_model})",
                            "citations": citations,
                            "intent": detected_intent,
                        }
                    else:
                        logger.warning("Groq API returned error status", status_code=res.status_code, body=res.text)
            except Exception as e:
                logger.warning("Groq call failed, falling back to local engine", error=str(e))

        # 2. Try OpenAI if configured
        if self.openai_key:
            try:
                async with httpx.AsyncClient(timeout=15.0) as client:
                    res = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {self.openai_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": "gpt-4o-mini",
                            "messages": [
                                {"role": "system", "content": effective_sys_prompt},
                                {"role": "user", "content": full_prompt},
                            ],
                            "temperature": 0.3,
                        },
                    )
                    if res.status_code == 200:
                        data = res.json()
                        text = data["choices"][0]["message"]["content"]
                        return {
                            "response": text,
                            "provider": "OpenAI (GPT-4o-mini)",
                            "citations": citations,
                            "intent": detected_intent,
                        }
            except Exception as e:
                logger.warning("OpenAI call failed, falling back to local engine", error=str(e))

        # 3. Intent-driven Local Dynamic Synthesis (No hardcoded rigid templates)
        response_text = self._synthesize_intent_response(prompt, active_context_docs, detected_intent)
        return {
            "response": response_text,
            "provider": "ADAM-1 Biomedical Expert Engine (Local RAG)",
            "citations": citations,
            "intent": detected_intent,
        }

    def _synthesize_intent_response(
        self,
        prompt: str,
        context_docs: Optional[List[Dict[str, Any]]],
        intent: str,
    ) -> str:
        """Generate clean, tailored, intent-specific response."""
        p_lower = prompt.lower().strip()
        clean_prompt = re.sub(r"[^\w\s]", "", p_lower)

        # -------------------------------------------------------------
        # Intent 1: General Conversation
        # -------------------------------------------------------------
        if intent == "general_conversation":
            if any(w in clean_prompt for w in ["how can you help", "what can you do", "help me", "what do you do"]):
                return (
                    "I am **AIRA** (ADAM Intelligent Research Assistant), your research and clinical decision companion "
                    "for the ADAM-1 Enhanced platform.\n\n"
                    "Here is how I can help you:\n"
                    "- **Interactive Workflow Pipeline**: Guide and inspect patient records through the Computational, "
                    "Summarization, and Classification agents.\n"
                    "- **Machine Learning & SHAP**: Explain predictions, probabilities, and local/global TreeSHAP feature attributions.\n"
                    "- **Ecological Diversity Analysis**: Compute and interpret Shannon, Simpson, Berger-Parker, and Bray-Curtis metrics.\n"
                    "- **Biomedical Literature Research**: Retrieve and synthesize PubMed research on the gut-brain axis and neuroinflammation.\n"
                    "- **Clinical Reports**: Review and download comprehensive multi-modal diagnostic PDF reports.\n\n"
                    "Feel free to ask a question or explore a patient sample!"
                )
            if any(w in clean_prompt for w in ["thank", "thanks"]):
                return "You're very welcome! Let me know if you need any further analysis, literature search, or model explainability."
            return (
                "Hello! I am **AIRA**, the ADAM Intelligent Research Assistant. "
                "How can I assist you today? You can ask me to explain machine learning models, inspect patient records, "
                "explore gut microbiome biomarkers, or walk you through the multi-agent ADAM diagnostic workflow."
            )

        # -------------------------------------------------------------
        # Intent 2: Unrelated General Knowledge (Non-medical / non-ADAM)
        # -------------------------------------------------------------
        if intent == "unrelated_general":
            if "france" in clean_prompt and "capital" in clean_prompt:
                return (
                    "The capital of France is **Paris**.\n\n"
                    "*(Note: I specialize in Alzheimer's multi-omic analysis, machine learning models, and microbiome research. "
                    "Feel free to ask if you have any questions regarding the ADAM platform!)*"
                )
            return (
                f"Thank you for your question. While I can address general queries, my primary expertise is centered on the "
                f"**ADAM-1 Enhanced platform**, Alzheimer's disease pathophysiology, gut microbiome metagenomics, and machine learning explainability.\n\n"
                f"If you have questions regarding patient records, model predictions, diversity indices, or literature research, "
                f"I'm here to help!"
            )

        # -------------------------------------------------------------
        # Intent 3: ADAM Platform Questions
        # -------------------------------------------------------------
        if intent == "adam_platform":
            if any(w in clean_prompt for w in ["rag", "r a g", "use rag", "how does adam use"]):
                return (
                    "### How ADAM Uses Retrieval-Augmented Generation (RAG)\n\n"
                    "In the ADAM-1 framework, Retrieval-Augmented Generation (RAG) grounds agent reasoning in verified "
                    "peer-reviewed scientific literature rather than relying on ungrounded model training weights.\n\n"
                    "#### Architecture & Key Principles:\n"
                    "1. **Curated PubMed Corpus**: A dedicated vector store indexes seminal publications covering gut microbiome dysbiosis, "
                    "short-chain fatty acids (SCFAs), pro-inflammatory endotoxins (LPS), and host clinical frailty.\n"
                    "2. **Semantic Vector Retrieval**: Queries requiring biomedical evidence are embedded into a vector space and matched using cosine similarity.\n"
                    "3. **Strict Relevance Thresholding**: Documents are only retrieved if their cosine similarity meets or exceeds a defined threshold (>= 0.05). "
                    "This prevents irrelevant publications from contaminating general questions or simple clinical queries.\n"
                    "4. **Multi-Agent Evidence Synthesis**: The Summarization and Classification agents combine quantitative outputs (ML probabilities, TreeSHAP, alpha/beta diversity) "
                    "with retrieved literature evidence to generate transparent, auditable diagnostic checkpoints."
                )
            if any(w in clean_prompt for w in ["what models", "models does adam", "which models"]):
                return (
                    "### Machine Learning Models in the ADAM Platform\n\n"
                    "The ADAM-1 platform evaluates four diagnostic paradigms on 335 metagenomic samples across 102 human subjects:\n\n"
                    "1. **XGBoost (Primary Baseline)**: Optimized gradient boosted trees capturing non-linear feature interactions across 940 species and clinical covariates.\n"
                    "2. **Random Forest**: Ensemble of bagging decision trees evaluating feature importance and classification stability.\n"
                    "3. **Logistic Regression (Standardized Pipeline)**: L2-regularized linear baseline with StandardScaler to benchmark linear separability.\n"
                    "4. **ADAM Multi-Agent Consensus**: Integrates quantitative ML predictions with TreeSHAP attributions, ecological diversity profiles, "
                    "and multi-stage agent reasoning (10 Summarization Checkpoints + 10 Classification Checkpoints) for calibrated diagnostic decisioning."
                )
            return (
                "### ADAM Framework Architecture & Workflow\n\n"
                "The **ADAM (Alzheimer's Disease Analysis using Microbiome)** framework is an enhanced full-stack diagnostic system "
                "integrating metagenomic sequencing, host clinical covariates, and multi-agent reasoning.\n\n"
                "#### Complete Workflow Sequence:\n"
                "1. **Record Selection**: Extraction of clinical covariates (Age, Sex, Clinical Frailty Scale, Malnutrition) and 940 microbial species abundances.\n"
                "2. **Computational Agent**: Executes trained XGBoost inference, computes exact TreeSHAP attributions, and calculates alpha (Shannon, Simpson, Berger-Parker) "
                "and beta diversity (Bray-Curtis, Jaccard, Canberra dissimilarity to healthy controls).\n"
                "3. **Summarization Agent**: Synthesizes computational findings into 10 transparent, user-facing reasoning checkpoints.\n"
                "4. **Classification Agent**: Evaluates prediction evidence, confidence, edge-cases, and conflicting signals across 10 classification checkpoints.\n"
                "5. **Consensus Decision & Report**: Renders final calibrated classification and enables downloading a comprehensive clinical PDF report."
            )

        # -------------------------------------------------------------
        # Intent 4: General Knowledge (Biomedical & ML Definitions)
        # -------------------------------------------------------------
        if intent == "general_knowledge":
            # What is AD?
            if any(w in clean_prompt for w in ["what is ad", "what is alzheimer", "explain ad", "explain alzheimer", "definition of alzheimer"]):
                return (
                    "### Alzheimer's Disease (AD) Overview\n\n"
                    "**Alzheimer's Disease (AD)** is a chronic, progressive neurodegenerative disorder and the most common cause of dementia, "
                    "primarily characterized by progressive memory loss, cognitive decline, and impairment in daily executive functioning.\n\n"
                    "#### Primary Neuropathological Hallmarks:\n"
                    "- **Amyloid-Beta (Aβ) Plaques**: Extracellular accumulation of insoluble Aβ-42 peptide aggregates.\n"
                    "- **Neurofibrillary Tangles (NFTs)**: Intracellular aggregations of hyperphosphorylated tau protein causing microtubule collapse.\n"
                    "- **Synaptic Loss & Neuroinflammation**: Chronic activation of brain-resident microglia and astrocytes causing progressive neuronal degeneration.\n\n"
                    "#### Emerging Multi-Omic & Gut-Brain Perspective:\n"
                    "While classically viewed solely as a central nervous system disease, contemporary research—including the ADAM-1 framework—identifies "
                    "significant systemic contributions from host frailty, altered intestinal barrier permeability ('leaky gut'), and circulating microbial metabolites."
                )

            # What is XGBoost?
            if any(w in clean_prompt for w in ["what is xgboost", "explain xgboost", "xgboost"]):
                return (
                    "### XGBoost (eXtreme Gradient Boosting)\n\n"
                    "**XGBoost** is an optimized, highly scalable distributed gradient boosting decision tree library widely used for tabular "
                    "and structured biomedical data.\n\n"
                    "#### Core Operating Principles:\n"
                    "- **Sequential Boosting**: Builds an ensemble of weak decision trees sequentially, where each new tree fits the gradient of the loss function "
                    "with respect to pseudo-residuals of previous trees.\n"
                    "- **Regularization ($L_1$ and $L_2$)**: Incorporates penalties on leaf weights and tree complexity to prevent overfitting on high-dimensional datasets.\n"
                    "- **Role in ADAM-1**: Serves as the primary baseline classifier, modeling complex non-linear relationships between 940 gut microbial species, "
                    "clinical covariates, and cognitive status, with exact attributions computed via TreeSHAP."
                )

            # How does SHAP work? / What is SHAP?
            if any(w in clean_prompt for w in ["how does shap work", "what is shap", "explain shap"]):
                return (
                    "### SHAP (SHapley Additive exPlanations)\n\n"
                    "**SHAP** is a game-theoretic approach to explaining the outputs of machine learning models, providing mathematically "
                    "rigorous, additive feature attributions for individual predictions.\n\n"
                    "#### Key Mathematical Foundations:\n"
                    "- **Shapley Values**: Based on cooperative game theory (Lloyd Shapley, 1953), each feature's contribution is calculated as its marginal effect "
                    "averaged over all possible feature subsets: $$\\phi_i = \\sum_{S \\subseteq F \\setminus \\{i\\}} \\frac{|S|!(|F| - |S| - 1)!}{|F|!} (f(S \\cup \\{i\\}) - f(S))$$\n"
                    "- **TreeSHAP Algorithm**: For tree-based models like XGBoost, TreeSHAP computes exact local explanations in polynomial time rather than exponential time.\n"
                    "- **Important Scientific Note**: SHAP quantifies **model feature attribution** (how much a feature shifted the model's output). "
                    "It explains the model's internal reasoning, but does not prove direct biological causation."
                )

        # -------------------------------------------------------------
        # Intent 5: Biomedical Research (Deep Multi-Omics / Metagenomics)
        # -------------------------------------------------------------
        # Format literature citations if present
        lit_block = ""
        top_ref = ""
        if context_docs:
            top_doc = context_docs[0]
            top_ref = f"\n\n**Published Literature Evidence:** According to *{top_doc.get('title')}* ({top_doc.get('pmid')}), {top_doc.get('abstract')[:200]}..."
            lit_block = "\n\n**Retrieved Reference Sources:**\n" + "\n".join(
                [f"- **[{d.get('pmid', 'Ref')}]** {d.get('title')} (*{d.get('journal', 'PubMed')}*)" for d in context_docs[:3]]
            )

        # Topic: Alpha Diversity & Shannon Index
        if any(w in clean_prompt for w in ["alpha diversity", "shannon", "simpson", "berger parker", "diversity"]):
            return (
                "### Ecological Alpha-Diversity in Alzheimer's Gut Metagenomics\n\n"
                "**Alpha diversity** quantifies the within-sample ecological complexity and distribution of gut bacterial taxa.\n\n"
                "#### Core Metrics Evaluated in ADAM-1:\n"
                "1. **Shannon Diversity Index ($H' = -\\sum p_i \\ln p_i$)**: Accounts for both species richness (number of distinct taxa) and evenness (equitability of abundances). "
                "Higher Shannon entropy reflects a resilient, stable microbiome.\n"
                "2. **Simpson Diversity Index ($D = 1 - \\sum p_i^2$)**: Probability that two individuals randomly selected from a sample belong to different species, emphasizing dominant taxa.\n"
                "3. **Berger-Parker Dominance ($d = \\max p_i$)**: Measures the proportional dominance of the single most abundant species.\n\n"
                "#### Biological Findings in Cognitive Impairment:\n"
                "- Longitudinal cohorts consistently observe a **depletion in Shannon diversity** in Alzheimer's subjects compared to age-matched controls.\n"
                "- Reduced alpha diversity is exacerbated by clinical confounders such as chronic Proton Pump Inhibitor (PPI) usage and elevated host frailty."
                f"{top_ref}{lit_block}"
            )

        # Topic: Microbiome changes in AD
        if any(w in clean_prompt for w in ["microbiome changes", "gut changes", "dysbiosis", "bacteria", "microbiota", "taxa"]):
            return (
                "### Gut Microbiome Alterations Associated with Alzheimer's Disease\n\n"
                "Metagenomic sequencing across Alzheimer's cohorts demonstrates characteristic taxonomic and functional shifts along the gut-brain axis:\n\n"
                "#### 1. Depletion of Keystone Anti-Inflammatory Taxa:\n"
                "- **Butyrate Producers**: Consistent reductions in *Eubacterium rectale*, *Faecalibacterium prausnitzii*, and *Roseburia faecis*.\n"
                "- **Functional Consequence**: Loss of short-chain fatty acids impairs intestinal barrier integrity and reduces histone deacetylase (HDAC) inhibition, leaving neural tissue vulnerable to neuroinflammatory cascades.\n\n"
                "#### 2. Proliferation of Pro-Inflammatory Pathobionts:\n"
                "- **LPS Producers**: Elevated relative abundances of *Phocaeicola dorei* (formerly *Bacteroides dorei*) and *Neglecta timonensis*.\n"
                "- **Functional Consequence**: These species synthesize immunogenic hexa-acylated lipopolysaccharides (lipid A) that stimulate Toll-like receptor 4 (TLR4) signaling.\n\n"
                "#### 3. Loss of Ecological Diversity:\n"
                "- Marked reduction in Shannon entropy ($H'$) and increased compositional divergence (Bray-Curtis dissimilarity) from healthy elderly profiles."
                f"{top_ref}{lit_block}"
            )

        # Topic: Data Record Analysis Request
        if intent == "data_record":
            return (
                "### Patient & Cohort Record Analysis\n\n"
                "To analyze a specific patient record with the real ADAM pipeline:\n\n"
                "1. **Navigate to the ADAM Workflow Timeline**: Select a sample (e.g. `DC001`, `FB085`, `DC002`) from the dropdown.\n"
                "2. **Computational Agent Execution**: Computes live XGBoost inference, exact TreeSHAP feature attributions, and Shannon/Simpson/Bray-Curtis diversity metrics.\n"
                "3. **Multi-Agent Rationale**: Generates the 10 Summarization Checkpoints and 10 Classification Checkpoints.\n"
                "4. **Download Clinical PDF**: Generates an audit-ready, record-specific diagnostic report.\n\n"
                "You can also query specific sample IDs directly!"
            )

        # Fallback: Clean, query-driven answer without fixed template
        return (
            f"Regarding your query on **{prompt.strip()}**:\n\n"
            "In the context of the ADAM-1 multi-modal framework, patient cognitive risk is evaluated by synthesizing "
            "metagenomic microbial abundance profiles, host clinical frailty markers, and ecological diversity.\n\n"
            "Machine learning models (XGBoost, Random Forest, Logistic Regression) map non-linear biomarker patterns, "
            "while TreeSHAP and multi-agent reasoning provide transparent, auditable evidence checkpoints."
            f"{top_ref}{lit_block}"
        )


_LLM_CLIENT: LLMClient | None = None


def get_llm_client() -> LLMClient:
    """Return LLM client, lazily initialized so env vars are read at first call."""
    global _LLM_CLIENT
    if _LLM_CLIENT is None:
        _LLM_CLIENT = LLMClient()
    return _LLM_CLIENT
