class InboundFirewall:
    """
    Validates inbound data from external sources.
    Anti-hallucination: verifies that returned data matches expected structure.
    """

    def verify(self, data: any, expected_type: str = "any") -> dict:
        result = {
            "passed": True,
            "warnings": [],
            "verified_data": data,
        }

        if data is None:
            return {"passed": False, "warnings": ["null data"], "verified_data": None}

        if expected_type == "cve_list":
            result = self._verify_cve_list(data)
        elif expected_type == "finding_list":
            result = self._verify_finding_list(data)
        elif expected_type == "exploit_proof":
            result = self._verify_exploit_proof(data)

        return result

    def _verify_cve_list(self, data: list) -> dict:
        warnings = []
        verified = []

        for item in data if isinstance(data, list) else []:
            if not isinstance(item, dict):
                warnings.append("non-dict item in CVE list")
                continue
            if not item.get("cve"):
                warnings.append("item missing CVE identifier")
                continue
            if not item.get("title"):
                warnings.append(f"CVE {item.get('cve')} missing title")
                continue
            verified.append(item)

        if len(verified) < len(data):
            warnings.append(f"removed {len(data) - len(verified)} malformed entries")

        return {"passed": len(warnings) == 0, "warnings": warnings, "verified_data": verified}

    def _verify_finding_list(self, data: list) -> dict:
        warnings = []
        verified = []

        for item in data if isinstance(data, list) else []:
            if not isinstance(item, dict):
                warnings.append("non-dict item in finding list")
                continue
            if not item.get("title") or not item.get("severity"):
                warnings.append("finding missing title or severity")
                continue
            if item.get("severity") not in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
                warnings.append(f"invalid severity: {item.get('severity')}")
                continue
            verified.append(item)

        return {"passed": len(warnings) == 0, "warnings": warnings, "verified_data": verified}

    def _verify_exploit_proof(self, data: dict) -> dict:
        warnings = []
        if not isinstance(data, dict):
            return {"passed": False, "warnings": ["not a dict"], "verified_data": None}

        if "poc_code" in data and len(data["poc_code"]) < 50:
            warnings.append("PoC code suspiciously short")
        if data.get("confirmed") and not data.get("forge_output"):
            warnings.append("confirmed exploit missing forge output")

        return {"passed": len(warnings) == 0, "warnings": warnings, "verified_data": data}
