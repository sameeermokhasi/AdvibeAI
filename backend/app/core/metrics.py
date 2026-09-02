"""
Advibe In-Memory Production Health Metrics Tracker
--------------------------------------------------
Maintains live counters and latency telemetry exposed at GET /metrics.
"""

import time
import threading
from typing import Dict, Any


class MetricsTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.requests_total: int = 0
        self.errors_total: int = 0
        self.llm_calls_total: int = 0
        self.llm_failures_total: int = 0
        self.total_latency_ms: float = 0.0
        self.start_time: float = time.time()

    def record_request(self, status_code: int, duration_ms: float):
        with self._lock:
            self.requests_total += 1
            self.total_latency_ms += duration_ms
            if status_code >= 400:
                self.errors_total += 1

    def record_llm_call(self, success: bool, duration_ms: float = 0.0):
        with self._lock:
            self.llm_calls_total += 1
            if not success:
                self.llm_failures_total += 1

    def get_metrics(self) -> Dict[str, Any]:
        with self._lock:
            avg_latency = round(self.total_latency_ms / max(self.requests_total, 1), 2)
            uptime = round(time.time() - self.start_time, 1)
            error_rate = round((self.errors_total / max(self.requests_total, 1)) * 100, 2)

            return {
                "requests_total": self.requests_total,
                "errors_total": self.errors_total,
                "error_rate_pct": error_rate,
                "llm_calls_total": self.llm_calls_total,
                "llm_failures_total": self.llm_failures_total,
                "avg_latency_ms": avg_latency,
                "uptime_seconds": uptime
            }

    def reset(self):
        """For test isolation."""
        with self._lock:
            self.requests_total = 0
            self.errors_total = 0
            self.llm_calls_total = 0
            self.llm_failures_total = 0
            self.total_latency_ms = 0.0
            self.start_time = time.time()


# Global singleton instance
metrics = MetricsTracker()
