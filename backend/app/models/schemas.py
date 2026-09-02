from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, HttpUrl, ConfigDict, model_validator

class CampaignStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"

class MessageChannel(str, Enum):
    EMAIL = "email"
    LINKEDIN = "linkedin"

class MessageStatus(str, Enum):
    DRAFT = "draft"
    APPROVED = "approved"
    SENT = "sent"
    FAILED = "failed"

class OutcomeType(str, Enum):
    NO_REPLY = "no_reply"
    REPLIED = "replied"
    INTERESTED = "interested"
    NOT_INTERESTED = "not_interested"
    MEETING_REQUESTED = "meeting_requested"
    WRONG_PERSON = "wrong_person"

class IntakeProfile(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    company_name: str = Field(..., alias="name", examples=["FinFlow AI"])
    website_url: Optional[str] = Field(None, examples=["https://finflow.ai"])
    stage: str = Field(..., examples=["Seed"])
    sector: str = Field(..., examples=["Fintech / B2B SaaS"])
    geography: str = Field(..., examples=["US + India"])
    check_size_min: float = Field(..., examples=[500000.0])
    check_size_max: float = Field(..., examples=[2000000.0])
    thesis_summary: str = Field(
        ...,
        examples=["AI-powered treasury automation for mid-market CFOs, solving multi-entity cash reconciliation in real-time."]
    )

    @model_validator(mode="before")
    @classmethod
    def resolve_name_and_company_name(cls, data: Any) -> Any:
        if isinstance(data, dict):
            c_name = data.get("company_name") or data.get("name")
            if c_name:
                data["company_name"] = str(c_name)
                data["name"] = str(c_name)
        return data

    @property
    def name(self) -> str:
        return self.company_name

# Backward compatibility alias
RaiseProfile = IntakeProfile

class LLMScoreResult(BaseModel):
    llm_score: Optional[float] = Field(None, ge=0.0, le=1.0, description="Conviction score between 0.0 and 1.0")
    rationale: str = Field(..., description="2-3 sentence qualitative investment thesis rationale")

class DraftEmail(BaseModel):
    subject: str = Field(..., description="Outreach email subject line")
    body: str = Field(..., description="Personalized email body text")

class IntakeRequest(BaseModel):
    name: Optional[str] = Field(None, examples=["FinFlow AI"])
    website_url: Optional[str] = Field(None, examples=["https://finflow.ai"])
    raw_text: Optional[str] = Field(
        None,
        description="Extracted text from pitch deck or website overview",
        examples=["FinFlow AI is raising a $1.5M Seed round to build real-time automated treasury workflows for fast-growing B2B companies."]
    )
    deck_file_url: Optional[str] = Field(None, examples=["https://storage.supabase.co/decks/finflow_deck.pdf"])

class CompanyOut(BaseModel):
    id: str
    user_id: str
    name: str
    website_url: Optional[str] = None
    deck_file_url: Optional[str] = None
    stage: Optional[str] = None
    sector: Optional[str] = None
    geography: Optional[str] = None
    check_size_min: Optional[float] = None
    check_size_max: Optional[float] = None
    thesis_summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class PersonOut(BaseModel):
    id: str
    investor_id: str
    full_name: str
    role_title: Optional[str] = None
    email: Optional[str] = None
    linkedin_url: Optional[str] = None
    is_decision_maker: bool = False
    verified: bool = False

class InvestorOut(BaseModel):
    id: str
    firm_name: str
    fund_type: Optional[str] = None
    aum: Optional[float] = None
    stage_focus: List[str] = []
    sector_focus: List[str] = []
    geography_focus: List[str] = []
    typical_check_min: Optional[float] = None
    typical_check_max: Optional[float] = None
    website_url: Optional[str] = None
    source: Optional[str] = None
    people: List[PersonOut] = []

class InvestorMatch(BaseModel):
    investor_id: str
    firm_name: str
    fit_score: float = Field(..., ge=0, le=100, examples=[94.0])
    rule_based_score: float = Field(..., ge=0, le=100, examples=[92.0])
    llm_adjusted_score: float = Field(..., ge=0, le=100, examples=[95.0])
    rationale: str = Field(
        ...,
        examples=["Strong alignment on B2B Fintech Seed stage with active deployment history in India/US corridor."]
    )
    fund_type: Optional[str] = None
    stage_focus: List[str] = []
    sector_focus: List[str] = []
    geography_focus: List[str] = []
    typical_check_min: Optional[float] = None
    typical_check_max: Optional[float] = None
    website_url: Optional[str] = None
    decision_makers: List[PersonOut] = []

class MatchResponse(BaseModel):
    company_id: str
    total_candidates_analyzed: int
    matches_count: int
    matches: List[InvestorMatch]

class DraftRequest(BaseModel):
    company_id: str = Field(..., examples=["c1111111-0000-0000-0000-000000000001"])
    person_ids: List[str] = Field(..., examples=[["b0000001-0000-0000-0000-000000000001"]])
    campaign_name: Optional[str] = Field(None, examples=["Q3 Seed Raise - Tier 1 VCs"])
    channel: MessageChannel = MessageChannel.EMAIL

class MessageDraft(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    message_id: str
    campaign_id: str
    person_id: str
    investor_id: str
    recipient_name: str
    recipient_role: Optional[str] = None
    recipient_email: Optional[str] = None
    firm_name: str
    channel: MessageChannel
    subject: str
    body: str
    status: MessageStatus

    @model_validator(mode="before")
    @classmethod
    def resolve_message_id(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "message_id" not in data and "id" in data:
                data["message_id"] = str(data["id"])
            elif "message_id" in data:
                data["message_id"] = str(data["message_id"])
        return data

class DraftResponse(BaseModel):
    campaign_id: str
    campaign_name: str
    drafts_count: int
    drafts: List[MessageDraft]

class SendBatchRequest(BaseModel):
    campaign_id: str = Field(..., examples=["cmp-0001"])
    message_ids: List[str] = Field(..., description="IDs of messages with status=approved")

class SentMessageResult(BaseModel):
    message_id: str
    recipient_email: str
    status: str
    sent_at: Optional[datetime] = None
    error: Optional[str] = None

class SendBatchResponse(BaseModel):
    campaign_id: str
    sent_count: int
    failed_count: int
    results: List[SentMessageResult]

class WebhookReplyPayload(BaseModel):
    from_email: str = Field(..., examples=["roelof@sequoiacap.com"])
    subject: str = Field(..., examples=["Re: FinFlow AI - Seed raise overview"])
    text: str = Field(..., examples=["Thanks for reaching out. We find your thesis very interesting. Are you free for a call this Thursday at 2pm PST?"])
    message_id_header: Optional[str] = Field(None, description="Resend/In-Reply-To Message-ID")

class OutcomeOut(BaseModel):
    id: str
    message_id: str
    outcome_type: OutcomeType
    reply_text: Optional[str]
    classified_by_llm: bool
    created_at: datetime

class MessageWithOutcome(BaseModel):
    id: str
    recipient_name: str
    recipient_email: Optional[str]
    firm_name: str
    channel: MessageChannel
    subject: Optional[str]
    body: str
    status: MessageStatus
    sent_at: Optional[datetime]
    outcome: Optional[OutcomeOut] = None

class CampaignStatusOut(BaseModel):
    id: str
    company_id: str
    name: str
    status: CampaignStatus
    total_messages: int
    sent_messages: int
    interested_count: int
    meetings_requested_count: int
    messages: List[MessageWithOutcome]
    created_at: datetime
    updated_at: datetime

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
