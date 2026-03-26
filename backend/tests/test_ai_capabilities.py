import pytest
from pydantic import ValidationError

from app.schemas.ai_capabilities import AICapabilitiesUpdate


class TestAICapabilitiesSchema:
    def test_default_tier_is_one(self):
        update = AICapabilitiesUpdate()
        assert update.tier is None  # no default set in update schema

    def test_tier_1_is_valid(self):
        update = AICapabilitiesUpdate(tier=1)
        assert update.tier == 1

    def test_tier_2_is_valid(self):
        update = AICapabilitiesUpdate(tier=2)
        assert update.tier == 2

    def test_tier_3_is_valid(self):
        update = AICapabilitiesUpdate(tier=3)
        assert update.tier == 3

    def test_tier_5_raises_value_error(self):
        with pytest.raises(ValidationError):
            AICapabilitiesUpdate(tier=5)

    def test_tier_0_raises_value_error(self):
        with pytest.raises(ValidationError):
            AICapabilitiesUpdate(tier=0)

    def test_all_fields_optional(self):
        update = AICapabilitiesUpdate()
        assert update.tier is None
        assert update.can_book_appointments is None
        assert update.can_handle_complaints is None
