from pydantic import BaseModel, Field
from typing import List, Optional

class SimulationRequest(BaseModel):
    clicks_count: int = Field(..., ge=0)
    unknown_domain: bool
    unusual_time: bool
    ip_change: bool

class SimulationResponse(BaseModel):
    risk_score: float
    status: str
    anomalies: List[str]

class ScanRequest(BaseModel):
    ip: str = Field(..., description="Target IP address (private ranges only)")

class ServiceInfo(BaseModel):
    port: int
    service: str
    version: str

class ScanResponse(BaseModel):
    ip: str
    status: str
    host_status: str
    scan_method: str
    open_ports: List[int]
    services: List[ServiceInfo]
    risk_score: float
    risk_level: str
    anomalies: List[str]
    high_risk_ports: List[int]
    medium_risk_ports: List[int]
    safe_ports: List[int]
    timestamp: str
